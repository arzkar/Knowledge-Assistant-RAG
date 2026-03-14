import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly dimension: number;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.configService.get<string>(
      'OPENAI_EMBED_MODEL',
      'text-embedding-3-large',
    );
    this.dimension = this.configService.get<number>('VECTOR_SIZE', 3072);
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimension,
      });

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Embedding error: ${errorMessage}`);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimension,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Batch embedding error: ${errorMessage}`);
      throw error;
    }
  }
}
