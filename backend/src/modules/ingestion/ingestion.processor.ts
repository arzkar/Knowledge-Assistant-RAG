import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Document, DocumentStatus } from '../database/entities/document.entity';
import { Chunk } from '../database/entities/chunk.entity';
import { DoclingService } from '../parser/docling.service';
import { LlmService } from '../ai/llm.service';
import { EmbeddingsService } from '../ai/embeddings.service';
import { ChunkingService } from '../chunking/chunking.service';
import { QdrantService } from '../vector/qdrant.service';
import { OpenSearchService } from '../search/opensearch.service';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Chunk)
    private readonly chunkRepository: Repository<Chunk>,
    private readonly doclingService: DoclingService,
    private readonly llmService: LlmService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chunkingService: ChunkingService,
    private readonly qdrantService: QdrantService,
    private readonly opensearchService: OpenSearchService,
  ) {
    super();
  }

  async process(job: Job<{ documentId: string }>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Processing document: ${documentId}`);

    const document = await this.documentRepository.findOne({ 
      where: { id: documentId },
      relations: ['chunks']
    });

    if (!document) {
      this.logger.error(`Document ${documentId} not found`);
      return;
    }

    try {
      await this.runPipeline(document);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Pipeline failed for document ${documentId}: ${errorMessage}`);
      
      await this.documentRepository.update(documentId, {
        status: DocumentStatus.FAILED,
        error: errorMessage,
      });
      
      throw error;
    }
  }

  private async runPipeline(document: Document): Promise<void> {
    this.logger.log(`Document ${document.id} status: ${document.status}`);

    // Stage 1: FETCH
    if (this.shouldRun(document.status, DocumentStatus.UPLOADED)) {
      if (!fs.existsSync(document.filePath)) {
        throw new Error(`File not found at path: ${document.filePath}`);
      }
      await this.updateStatus(document.id, DocumentStatus.FETCHED);
      document.status = DocumentStatus.FETCHED;
    }

    // Stage 2: PARSE
    if (this.shouldRun(document.status, DocumentStatus.FETCHED)) {
      const blocks = await this.doclingService.parse(document.filePath);
      await this.documentRepository.update(document.id, {
        metadata: { ...document.metadata, blocks }
      });
      await this.updateStatus(document.id, DocumentStatus.PARSED);
      document.status = DocumentStatus.PARSED;
    }

    // Stage 3: METADATA
    if (this.shouldRun(document.status, DocumentStatus.PARSED)) {
      const blocks = (document.metadata as any).blocks;
      const sampleText = blocks.slice(0, 10).map((b: any) => b.text).join('\n');
      const prompt = `Extract metadata (title, summary, keywords) from this text: \n\n ${sampleText}`;
      const systemPrompt = `Return JSON only: { "title": "...", "summary": "...", "keywords": ["..."] }`;
      
      const metadataStr = await this.llmService.generate(prompt, systemPrompt);
      const extractedMetadata = JSON.parse(metadataStr);
      
      await this.documentRepository.update(document.id, {
        metadata: { ...document.metadata, ...extractedMetadata }
      });
      await this.updateStatus(document.id, DocumentStatus.METADATA_DONE);
      document.status = DocumentStatus.METADATA_DONE;
    }

    // Stage 4: CHUNK
    if (this.shouldRun(document.status, DocumentStatus.METADATA_DONE)) {
      const blocks = (document.metadata as any).blocks;
      const chunkResults = await this.chunkingService.createChunks(blocks);
      
      const chunkEntities = chunkResults.map(res => this.chunkRepository.create({
        documentId: document.id,
        chunkIndex: res.chunkIndex,
        text: res.text,
        contextText: res.text, // Initial context is just the text
        metadata: res.metadata,
      }));
      
      await this.chunkRepository.save(chunkEntities);
      await this.updateStatus(document.id, DocumentStatus.CHUNKED);
      document.status = DocumentStatus.CHUNKED;
      document.chunks = chunkEntities;
    }

    // Stage 5: CONTEXTUALIZE
    if (this.shouldRun(document.status, DocumentStatus.CHUNKED)) {
      const metadata = document.metadata as any;
      const docTitle = metadata.title || document.originalName;
      
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      
      for (const chunk of chunks) {
        const section = chunk.metadata?.section || 'General';
        const contextText = `Document: ${docTitle} | Section: ${section} | Content: ${chunk.text}`;
        await this.chunkRepository.update(chunk.id, { contextText });
      }
      
      await this.updateStatus(document.id, DocumentStatus.CONTEXTUALIZED);
      document.status = DocumentStatus.CONTEXTUALIZED;
    }

    // Stage 6: EMBED
    if (this.shouldRun(document.status, DocumentStatus.CONTEXTUALIZED)) {
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      const texts = chunks.map(c => c.contextText);
      const embeddings = await this.embeddingsService.embedBatch(texts);
      
      await this.documentRepository.update(document.id, {
        metadata: { ...document.metadata, embeddings }
      });
      await this.updateStatus(document.id, DocumentStatus.EMBEDDED);
      document.status = DocumentStatus.EMBEDDED;
    }

    // Stage 7: BM25_INDEX
    if (this.shouldRun(document.status, DocumentStatus.EMBEDDED)) {
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      for (const chunk of chunks) {
        await this.opensearchService.indexChunk({
          text: chunk.text,
          documentId: document.id,
          chunkId: chunk.id,
          metadata: chunk.metadata,
        });
      }
      await this.updateStatus(document.id, DocumentStatus.BM25_INDEXED);
      document.status = DocumentStatus.BM25_INDEXED;
    }

    // Stage 8: VECTOR_INDEX
    if (this.shouldRun(document.status, DocumentStatus.BM25_INDEXED)) {
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      const embeddings = (document.metadata as any).embeddings;
      
      const points = chunks.map((chunk, idx) => ({
        id: chunk.id,
        vector: embeddings[idx],
        payload: {
          chunkId: chunk.id,
          documentId: document.id,
          text: chunk.text,
          metadata: chunk.metadata,
        }
      }));
      
      await this.qdrantService.upsert(points);
      await this.updateStatus(document.id, DocumentStatus.VECTOR_INDEXED);
      document.status = DocumentStatus.VECTOR_INDEXED;
    }

    // Stage 9: FINALIZE
    await this.updateStatus(document.id, DocumentStatus.READY);
    this.logger.log(`Ingestion complete for document: ${document.id}`);
  }

  private shouldRun(currentStatus: DocumentStatus, stageStatus: DocumentStatus): boolean {
    const statuses = Object.values(DocumentStatus);
    const currentIndex = statuses.indexOf(currentStatus);
    const stageIndex = statuses.indexOf(stageStatus);
    return currentIndex <= stageIndex;
  }

  private async updateStatus(id: string, status: DocumentStatus) {
    this.logger.log(`Updating document ${id} status to ${status}`);
    await this.documentRepository.update(id, { status });
  }
}
