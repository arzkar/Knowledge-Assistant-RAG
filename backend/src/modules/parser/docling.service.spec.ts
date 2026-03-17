import { Test, TestingModule } from '@nestjs/testing';
import { DoclingService } from './docling.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DoclingService', () => {
  let service: DoclingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoclingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://docling:5001'),
          },
        },
      ],
    }).compile();

    service = module.get<DoclingService>(DoclingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse user-provided JSON structure correctly', async () => {
    const mockResponse = {
      status: 200,
      data: {
        document: {
          json_content: {
            texts: [
              {
                text: 'Test content',
                label: 'body',
                prov: [
                  {
                    page_no: 24,
                    bbox: { l: 0, t: 0, r: 10, b: 10 }
                  }
                ]
              }
            ]
          }
        }
      }
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    // Mock fs.createReadStream
    const fs = require('fs');
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mock-stream' as any);

    const blocks = await service.parse('test.pdf');
    
    expect(blocks.length).toBe(1);
    expect(blocks[0].text).toBe('Test content');
    expect(blocks[0].page).toBe(24);
    expect(blocks[0].prov).toBeDefined();
    expect(blocks[0].prov![0].page_no).toBe(24);
  });

  it('should handle alternative text paths', async () => {
    const mockResponse = {
      status: 200,
      data: {
        texts: [
          {
            text: 'Direct text',
            prov: [{ page_no: 5 }]
          }
        ]
      }
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const blocks = await service.parse('test.pdf');
    expect(blocks[0].text).toBe('Direct text');
    expect(blocks[0].page).toBe(5);
  });

  it('should fallback to markdown if JSON is missing', async () => {
    const mockResponse = {
      status: 200,
      data: {
        document: {
          md_content: '# Header\nContent line'
        }
      }
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const blocks = await service.parse('test.pdf');
    expect(blocks.length).toBe(2);
    expect(blocks[0].heading).toBe(true);
    expect(blocks[0].text).toBe('Header');
    expect(blocks[0].page).toBe(1);
  });
});
