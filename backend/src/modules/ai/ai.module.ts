import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LlmService } from './llm.service';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [ConfigModule],
  providers: [OllamaProvider, OpenAIProvider, LlmService, EmbeddingsService],
  exports: [LlmService, EmbeddingsService],
})
export class AiModule {}
