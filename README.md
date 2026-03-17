# EcoReady Knowledge Assistant (Production RAG)

A high-performance, enterprise-grade Knowledge Assistant engineered with a modular NestJS backend and a real-time Next.js frontend. This project implements advanced RAG (Retrieval-Augmented Generation) patterns including **Contextual Chunking**, **Hybrid Search**, and a **Fault-Tolerant Ingestion Saga**.

---

## 🏗 High-Level Architecture

The system is designed as a **Modular Monolith**, prioritizing domain encapsulation and scalability. Every component is decoupled via interfaces, allowing for seamless transitions between local development (Ollama) and production-scale APIs (OpenAI/Groq).

### Core Philosophy

1.  **Visibility over Abstraction:** Limited use of high-level frameworks like LangChain to maintain 100% control over the retrieval logic and prompt engineering.
2.  **Resilience by Design:** Asynchronous, state-persistent pipelines ensure that heavy document processing is resumable and observable.
3.  **Accuracy through Hybridization:** Combining semantic "vibe" search with keyword precision via Reciprocal Rank Fusion (RRF).

---

## 🚀 Key Technical Deep Dives

### 1. The Ingestion Saga (BullMQ & PostgreSQL)

Document processing is high-latency and prone to transient failures. We implemented a **Saga Pattern** where each document acts as a state machine.

- **Resume-ability:** The 11-stage pipeline checkpoints progress in PostgreSQL. If an embedding API call fails, the system retries from that specific stage rather than re-parsing the entire document.
- **The 11 Stages:**
  `UPLOADED` → `FETCHED` → `PARSED` (Docling) → `METADATA` (LLM Extraction) → `CHUNKED` → `CONTEXTUALIZED` (Situational Headers) → `EMBEDDED` → `BM25_INDEX` (OpenSearch) → `VECTOR_INDEX` (Qdrant) → `READY`.

### 2. Advanced Contextual Chunking

Traditional RAG splits text into blind segments, losing global context. Our pipeline implements **Contextual Retrieval**:

- **Situational Context:** For each 800-character chunk, we use an LLM to generate a one-sentence header describing where that chunk fits in the document.
- **Global Awareness:** This prefix is prepended before embedding, resolving ambiguous references (like "this section" or "the system") and significantly increasing retrieval recall.

### 3. Hybrid Retrieval Engine (Qdrant + OpenSearch)

We combine the strengths of two different search technologies:

- **Qdrant (Dense Vector):** Uses HNSW (Hierarchical Navigable Small World) for high-dimensional semantic search. Best for conceptual queries.
- **OpenSearch (Sparse Keyword):** Uses the BM25 algorithm for exact-match retrieval. Essential for finding specific terms, IDs, or file names.
- **RRF (Reciprocal Rank Fusion):** Merges the results using a consensus algorithm ($score = \sum 1/(k+rank)$), ensuring that documents found by both systems are boosted.

### 4. Real-Time Streaming (SSE Proxy)

To provide a premium user experience, the system streams LLM responses token-by-token.

- **Protocol:** Server-Sent Events (SSE).
- **Security Challenge:** Browsers do not support custom Auth headers in `EventSource`.
- **Our Solution:** A custom Next.js Proxy route that extracts the session cookie, attaches the Bearer token, and initiates the backend stream securely.

---

## 🛠 Tech Stack

### Backend (NestJS)

- **Modularity:** Domain-driven modules (`auth`, `ai`, `search`, `vector`).
- **Processing:** BullMQ + Redis for background job orchestration.
- **Database:** PostgreSQL (TypeORM) for state and metadata.
- **Vector DB:** Qdrant (HNSW index, 1536/3072 dims).
- **Search Engine:** OpenSearch (BM25).
- **Parser:** IBM Docling (Layout-aware structural parsing).
- **Runtime:** Bun (Oven).

### Frontend (Next.js 14)

- **Framework:** App Router with React Server Components.
- **Styling:** Tailwind CSS + shadcn/ui (Modern Zinc Theme).
- **State Management:** Zustand (Lightweight global store).
- **Forms:** React Hook Form + Zod validation.

---

## 🏃 Setup & Installation

### 1. Prerequisites

- Docker & Docker Compose
- OpenAI API Key (Required for embeddings)
- Cohere API Key (Optional, for reranking)

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory based on `.env.example`:

```bash
# AI Providers
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
COHERE_API_KEY=your_key_here # Optional

# Infrastructure
QDRANT_URL=http://qdrant:6333
OPENSEARCH_URL=http://opensearch:9200
```

### 3. Run with Docker

Start the entire stack (7 services) with a single command:

```bash
docker compose up --build
```

This will automatically:

1.  Spin up Postgres, Redis, Qdrant, and OpenSearch.
2.  Start the Docling parsing service.
3.  Launch the Backend and Frontend.

### 4. Access the Application

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

---

## 🧪 Engineering Quality & Testing

### Unit Testing

We prioritize testing core business logic over boilerplate.

- **`QueryService.spec.ts`:** Validates RRF merging, query classification, and dynamic weighting logic.
- **`ChunkingService.spec.ts`:** Ensures structural integrity and contextual prefix generation.

### Security Model

- **Multi-Tenancy:** Hard isolation at the database and vector payload levels. Users can only retrieve documents they own.
- **Input Validation:** Strict DTO validation with `class-validator` to prevent mass-assignment and injection attacks.
- **Rate Limiting:** Protects expensive AI endpoints from abuse via `@nestjs/throttler`.

---

## 🗺 Production Roadmap

- [ ] **Scalar Quantization:** Reduce Qdrant memory footprint by 4x.
- [ ] **Cross-Encoder Reranking:** Adding a second-stage reranker for maximum precision.
- [ ] **Knowledge Graph:** Integrating GraphRAG for multi-hop reasoning.

---

## 📝 License

UNLICENSED
