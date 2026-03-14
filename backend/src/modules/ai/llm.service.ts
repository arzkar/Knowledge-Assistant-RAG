import { Injectable, Logger } from '@nestjs/common';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly ollamaProvider: OllamaProvider,
    private readonly openaiProvider: OpenAIProvider,
  ) {}

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      this.logger.log('Attempting to generate using Ollama...');
      return await this.ollamaProvider.generate(prompt, systemPrompt);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Ollama failed, falling back to OpenAI: ${errorMessage}`,
      );
      return await this.openaiProvider.generate(prompt, systemPrompt);
    }
  }

  async *stream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    try {
      this.logger.log('Attempting to stream using Ollama...');
      const stream = this.ollamaProvider.stream(prompt, systemPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Ollama stream failed, falling back to OpenAI: ${errorMessage}`,
      );
      const stream = this.openaiProvider.stream(prompt, systemPrompt);
      for await (const chunk of stream) {
        yield chunk;
      }
    }
  }
}
