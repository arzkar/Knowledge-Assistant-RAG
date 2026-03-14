# Retrieval & Query Pipeline Specification

## 1. Overview
The retrieval system is a multi-stage hybrid pipeline. It combines semantic (Vector) and keyword (BM25) search, merging them using Reciprocal Rank Fusion (RRF) and refining the result with an LLM reranker.

## 2. Default Retrieval Parameters

| Setting | Default |
| :--- | :--- |
| `vectorWeight` | 0.65 |
| `bm25Weight` | 0.35 |
| `rrfConstant (c)` | 60 |
| `rerankTopN` | 10 |
| `Ensemble over-fetch` | limit × 3 |
| `Cohere model` | rerank-v3.5 |
| `Reranking enabled` | only if `COHERE_API_KEY` set |

## 3. Pipeline Stages

### Stage 1: Query Classification
The query is analyzed by an LLM to detect intent. This determines the weights for the hybrid merge.
- **FACTUAL**: (BM25 0.60, Vector 0.40) - For specific facts.
- **LOOKUP**: (BM25 0.65, Vector 0.35) - For exact terms.
- **CONCEPTUAL**: (BM25 0.25, Vector 0.75) - For meanings/ideas.
- **COMPARATIVE**: (BM25 0.40, Vector 0.60) - For entity comparisons.
- *Default*: Use Default weights (vector 0.65 / bm25 0.35) if classification fails.

### Stage 2: Ensemble Retrieval (K * 3)
Retrieve a large pool of candidates from both stores to maximize recall.
- **Limit**: Final `K` (e.g., 5) results are returned, but we fetch `K * 3` (e.g., 15) from each retriever.
- **Qdrant (Vector)**: Semantic search using `cosine` distance. Mandatory payload filtering by `documentId` or `userId`.
- **OpenSearch (BM25)**: Keyword search using `multi_match` with `fuzziness: AUTO`. Native filters applied.

### Stage 3: Reciprocal Rank Fusion (RRF) Merge
Scores from Vector and BM25 are incomparable. We merge based on rank position.
- **Formula**: `score(doc) = v_weight * (1 / (60 + v_rank)) + b_weight * (1 / (60 + b_rank))`
- **Constant**: `c = 60`.

### Stage 4: Second-Stage Reranking
Top results from RRF are reranked for precision.
- **Input**: User Query + Context Chunks.
- **Tool**: Cohere `rerank-v3.5` (if `COHERE_API_KEY` is set) or specialized rerank model.
- **Top N**: `rerankTopN` is 10.

### Stage 5: Generation & Streaming
- **Prompt Architecture**: Strict grounding. "You are a helpful assistant. Use ONLY the provided context. If the answer is not in the context, say 'I don't know'."
- **Output**: Stream tokens via SSE (`GET /query/stream`).
- **Sources**: Every response must include a citations array: `{ documentId, chunkId, score, textFragment }`.

## 4. Implementation Rules
- **No Direct DB Calls**: Query module must use Search/Vector services.
- **Hybrid Mandatory**: Never skip BM25 or Vector search unless specifically requested by user flags.
- **Tenancy**: Every search query MUST include ownership filters.
- **Metrics**: Log `classificationTime`, `retrievalTime`, and `llmTime` for every query.
