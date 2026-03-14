# System Overview Specification

## 1. Project Objective
A production-style RAG (Retrieval-Augmented Generation) Knowledge Assistant with fault-tolerant ingestion, hybrid retrieval, and modular backend architecture.

## 2. Core Architecture
- **Backend**: NestJS (Modular, Dependency Injection).
- **Frontend**: Next.js 14 (App Router, Tailwind, shadcn/ui).
- **Vector DB**: Qdrant (Semantic search, payload filtering).
- **Keyword Search**: OpenSearch (BM25 keyword retrieval).
- **Parser**: Docling (Structured block-based parsing).
- **LLM Layer**: Ollama (Primary local inference) + OpenAI (Fallback reliability).

## 3. High-Level Data Flow
1. **Ingestion**: Upload -> Docling Parse -> Metadata Extraction -> Contextual Chunking -> Embedding -> Dual Indexing (Qdrant + OpenSearch).
2. **Retrieval**: User Query -> Classification -> Hybrid Search (Vector + BM25) -> RRF Merge -> Reranking -> LLM Prompt.
3. **Response**: SSE (Server-Sent Events) for token streaming.

## 4. Module Responsibilities
- `auth`: Identity, JWT, Better-Auth, and tenancy enforcement.
- `documents`: File uploads, metadata management, and storage.
- `ingestion`: Saga state machine and pipeline orchestration.
- `parser`: Docling API integration and structured block extraction.
- `chunking`: Contextual grouping and metadata enrichment.
- `ai`: Provider abstraction, LLM generation, and embeddings.
- `vector`: Qdrant collection management and ANN search.
- `search`: OpenSearch BM25 indexing and retrieval.
- `query`: RAG pipeline orchestration, prompting, and streaming.
- `database`: PostgreSQL entities and TypeORM migrations.
- `common`: Filters, guards, decorators, and global logging.
