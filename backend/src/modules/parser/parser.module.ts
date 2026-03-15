import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoclingService } from './docling.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ConfigModule, AiModule],
  providers: [DoclingService],
  exports: [DoclingService],
})
export class ParserModule {}
