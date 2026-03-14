import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor } from './ingestion.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { Chunk } from '../database/entities/chunk.entity';
import { ParserModule } from '../parser/parser.module';
import { AiModule } from '../ai/ai.module';
import { ChunkingModule } from '../chunking/chunking.module';
import { VectorModule } from '../vector/vector.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Chunk]),
    BullModule.registerQueue({
      name: 'ingestion',
    }),
    ParserModule,
    AiModule,
    ChunkingModule,
    VectorModule,
    SearchModule,
  ],
  providers: [IngestionService, IngestionProcessor],
  exports: [IngestionService],
})
export class IngestionModule {}
