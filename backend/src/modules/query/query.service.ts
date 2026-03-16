import { Injectable, Logger } from '@nestjs/common';
import { OpenSearchService } from '../search/opensearch.service';
import { QdrantService } from '../vector/qdrant.service';
import { LlmService } from '../ai/llm.service';
import { EmbeddingsService } from '../ai/embeddings.service';
import { ConfigService } from '@nestjs/config';
import { Subscriber } from 'rxjs';
import { CohereClient } from 'cohere-ai';

export enum QueryType {
  FACTUAL = 'FACTUAL',
  LOOKUP = 'LOOKUP',
  CONCEPTUAL = 'CONCEPTUAL',
  COMPARATIVE = 'COMPARATIVE',
}

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);
  private readonly cohere: CohereClient | null = null;

  constructor(
    private readonly opensearchService: OpenSearchService,
    private readonly qdrantService: QdrantService,
    private readonly llmService: LlmService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('COHERE_API_KEY');
    if (apiKey) {
      this.cohere = new CohereClient({ token: apiKey });
    }
  }

  async handleQuery(query: string, documentIds?: string[]) {
    this.logger.log(`Handling query: ${query}`);

    // 1. Classify Query
    const queryType = await this.classifyQuery(query);
    const weights = this.getWeights(queryType);

    // 2. Retrieve Context (Hybrid Search)
    let context = await this.retrieveContext(query, weights, documentIds);

    // 3. Second-Stage Reranking
    context = await this.rerank(query, context);

    // 4. Generate Answer
    const prompt = this.buildPrompt(query, context);
    const answer = await this.llmService.generate(prompt, undefined, {
      temperature: Number(this.configService.get('LLM_TEMPERATURE', 0)),
      maxTokens: Number(this.configService.get('LLM_MAX_TOKENS', 2000)),
    });

    return {
      answer,
      sources: context.map((c, idx) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        score: c.rerankScore || c.rrfScore,
        text: c.text,
        metadata: c.metadata,
        sourceNumber: idx + 1,
      })),
      metadata: {
        queryType,
        weights,
      }
    };
  }

  async streamQuery(query: string, subscriber: Subscriber<string>, documentIds?: string[]) {
    try {
      const queryType = await this.classifyQuery(query);
      const weights = this.getWeights(queryType);
      let context = await this.retrieveContext(query, weights, documentIds);

      context = await this.rerank(query, context);

      const prompt = this.buildPrompt(query, context);
      const stream = this.llmService.stream(prompt, undefined, {
        temperature: Number(this.configService.get('LLM_TEMPERATURE', 0)),
        maxTokens: Number(this.configService.get('LLM_MAX_TOKENS', 2000)),
      });

      // Send sources first
      const sources = context.map((c, idx) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        score: c.rerankScore || c.rrfScore,
        text: c.text,
        metadata: c.metadata,
        sourceNumber: idx + 1,
      }));
      subscriber.next(JSON.stringify({ type: 'sources', data: sources }));

      for await (const chunk of stream) {
        subscriber.next(JSON.stringify({ type: 'token', data: chunk }));
      }
      subscriber.complete();
    } catch (error) {
      this.logger.error(`Error in streamQuery: ${error.message}`);
      subscriber.error(error);
    }
  }

  private async rerank(query: string, documents: any[]): Promise<any[]> {
    if (!this.cohere || documents.length === 0) {
      this.logger.warn('Cohere API Key not set or no docs, skipping rerank');
      return documents;
    }

    try {
      this.logger.log(`Reranking ${documents.length} documents...`);
      const response = await this.cohere.rerank({
        query,
        documents: documents.map(d => d.text),
        model: 'rerank-v3.5',
        topN: 10,
      });

      return response.results.map((result) => ({
        ...documents[result.index],
        rerankScore: result.relevanceScore,
      })).sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));
    } catch (error) {
      this.logger.error(`Rerank failed: ${error}`);
      return documents;
    }
  }

  private async classifyQuery(query: string): Promise<QueryType> {
    const prompt = `Classify this query into one of: FACTUAL, LOOKUP, CONCEPTUAL, COMPARATIVE. Query: "${query}"`;
    const systemPrompt = `Return only the category name.`;

    const result = await this.llmService.generate(prompt, systemPrompt);
    const type = result.trim().toUpperCase() as QueryType;

    return Object.values(QueryType).includes(type) ? type : QueryType.FACTUAL;
  }

  private getWeights(type: QueryType) {
    const weights = {
      [QueryType.FACTUAL]: { vector: 0.40, bm25: 0.60 },
      [QueryType.LOOKUP]: { vector: 0.35, bm25: 0.65 },
      [QueryType.CONCEPTUAL]: { vector: 0.75, bm25: 0.25 },
      [QueryType.COMPARATIVE]: { vector: 0.60, bm25: 0.40 },
    };
    return weights[type] || weights[QueryType.FACTUAL];
  }

  private async retrieveContext(query: string, weights: { vector: number, bm25: number }, documentIds?: string[]) {
    const limit = 5;
    const overFetchLimit = limit * 3;

    // Parallel Retrieval
    const [vectorResults, bm25Results] = await Promise.all([
      this.getVectorResults(query, overFetchLimit, documentIds),
      this.getBm25Results(query, overFetchLimit, documentIds),
    ]);

    // RRF Merge
    return this.rrfMerge(vectorResults, bm25Results, weights, limit);
  }

  private async getVectorResults(query: string, limit: number, documentIds?: string[]) {
    const vector = await this.embeddingsService.embed(query);
    const filter = documentIds ? {
      must: [{ key: 'documentId', match: { any: documentIds } }]
    } : undefined;

    const results = await this.qdrantService.search(vector, filter, limit);
    return results.map((r, idx) => ({
      chunkId: r.payload?.chunkId as string,
      documentId: r.payload?.documentId as string,
      text: r.payload?.text as string,
      rank: idx + 1,
      score: r.score,
    }));
  }

  private async getBm25Results(query: string, limit: number, documentIds?: string[]) {
    const filter = documentIds ? {
      terms: { documentId: documentIds }
    } : undefined;

    const results = await this.opensearchService.search(query, filter, limit);
    return results.map((r: any, idx: number) => ({
      chunkId: r._source.chunkId,
      documentId: r._source.documentId,
      text: r._source.text,
      rank: idx + 1,
      score: r._score,
    }));
  }

  private rrfMerge(vector: any[], bm25: any[], weights: { vector: number, bm25: number }, limit: number) {
    const c = 60;
    const scores = new Map<string, any>();

    const process = (results: any[], weight: number) => {
      results.forEach((res) => {
        const existing = scores.get(res.chunkId) || { ...res, rrfScore: 0 };
        existing.rrfScore += weight * (1 / (c + res.rank));
        scores.set(res.chunkId, existing);
      });
    };

    process(vector, weights.vector);
    process(bm25, weights.bm25);

    return Array.from(scores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit);
  }

  private buildPrompt(query: string, context: any[]) {
    const contextText = context.map(c => c.text).join('\n\n---\n\n');
    return `
SYSTEM: You are a knowledgeable assistant. Answer the user's question using ONLY the provided context.
If the information is not present in the context, say "I am sorry, but I don't have enough information to answer that."

CONTEXT:
${contextText}

USER QUESTION:
${query}
`;
  }
}
