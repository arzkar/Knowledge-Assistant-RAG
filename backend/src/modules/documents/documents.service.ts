import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Document, DocumentStatus } from '../database/entities/document.entity';
import { User } from '../database/entities/user.entity';
import { IngestionService } from '../ingestion/ingestion.service';
import { QdrantService } from '../vector/qdrant.service';
import { OpenSearchService } from '../search/opensearch.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly ingestionService: IngestionService,
    private readonly qdrantService: QdrantService,
    private readonly opensearchService: OpenSearchService,
  ) {}

  async create(file: Express.Multer.File, user: User): Promise<Document> {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const document = this.documentRepository.create({
      userId: user.id,
      filename,
      originalName: file.originalname,
      filePath,
      status: DocumentStatus.UPLOADED,
      metadata: {},
    });

    const savedDocument = await this.documentRepository.save(document);
    
    // Trigger ingestion saga
    await this.ingestionService.startIngestion(savedDocument.id);

    return savedDocument;
  }

  async findAll(user: User, page: number = 1, limit: number = 10): Promise<{ items: Document[], total: number }> {
    const [items, total] = await this.documentRepository.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findOne(id: string, user: User): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async remove(id: string, user: User): Promise<void> {
    const document = await this.findOne(id, user);

    this.logger.log(`Removing document ${id} from all stores...`);

    // 1. Delete from Qdrant
    try {
      await this.qdrantService.deleteByDocumentId(id);
    } catch (e) {
      this.logger.error(`Failed to delete from Qdrant: ${e.message}`);
    }

    // 2. Delete from OpenSearch
    try {
      await this.opensearchService.deleteByDocumentId(id);
    } catch (e) {
      this.logger.error(`Failed to delete from OpenSearch: ${e.message}`);
    }

    // 3. Delete from File System
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (e) {
        this.logger.error(`Failed to delete file: ${e.message}`);
      }
    }

    // 4. Delete from Database (cascades to chunks)
    await this.documentRepository.remove(document);
  }

  async retryIngestion(id: string, user: User): Promise<Document> {
    const document = await this.findOne(id, user);
    
    // Restore status from metadata to resume, or default to UPLOADED
    const resumeStatus = (document.metadata as any)?.resumeStatus || DocumentStatus.UPLOADED;
    
    await this.documentRepository.update(id, {
      status: resumeStatus,
      error: null,
    });

    await this.ingestionService.startIngestion(id);
    
    return this.findOne(id, user);
  }
}
