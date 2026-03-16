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
      
      const metadata = {
        ...((document.metadata as object) || {}),
        resumeStatus: document.status,
      } as any;

      await this.documentRepository.update(documentId, {
        status: DocumentStatus.FAILED,
        error: errorMessage,
        metadata,
      });
      
      throw error;
    }
  }

  private async runPipeline(document: Document): Promise<void> {
    this.logger.log(`Document ${document.id} status: ${document.status}`);

    const checkCancel = async () => {
      const doc = await this.documentRepository.findOne({ where: { id: document.id } });
      if (doc?.status === DocumentStatus.FAILED && doc?.error === 'Ingestion cancelled by user') {
        throw new Error('Ingestion cancelled by user');
      }
    };

    // Stage 1: SCANNING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.UPLOADED)) {
      if (!fs.existsSync(document.filePath)) {
        throw new Error(`File not found at path: ${document.filePath}`);
      }
      await this.updateStatus(document.id, DocumentStatus.SCANNING);
      document.status = DocumentStatus.SCANNING;
    }

    // Stage 2: EXTRACTING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.SCANNING)) {
      const extracted = await this.doclingService.parse(document.filePath);
      
      if (!extracted || extracted.length === 0) {
        throw new Error('No content could be extracted from the document');
      }

      // Update document metadata with parsed blocks
      document.metadata = {
        ...((document.metadata as object) || {}),
        blocks: extracted,
      };
      await this.documentRepository.update(document.id, {
        metadata: document.metadata
      });
      await this.updateStatus(document.id, DocumentStatus.EXTRACTING);
      document.status = DocumentStatus.EXTRACTING;
    }

    // Stage 3: ANALYZING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.EXTRACTING)) {
      const blocks = (document.metadata as any).blocks;
      const sampleText = (blocks || []).slice(0, 10).map((b: any) => b.text).join('\n');
      const prompt = `Extract metadata (title, summary, keywords) from this text: \n\n ${sampleText}`;
      const systemPrompt = `Return JSON only: { "title": "...", "summary": "...", "keywords": ["..."] }`;
      
      const metadataStr = await this.llmService.generate(prompt, systemPrompt, { json: true });
      const extractedMetadata = this.extractJson(metadataStr);
      
      document.metadata = { ...document.metadata, ...extractedMetadata };
      await this.documentRepository.update(document.id, {
        metadata: document.metadata
      });
      await this.updateStatus(document.id, DocumentStatus.ANALYZING);
      document.status = DocumentStatus.ANALYZING;
    }

    // Stage 4: PROCESSING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.ANALYZING)) {
      const blocks = (document.metadata as any).blocks;
      const metadata = document.metadata as any;
      const documentSummary = metadata.summary || '';
      
      const chunkResults = await this.chunkingService.createChunks(
        blocks || [],
        documentSummary,
      );
      
      const docTitle = metadata.title || document.originalName;

      const chunkEntities = chunkResults.map(res => {
        const section = res.metadata?.section || 'General';
        const prefix = res.metadata?.contextualPrefix ? `${res.metadata.contextualPrefix} ` : '';
        const contextText = `Document: ${docTitle} | Section: ${section} | Context: ${prefix}Content: ${res.text}`;
        
        return this.chunkRepository.create({
          documentId: document.id,
          chunkIndex: res.chunkIndex,
          text: res.text,
          contextText: contextText,
          metadata: res.metadata,
        });
      });
      
      await this.chunkRepository.save(chunkEntities);
      await this.updateStatus(document.id, DocumentStatus.PROCESSING);
      document.status = DocumentStatus.PROCESSING;
      document.chunks = chunkEntities;
    }

    // Stage 5: ENRICHING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.PROCESSING)) {
      // Chunks already have contextText from Stage 4
      await this.updateStatus(document.id, DocumentStatus.ENRICHING);
      document.status = DocumentStatus.ENRICHING;
    }

    // Stage 6: EMBEDDING
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.ENRICHING)) {
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      const texts = chunks.map(c => c.contextText);
      const embeddings = await this.embeddingsService.embedBatch(texts);
      
      document.metadata = { ...document.metadata, embeddings };
      await this.documentRepository.update(document.id, {
        metadata: document.metadata
      });
      await this.updateStatus(document.id, DocumentStatus.EMBEDDING);
      document.status = DocumentStatus.EMBEDDING;
    }

    // Stage 7: INDEXING_KEYWORDS
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.EMBEDDING)) {
      const chunks = await this.chunkRepository.find({ where: { documentId: document.id } });
      const bulkChunks = chunks.map(chunk => ({
        text: chunk.text,
        documentId: document.id,
        chunkId: chunk.id,
        metadata: chunk.metadata,
      }));
      
      await this.opensearchService.bulkIndex(bulkChunks);
      await this.updateStatus(document.id, DocumentStatus.INDEXING_KEYWORDS);
      document.status = DocumentStatus.INDEXING_KEYWORDS;
    }

    // Stage 8: INDEXING_CONCEPTS
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.INDEXING_KEYWORDS)) {
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
      await this.updateStatus(document.id, DocumentStatus.INDEXING_CONCEPTS);
      document.status = DocumentStatus.INDEXING_CONCEPTS;
    }

    // Stage 9: FINALIZE
    await checkCancel();
    if (this.shouldRun(document.status, DocumentStatus.INDEXING_CONCEPTS)) {
      await this.updateStatus(document.id, DocumentStatus.READY);
      document.status = DocumentStatus.READY;
      this.logger.log(`Ingestion complete for document: ${document.id}`);
    }
  }

  private extractJson(text: string): any {
    try {
      // First try direct parse
      return JSON.parse(text);
    } catch (e) {
      // Try to find JSON block
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerE) {
          this.logger.error(`Failed to parse extracted JSON block: ${jsonMatch[0]}`);
          throw innerE;
        }
      }
      this.logger.error(`No JSON block found in text: ${text}`);
      throw new Error('Failed to extract JSON from LLM response');
    }
  }

  private shouldRun(currentStatus: DocumentStatus, stageStatus: DocumentStatus): boolean {
    if (currentStatus === DocumentStatus.FAILED) return false;
    if (currentStatus === DocumentStatus.READY) return false;
    
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
