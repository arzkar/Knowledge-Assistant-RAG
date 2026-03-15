import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly client: Client;
  private readonly indexName = 'chunks';

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      node: this.configService.get<string>('OPENSEARCH_URL', 'http://opensearch:9200'),
    });
  }

  async onModuleInit() {
    await this.ensureIndex();
  }

  private async ensureIndex() {
    try {
      const { body: exists } = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        this.logger.log(`Creating OpenSearch index: ${this.indexName}`);
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              index: {
                number_of_shards: 1,
                number_of_replicas: 0,
              },
            },
            mappings: {
              properties: {
                text: { type: 'text' },
                documentId: { type: 'keyword' },
                chunkId: { type: 'keyword' },
                metadata: { type: 'object' },
              },
            },
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to ensure OpenSearch index: ${error}`);
    }
  }

  async indexChunk(chunk: any) {
    return this.client.index({
      index: this.indexName,
      body: chunk,
      refresh: true,
    });
  }

  async bulkIndex(chunks: any[]) {
    if (chunks.length === 0) return;

    const body = chunks.flatMap((chunk) => [
      { index: { _index: this.indexName } },
      chunk,
    ]);

    const { body: response } = await this.client.bulk({
      body,
      refresh: true,
    });

    if (response.errors) {
      this.logger.error(`Bulk index encountered errors`);
      // Optional: log specific errors
    }

    return response;
  }

  async search(query: string, filter?: any, limit = 5) {
    const body: any = {
      size: limit,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['text'],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
    };

    if (filter) {
      body.query.bool.filter = filter;
    }

    const { body: response } = await this.client.search({
      index: this.indexName,
      body,
    });

    return response.hits.hits;
  }

  async deleteByDocumentId(documentId: string) {
    return this.client.deleteByQuery({
      index: this.indexName,
      body: {
        query: {
          term: { documentId },
        },
      },
    });
  }
}
