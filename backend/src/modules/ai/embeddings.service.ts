import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ILLMProvider } from './providers/provider.interface';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly primaryProvider: ILLMProvider;
  private readonly secondaryProvider: ILLMProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly openaiProvider: OpenAIProvider,
  ) {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'ollama');
    if (provider === 'openai') {
      this.primaryProvider = this.openaiProvider;
      this.secondaryProvider = this.ollamaProvider;
    } else {
      this.primaryProvider = this.ollamaProvider;
      this.secondaryProvider = this.openaiProvider;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      this.logger.log(`Attempting to embed using primary provider...`);
      return await this.primaryProvider.embed(text);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary provider failed to embed, falling back to secondary: ${errorMessage}`,
      );
      return await this.secondaryProvider.embed(text);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      this.logger.log(`Attempting to batch embed using primary provider...`);
      return await this.primaryProvider.embedBatch(texts);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary provider failed to batch embed, falling back to secondary: ${errorMessage}`,
      );
      return await this.secondaryProvider.embedBatch(texts);
    }
  }
}
