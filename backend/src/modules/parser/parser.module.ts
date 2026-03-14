import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoclingService } from './docling.service';

@Module({
  imports: [ConfigModule],
  providers: [DoclingService],
  exports: [DoclingService],
})
export class ParserModule {}
