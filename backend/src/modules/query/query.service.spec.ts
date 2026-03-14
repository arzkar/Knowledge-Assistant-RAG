import { Test, TestingModule } from '@nestjs/testing';
import { QueryService, QueryType } from './query.service';
import { OpenSearchService } from '../search/opensearch.service';
import { QdrantService } from '../vector/qdrant.service';
import { LlmService } from '../ai/llm.service';
import { EmbeddingsService } from '../ai/embeddings.service';
import { ConfigService } from '@nestjs/config';

describe('QueryService', () => {
  let service: QueryService;

  const mockOpenSearch = { search: jest.fn() };
  const mockQdrant = { search: jest.fn() };
  const mockLlm = { generate: jest.fn(), stream: jest.fn() };
  const mockEmbeddings = { embed: jest.fn() };
  const mockConfig = { get: jest.fn().mockReturnValue(null) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        { provide: OpenSearchService, useValue: mockOpenSearch },
        { provide: QdrantService, useValue: mockQdrant },
        { provide: LlmService, useValue: mockLlm },
        { provide: EmbeddingsService, useValue: mockEmbeddings },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
  });

  it('should classify queries correctly', async () => {
    mockLlm.generate.mockResolvedValue('CONCEPTUAL');
    const type = await (service as any).classifyQuery('What is the meaning of life?');
    expect(type).toBe(QueryType.CONCEPTUAL);
  });

  it('should use correct weights for query types', () => {
    const weights = (service as any).getWeights(QueryType.CONCEPTUAL);
    expect(weights.vector).toBe(0.75);
    expect(weights.bm25).toBe(0.25);
  });

  it('should perform RRF merge correctly', () => {
    const vector = [{ chunkId: '1', rank: 1, text: 'v1' }];
    const bm25 = [{ chunkId: '1', rank: 2, text: 'v1' }];
    const weights = { vector: 0.5, bm25: 0.5 };
    
    const results = (service as any).rrfMerge(vector, bm25, weights, 5);
    expect(results[0].chunkId).toBe('1');
    expect(results[0].rrfScore).toBeGreaterThan(0);
  });
});
