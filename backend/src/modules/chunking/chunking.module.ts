import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chunk } from '../database/entities/chunk.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chunk]), AiModule],
  providers: [ChunkingService],
  exports: [ChunkingService],
})
export class ChunkingModule {}
