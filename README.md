# EcoReady Knowledge Assistant (RAG)

A production-grade Knowledge Assistant featuring a fault-tolerant ingestion saga, hybrid retrieval engine, and real-time streaming interface.

## 🚀 Key Features

- **Ingestion Saga (BullMQ):** An 11-stage resumable processing pipeline for PDF/TXT/MD documents.
- **Advanced Chunking:** Contextual chunking powered by **Docling** structured blocks.
- **Hybrid Retrieval:** Combined semantic (Qdrant) and keyword (OpenSearch) search using **Reciprocal Rank Fusion (RRF)**.
- **Query Classification:** Dynamic weighting based on intent detection (Factual, Conceptual, etc.).
- **Reranking:** Second-stage refinement using **Cohere rerank-v3.5**.
- **Streaming UI:** Real-time token streaming via SSE with full source attribution.
- **Secure Auth:** Multi-tenant identity management via **Better-Auth**.

---

## 🛠 Tech Stack

### Backend
- **Framework:** NestJS (TypeScript)
- **Queue:** BullMQ + Redis
- **Database:** PostgreSQL (TypeORM)
- **Vector DB:** Qdrant
- **Keyword Search:** OpenSearch
- **LLM:** Ollama (Local) / OpenAI (Fallback)
- **Parser:** Docling

### Frontend
- **Framework:** Next.js 14 (App Router)
- **State:** Zustand
- **Validation:** Zod + React Hook Form
- **UI:** Tailwind CSS + shadcn/ui

---

## 🏃 Setup & Installation

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v20+)
- Ollama (Optional, for local inference)

### 2. Environment Configuration
Copy the example environment file and fill in your keys:
```bash
cp backend/.env.example backend/.env
```

### 3. Run with Docker
Start all services in **Production Mode** (Optimized, no hot-reload):
```bash
docker compose up --build
```

Start all services in **Development Mode** (Hot-reloading enabled):
```bash
docker compose -f docker-compose.dev.yml up --build
```

### 4. Local Development (NPM)
If you wish to run the backend/frontend outside Docker:
```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 🏗 Architecture

### 1. Ingestion Pipeline (The Saga)
Documents progress through checkpointed states:
`UPLOADED` → `FETCHED` → `PARSED` → `METADATA` → `CHUNKED` → `CONTEXTUALIZED` → `EMBEDDED` → `BM25_INDEX` → `VECTOR_INDEX` → `READY`.

### 2. Retrieval Pipeline
1. **Classify:** LLM determines if query is Factual or Conceptual.
2. **Retrieve:** Parallel search in Qdrant and OpenSearch.
3. **Merge:** RRF formula merges ranks using intent-based weights.
4. **Rerank:** Top results refined via Cohere.
5. **Generate:** Grounded prompt sent to LLM for final answer.

---

## 🧪 Testing
Run the backend unit tests:
```bash
cd backend && npm test
```

## 📝 License
UNLICENSED
