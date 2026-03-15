import { Injectable, Logger } from '@nestjs/common';
import { DocBlock } from '../parser/docling.service';
import { LlmService } from '../ai/llm.service';

export interface ChunkResult {
  text: string;
  chunkIndex: number;
  metadata: {
    page: number;
    section?: string;
    contextualPrefix?: string;
  };
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly targetChunkSize = 800;
  private readonly minChunkSize = 400;

  constructor(private readonly llmService: LlmService) {}

  async createChunks(
    blocks: DocBlock[],
    documentSummary?: string,
  ): Promise<ChunkResult[]> {
    this.logger.log(`Chunking ${blocks.length} blocks...`);

    const rawChunks: { text: string; page: number; section: string }[] = [];
    let currentChunkText = '';
    let currentChunkPage = blocks[0]?.page || 1;
    let currentChunkSection = blocks[0]?.section || '';

    for (const block of blocks) {
      if (
        currentChunkText.length + block.text.length > this.targetChunkSize &&
        currentChunkText.length >= this.minChunkSize
      ) {
        rawChunks.push({
          text: currentChunkText.trim(),
          page: currentChunkPage,
          section: currentChunkSection,
        });
        currentChunkText = '';
      }

      if (block.heading && currentChunkText.length > 0) {
        if (currentChunkText.length >= this.minChunkSize) {
          rawChunks.push({
            text: currentChunkText.trim(),
            page: currentChunkPage,
            section: currentChunkSection,
          });
          currentChunkText = '';
        }
      }

      if (currentChunkText.length === 0) {
        currentChunkPage = block.page;
        currentChunkSection = block.section || '';
      }

      currentChunkText += (currentChunkText ? '\n' : '') + block.text;
    }

    if (currentChunkText.trim().length > 0) {
      rawChunks.push({
        text: currentChunkText.trim(),
        page: currentChunkPage,
        section: currentChunkSection,
      });
    }

    const chunks: ChunkResult[] = [];
    this.logger.log(`Enriching ${rawChunks.length} chunks with context...`);

    for (let i = 0; i < rawChunks.length; i++) {
      const raw = rawChunks[i];
      let contextualPrefix = '';

      if (documentSummary) {
        contextualPrefix = await this.generateSituationalContext(
          raw.text,
          documentSummary,
        );
      }

      chunks.push({
        text: raw.text,
        chunkIndex: i,
        metadata: {
          page: raw.page,
          section: raw.section,
          contextualPrefix,
        },
      });
    }

    this.logger.log(`Created ${chunks.length} contextualized chunks`);
    return chunks;
  }

  private async generateSituationalContext(
    chunkText: string,
    documentSummary: string,
  ): Promise<string> {
    const prompt = `
<document_summary>
${documentSummary}
</document_summary>

<chunk_content>
${chunkText}
</chunk_content>

Please provide a short (one-sentence) contextual description of where this chunk fits within the overall document.
Do not repeat the summary or the chunk content. Just provide the situational context.
`;
    const systemPrompt =
      'You are a RAG optimization assistant. Generate a concise, single-sentence situational context for the provided chunk.';

    try {
      const result = await this.llmService.generate(prompt, systemPrompt);
      return result.trim();
    } catch (error) {
      this.logger.warn(`Failed to generate contextual prefix for chunk: ${error.message}`);
      return '';
    }
  }
}
