import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { ILLMProvider } from './provider.interface';

@Injectable()
export class OllamaProvider implements ILLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    this.ollama = new Ollama({ host });
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'llama3');
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.ollama.chat({
        model: this.model,
        messages,
        stream: false,
      });

      return (response as any).message.content as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama generate error: ${errorMessage}`);
      throw error;
    }
  }

  async *stream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.ollama.chat({
        model: this.model,
        messages,
        stream: true,
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
}
