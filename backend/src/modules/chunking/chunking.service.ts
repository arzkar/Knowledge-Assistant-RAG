import { Injectable, Logger } from '@nestjs/common';
import { DocBlock } from '../parser/docling.service';

export interface ChunkResult {
  text: string;
  chunkIndex: number;
  metadata: {
    page: number;
    section?: string;
  };
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly targetChunkSize = 800;
  private readonly minChunkSize = 400;

  async createChunks(blocks: DocBlock[]): Promise<ChunkResult[]> {
    this.logger.log(`Chunking ${blocks.length} blocks...`);
    
    const chunks: ChunkResult[] = [];
    let currentChunkText = '';
    let currentChunkPage = blocks[0]?.page || 1;
    let currentChunkSection = blocks[0]?.section || '';
    let chunkIndex = 0;

    for (const block of blocks) {
      // If adding this block exceeds target size and we have enough content, flush the current chunk
      if (currentChunkText.length + block.text.length > this.targetChunkSize && currentChunkText.length >= this.minChunkSize) {
        chunks.push({
          text: currentChunkText.trim(),
          chunkIndex: chunkIndex++,
          metadata: {
            page: currentChunkPage,
            section: currentChunkSection,
          },
        });
        currentChunkText = '';
      }

      // If it's a heading, we might want to start a new chunk or at least update context
      if (block.heading && currentChunkText.length > 0) {
        // Flush before starting a new section if current is substantial
        if (currentChunkText.length >= this.minChunkSize) {
            chunks.push({
                text: currentChunkText.trim(),
                chunkIndex: chunkIndex++,
                metadata: {
                  page: currentChunkPage,
                  section: currentChunkSection,
                },
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

    // Flush the last chunk
    if (currentChunkText.trim().length > 0) {
      chunks.push({
        text: currentChunkText.trim(),
        chunkIndex: chunkIndex++,
        metadata: {
          page: currentChunkPage,
          section: currentChunkSection,
        },
      });
    }

    this.logger.log(`Created ${chunks.length} chunks`);
    return chunks;
  }
}
