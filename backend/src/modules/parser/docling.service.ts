import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

export interface DocBlock {
  text: string;
  page: number;
  section?: string;
  heading?: boolean;
  prov?: any[];
}

@Injectable()
export class DoclingService {
  private readonly logger = new Logger(DoclingService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'DOCLING_URL',
      'http://docling:5001',
    );
  }

  async parse(filePath: string): Promise<DocBlock[]> {
    try {
      const formData = new FormData();
      formData.append('files', fs.createReadStream(filePath));

      this.logger.log(`Sending file to Docling: ${filePath}`);

      const response = await axios.post(
        `${this.baseUrl}/v1/convert/file`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      this.logger.debug(`Docling response data: ${JSON.stringify(response.data).substring(0, 1000)}...`);
      return this.mapResponseToBlocks(response.data);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Docling parsing error: ${errorMessage}`);
      if (error.response) {
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  private mapResponseToBlocks(data: any): DocBlock[] {
    this.logger.debug(`Docling response keys: ${Object.keys(data)}`);
    if (data.document) {
      this.logger.debug(`Docling document keys: ${Object.keys(data.document)}`);
    }

    const blocks: DocBlock[] = [];
    
    // Try v1 structured JSON first
    const texts = data.document?.json_content?.texts || data.json_content?.texts;
    
    if (Array.isArray(texts) && texts.length > 0) {
      this.logger.log(`Mapping ${texts.length} structured blocks from json_content`);
      let currentSection = '';
      for (const item of texts) {
        const isHeading =
          item.label === 'section_header' ||
          item.label === 'heading' ||
          item.label === 'title';

        if (isHeading) {
          currentSection = item.text as string;
        }

        blocks.push({
          text: this.cleanText(item.text as string),
          page: item.prov && item.prov[0] ? (item.prov[0].page_no as number) : 1,
          section: currentSection,
          heading: isHeading,
          prov: item.prov,
        });
      }
    } else if (data.document?.md_content || data.md_content) {
      // Fallback to markdown content if structured JSON is missing
      const md = data.document?.md_content || data.md_content;
      this.logger.warn('json_content missing or empty, falling back to md_content');
      
      // Simple split by lines/paragraphs as a last resort
      const lines = md.split('\n').filter((l: string) => l.trim().length > 0);
      for (const [index, line] of lines.entries()) {
        const isHeading = line.startsWith('#');
        blocks.push({
          text: this.cleanText(line.replace(/^#+\s+/, '')),
          page: 1, // Markdown doesn't have page numbers usually
          section: isHeading ? line : 'General',
          heading: isHeading,
        });
      }
    }

    if (blocks.length === 0) {
      this.logger.error('No blocks could be extracted from Docling response');
    }

    return blocks.filter(b => b.text.trim().length > 0);
  }

  private cleanText(text: string): string {
    if (!text) return '';
    
    // Remove base64 images in markdown format: ![...](data:image/...;base64,...)
    const markdownImageRegex = /!\[.*?\]\(data:image\/.*?;base64,.*?\)/g;
    
    // Remove raw data URIs that might be floating around
    const dataUriRegex = /data:image\/[a-zA-Z]*;base64,[^\s"')]*/g;

    return text
      .replace(markdownImageRegex, '[Image Removed]')
      .replace(dataUriRegex, '[Image Removed]')
      .trim();
  }
}
