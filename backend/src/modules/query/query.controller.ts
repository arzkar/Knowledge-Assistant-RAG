import { Controller, Post, Body, Sse, MessageEvent, Get, Query as QueryParam } from '@nestjs/common';
import { QueryService } from './query.service';
import { Observable, map } from 'rxjs';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  async query(@Body() body: { query: string; documentIds?: string[] }) {
    return this.queryService.handleQuery(body.query, body.documentIds);
  }

  @Sse('stream')
  stream(@QueryParam('q') query: string, @QueryParam('ids') docIds?: string): Observable<MessageEvent> {
    const documentIds = docIds ? docIds.split(',') : undefined;
    
    return new Observable<string>((subscriber) => {
      this.queryService.streamQuery(query, subscriber, documentIds);
    }).pipe(
      map((data) => ({ data } as MessageEvent))
    );
  }
}
