import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentsService } from './documents.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@Controller('documents')
@UseGuards(BetterAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.create(file, user);
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.documentsService.findAll(user, +page, +limit);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.findOne(id, user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.remove(id, user);
  }

  @Post(':id/retry')
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.retryIngestion(id, user);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.cancelIngestion(id, user);
  }

  @Get(':id/view')
  async view(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.findOne(id, user);
    const stream = fs.createReadStream(document.filePath);
    
    // Set appropriate content type based on extension
    const ext = path.extname(document.originalName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.txt') contentType = 'text/plain';
    else if (ext === '.md') contentType = 'text/markdown';
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${document.originalName}"`,
    });
    
    stream.pipe(res);
  }
}
