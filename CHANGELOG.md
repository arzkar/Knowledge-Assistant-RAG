# Changelog

All notable changes to the Knowledge Assistant project will be documented in this file.

## [Phase 1: Scaffolding & Infrastructure] - 2026-03-14
### Added
- Initialized NestJS backend project.
- Initialized Next.js 14 frontend project (Tailwind, shadcn/ui).
- Configured `docker-compose.yml` with PostgreSQL, Qdrant, OpenSearch, Ollama, and Docling.
- Created `Dockerfile` for both backend and frontend.
- Set up `.env` and `.env.example` following the updated Environment Plan.
- Configured Next.js standalone output for Docker optimization.

## [Phase 2: Backend Foundations] - 2026-03-14
### Added
- **Database Module**: Integrated TypeORM, defined `User`, `Document`, and `Chunk` entities.
- **Auth Module**: JWT-based authentication, signup/login logic, guards, and strategy.
- **Documents Module**: Local file storage, upload/list controllers, and metadata management.

## [Phase 3: AI, Multi-tenancy & Better-Auth] - 2026-03-14
### Added
- **AI Module**: Provider abstraction with Ollama (Primary) and OpenAI (Fallback) support.
- **Embeddings Service**: OpenAI `text-embedding-3-large` integration.
- **Parser Module**: Docling API integration for PDF/TXT/MD parsing.
- Registered all modules in `AppModule`.
- Refined Retrieval Pipeline defaults (vectorWeight: 0.65, bm25Weight: 0.35, rrfConstant: 60, rerankTopN: 10).
- Configured Cohere `rerank-v3.5` for second-stage reranking (optional via `COHERE_API_KEY`).
### Changed
- Started refactoring Auth module to use [Better-Auth](http://better-auth.com/).
- Enforced strict Multi-tenancy across `Documents` module.

---

## [To-Do Checklist]

### Phase 3: AI & RAG Pipeline
- **Parser & Extraction**
  - [ ] Implement `DoclingService` for PDF/MD/TXT extraction
  - [ ] Implement LLM-based metadata extraction (Title, Summary, Keywords)
- **Ingestion Saga (BullMQ)**
  - [ ] Set up Redis and BullMQ for task queueing
  - [ ] Build `PipelineService` state machine (11 stages) as queue workers
  - [ ] Implement saga resume/checkpoint logic using `DocumentStatus`
  - [ ] Set up asynchronous background processing for uploads
- **Chunking & Contextualization**
  - [ ] Implement `ChunkingService` (500-800 char groups)
  - [ ] Build LLM contextualization logic (Document + Section enrichment)
- **Indexing**
  - [ ] Implement `OpenSearchService` for BM25 keyword indexing
  - [ ] Implement `QdrantService` for vector upserts and payload filtering
  - [ ] Create `EmbedStage` using OpenAI `text-embedding-3-large`
- **Hybrid Retrieval**
  - [ ] Implement Query Classification (FACTUAL, CONCEPTUAL, etc.)
  - [ ] Build `HybridService` with Ensemble over-fetch (Limit × 3)
  - [ ] Implement Reciprocal Rank Fusion (RRF) merge logic
  - [ ] Integrate Cohere `rerank-v3.5` for second-stage reranking

### Phase 4: Frontend Implementation
- **Authentication & State**
  - [ ] Integrate Better-Auth client in `frontend/src/lib/auth-client.ts`
  - [ ] Setup Zustand for global state management
  - [ ] Build Login/Signup pages using shadcn/ui & react-hook-form + Zod
  - [ ] Implement protected route guards for `/documents` and `/query`
- **Document Management**
  - [ ] Build document upload component (Drag & Drop + Progress)
  - [ ] Implement document list table with real-time status badges
- **Query Interface**
  - [ ] Build chat interface with Markdown support
  - [ ] Implement SSE streaming integration (EventSource)
  - [ ] Build Citations/Sources panel (Accordion view)

### Phase 5: Testing & Polish
- **Validation**
  - [ ] Unit tests for `ChunkingService` and `HybridService`
  - [ ] E2E tests for the full ingestion saga (Upload -> Ready)
  - [ ] E2E tests for query streaming and ownership isolation
- **Optimization**
  - [ ] Configure `INGESTION_CONCURRENCY` and batch processing
  - [ ] Finalize Docker production optimization (Multi-stage builds)
  - [ ] Polish UI/UX (Skeleton loaders, toast notifications)
