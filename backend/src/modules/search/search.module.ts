import { Module } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class SearchModule {}
