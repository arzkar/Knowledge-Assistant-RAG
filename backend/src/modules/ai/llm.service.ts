import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ILLMProvider } from './providers/provider.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
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

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      this.logger.log(`Attempting to generate using primary provider...`);
      return await this.primaryProvider.generate(prompt, systemPrompt);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary provider failed, falling back to secondary: ${errorMessage}`,
      );
      return await this.secondaryProvider.generate(prompt, systemPrompt);
    }
  }

  async *stream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    try {
      this.logger.log(`Attempting to stream using primary provider...`);
      const stream = this.primaryProvider.stream(prompt, systemPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary stream failed, falling back to secondary: ${errorMessage}`,
      );
      const stream = this.secondaryProvider.stream(prompt, systemPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
    }
  }
}
