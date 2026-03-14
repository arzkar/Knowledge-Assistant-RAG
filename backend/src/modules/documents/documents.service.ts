import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Document, DocumentStatus } from '../database/entities/document.entity';
import { User } from '../database/entities/user.entity';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly ingestionService: IngestionService,
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

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.documentRepository.remove(document);
  }
}
