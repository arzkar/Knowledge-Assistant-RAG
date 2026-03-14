# Infrastructure & Deployment Specification

## 1. Overview
The system is fully containerized using Docker Compose. It requires 7 core services to run the full RAG pipeline locally.

## 2. Docker Compose Services
### 2.1 Storage & Search
- **postgres:16**: Primary metadata store (Users, Documents, Chunks).
    - Port: `5432:5432`.
    - Volume: `pgdata`.
- **redis**: In-memory store for BullMQ background tasks.
    - Port: `6379:6379`.
- **qdrant**: Vector database.
    - Port: `6333:6333`.
    - Volume: `qdrant_data`.
- **opensearch**: Keyword search (BM25).
    - Port: `9200:9200`.
    - Required Env: `discovery.type=single-node`.

### 2.2 AI & Parsing
- **docling**: Document parsing service.
    - Port: `8000:8000`.
    - Rule: Backend must call `http://docling:8000` (not localhost).
- **ollama**: Local LLM inference.
    - Port: `11434:11434`.
    - Volume: `ollama_data`.
    - Rule: Pull `llama3` on first run.

### 2.3 Application
- **backend**: NestJS API.
    - Port: `3001:3001`.
    - Depends on: `postgres`, `qdrant`, `opensearch`, `docling`, `ollama`.
- **frontend**: Next.js 14.
    - Port: `3000:3000`.
    - Env: `NEXT_PUBLIC_API_URL=http://localhost:3001`.

## 3. Network Configuration
- All services communicate via the internal Docker network using service names (e.g., `DATABASE_HOST=postgres`).
- DO NOT use `localhost` within service configurations; it will fail inside the container.

## 4. Volume Management
- `pgdata`: Persistent PostgreSQL data.
- `qdrant_data`: Persistent Vector collection data.
- `ollama_data`: Persistent LLM model data.
- `upload_dir`: Shared volume (local) for document storage.

## 5. Deployment Commands
- **Full Start**: `docker compose up --build -d`.
- **Full Stop**: `docker compose down`.
- **View Logs**: `docker compose logs -f backend`.
