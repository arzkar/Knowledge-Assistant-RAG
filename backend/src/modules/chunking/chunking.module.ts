import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chunk } from '../database/entities/chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chunk])],
  providers: [ChunkingService],
  exports: [ChunkingService],
})
export class ChunkingModule {}
