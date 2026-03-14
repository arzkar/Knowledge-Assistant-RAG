import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ILLMProvider } from './provider.interface';

@Injectable()
export class OpenAIProvider implements ILLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly dimension: number;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.embedModel = this.configService.get<string>(
      'OPENAI_EMBED_MODEL',
      'text-embedding-3-large',
    );
    this.dimension = this.configService.get<number>('VECTOR_SIZE', 3072);
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

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embedModel,
        input: text,
        dimensions: this.dimension,
      });

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI embedding error: ${errorMessage}`);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embedModel,
        input: texts,
        dimensions: this.dimension,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI batch embedding error: ${errorMessage}`);
      throw error;
    }
  }
}
