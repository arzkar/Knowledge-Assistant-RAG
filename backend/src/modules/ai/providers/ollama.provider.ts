import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { ILLMProvider } from './provider.interface';

@Injectable()
export class OllamaProvider implements ILLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly ollama: Ollama;
  private readonly model: string;
  private readonly embedModel: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    this.ollama = new Ollama({ host });
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'llama3');
    this.embedModel = this.configService.get<string>(
      'OLLAMA_EMBED_MODEL',
      'nomic-embed-text',
    );
  }

  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: { json?: boolean },
  ): Promise<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.ollama.chat({
        model: this.model,
        messages,
        format: options?.json ? 'json' : undefined,
        stream: false,
        options: {
          num_ctx: 4096,
        },
      });

      return (response as any).message.content as string;
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('not found')) {
        this.logger.error(
          `Model '${this.model}' not found in Ollama. The 'ollama-pull' service should be pulling it, or you can run 'docker exec -it ollama ollama pull ${this.model}' manually.`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama generate error: ${errorMessage}`);
      throw error;
    }
  }

  async *stream(
    prompt: string,
    systemPrompt?: string,
    options?: { json?: boolean },
  ): AsyncGenerator<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.ollama.chat({
        model: this.model,
        messages,
        format: options?.json ? 'json' : undefined,
        stream: true,
        options: {
          num_ctx: 4096,
        },
      });

      for await (const part of response as any) {
        yield part.message.content as string;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama stream error: ${errorMessage}`);
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.ollama.embeddings({
        model: this.embedModel,
        prompt: text,
      });
      return response.embedding;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama embedding error: ${errorMessage}`);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      for (const text of texts) {
        const response = await this.ollama.embeddings({
          model: this.embedModel,
          prompt: text,
        });
        embeddings.push(response.embedding);
      }
      return embeddings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama batch embedding error: ${errorMessage}`);
      throw error;
    }
  }
}
