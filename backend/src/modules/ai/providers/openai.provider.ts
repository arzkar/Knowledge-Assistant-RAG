import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ILLMProvider } from './provider.interface';

@Injectable()
export class OpenAIProvider implements ILLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI generate error: ${errorMessage}`);
      throw error;
    }
  }

  async *stream(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
        stream: true,
      });

      for await (const part of response) {
        yield part.choices[0]?.delta?.content || '';
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI stream error: ${errorMessage}`);
      throw error;
    }
  }
}
