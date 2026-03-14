import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from './chunking.service';
import { DocBlock } from '../parser/docling.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get<ChunkingService>(ChunkingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should group blocks into chunks within target size', async () => {
    const blocks: DocBlock[] = [
      { text: 'Hello world. '.repeat(20), page: 1, section: 'Intro' },
      { text: 'More text here. '.repeat(20), page: 1, section: 'Intro' },
    ];

    const chunks = await service.createChunks(blocks);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].text.length).toBeGreaterThan(400);
  });

  it('should split chunks on substantial headings', async () => {
    const blocks: DocBlock[] = [
      { text: 'Block 1 content. '.repeat(50), page: 1, section: 'Sec 1' },
      { text: 'Section 2 Heading', page: 1, section: 'Sec 2', heading: true },
      { text: 'Block 2 content. '.repeat(50), page: 1, section: 'Sec 2' },
    ];

    const chunks = await service.createChunks(blocks);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[1].metadata.section).toBe('Sec 2');
  });
});
