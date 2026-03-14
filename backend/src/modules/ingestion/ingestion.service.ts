import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(@InjectQueue('ingestion') private readonly ingestionQueue: Queue) {}

  async startIngestion(documentId: string) {
    this.logger.log(`Queueing ingestion for document: ${documentId}`);
    await this.ingestionQueue.add('process-document', { documentId }, {
      jobId: documentId, // Ensure unique job per document
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
