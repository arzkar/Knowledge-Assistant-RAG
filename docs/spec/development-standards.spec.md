# Development & Coding Standards Specification

## 1. General Architecture
- **Framework**: NestJS (Dependency Injection, Controllers, Services, Modules).
- **Frontend**: Next.js 14 (Functional Components, App Router).
- **Rule**: No business logic in Controllers. All logic MUST reside in Services.

## 2. Coding Rules
- **TypeScript**: Strict typing required. No `any`.
- **Async**: All IO (Database, AI, File System) MUST be `async/await`.
- **Validation**:
    - Every input requires a DTO (Data Transfer Object).
    - Use `class-validator` and `class-transformer`.
- **Configuration**:
    - Use NestJS `ConfigService`.
    - Never use `process.env` directly in services or controllers.
- **Error Handling**:
    - Throw standard `HttpException` subclasses (e.g., `BadRequestException`).
    - Use the global `ExceptionFilter` for error response formatting.
- **Logging**:
    - Use the project's dedicated `LoggerService`.
    - Log every stage of the ingestion saga and every hybrid search query.

## 3. Module Responsibilities
- `auth`: JWT, Better-Auth, and identity.
- `documents`: Uploads, file storage, and document status tracking.
- `ingestion`: Orchestrates the 11-stage saga (Fetch to Ready).
- `parser`: Docling API integration for structured block extraction.
- `chunking`: Grouping blocks into contextualized 500-800 char chunks.
- `ai`: Provider abstraction layer for Ollama and OpenAI.
- `vector`: Qdrant collection management and vector search.
- `search`: OpenSearch BM25 indexing and retrieval.
- `query`: RAG orchestration, prompt engineering, and SSE streaming.
- `common`: Global filters, interceptors, and tenancy decorators.
- `database`: TypeORM entities and schema migrations.

## 4. Environment Checklist
All services MUST use the following variables from `.env`:
- `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES`.
- `QDRANT_URL`, `OPENSEARCH_URL`, `DOCLING_URL`, `OLLAMA_URL`.
- `LLM_PROVIDER` (Default: `ollama`).
- `OPENAI_API_KEY` (Required for fallback and embeddings).
- `CHUNKING_SIZE` (Target: 800), `CHUNKING_OVERLAP`.

## 5. Testing Requirements
- **Unit Tests**: Mandatory for `Auth`, `Chunking`, `Retrieval`, and `Query` logic.
- **E2E Tests**: Required for `Auth` flow, `Upload` flow, and `Query` streaming.
