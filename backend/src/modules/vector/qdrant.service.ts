import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly collectionName = 'chunks';

  constructor(private readonly configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL', 'http://qdrant:6333'),
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.configService.get<number>('VECTOR_SIZE', 3072),
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to ensure Qdrant collection: ${error}`);
    }
  }

  async upsert(points: any[]) {
    return this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(vector: number[], filter?: any, limit = 5) {
    return this.client.search(this.collectionName, {
      vector,
      filter,
      limit,
      with_payload: true,
    });
  }

  async deleteByDocumentId(documentId: string) {
    return this.client.delete(this.collectionName, {
      filter: {
        must: [
          {
            key: 'documentId',
            match: { value: documentId },
          },
        ],
      },
    });
  }
}
