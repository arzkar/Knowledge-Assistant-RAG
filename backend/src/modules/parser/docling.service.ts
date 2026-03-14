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
      formData.append('file', fs.createReadStream(filePath));

      this.logger.log(`Sending file to Docling: ${filePath}`);

      const response = await axios.post(
        `${this.baseUrl}/v1alpha/convert/file`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

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
    // Assuming data.document.texts contains the items we need
    // This mapping depends on the exact version of Docling Serve
    // We target the broad structure described in docs
    const blocks: DocBlock[] = [];
    const texts = (data.document?.texts as any[]) || [];

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
        text: item.text as string,
        page: item.prov && item.prov[0] ? (item.prov[0].page_no as number) : 1,
        section: currentSection,
        heading: isHeading,
      });
    }

    return blocks;
  }
}
