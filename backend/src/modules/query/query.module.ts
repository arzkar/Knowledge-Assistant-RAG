import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { SearchModule } from '../search/search.module';
import { VectorModule } from '../vector/vector.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [SearchModule, VectorModule, AiModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
