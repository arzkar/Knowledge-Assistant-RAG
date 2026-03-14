# Gemini Context File

This file describes the project architecture and rules for AI code generation.

The AI must follow this document when generating code.

Do not change architecture decisions.

Do not simplify pipeline.

Do not remove modules.

---

## 1. Project Overview

This project is a production-style RAG Knowledge Assistant.

Features

Document upload
Saga-based ingestion pipeline
Contextual chunking
Embeddings
Dual index (Qdrant + OpenSearch)
Hybrid retrieval
LangChain EnsembleRetriever
Rerank
Streaming LLM responses
JWT auth
NestJS backend
NextJS frontend
Docker local stack

The system must run locally using docker-compose.

---

## 2. Tech Stack

Backend

NestJS
TypeScript
Postgres
TypeORM

Search

Qdrant
OpenSearch
LangChain

LLM

Ollama
OpenAI (optional fallback)

Parsing

Docling

Frontend

Next.js
React
Tailwind

Infrastructure

Docker Compose

---

## 3. Architecture Rules

Use NestJS modules.

Do not write everything in one service.

Modules

auth
documents
ingestion
parser
chunk
vector
search
query
ai

Each module must have

controller
service
dto
module

Use dependency injection.

---

## 4. Ingestion Pipeline

Pipeline must follow saga pattern.

Stages

UPLOADED
FETCHED
PARSED
METADATA_DONE
CHUNKED
CONTEXTUALIZED
EMBEDDED
BM25_INDEXED
VECTOR_INDEXED
READY
FAILED

Status stored in database.

Pipeline must resume from last status.

Do not process everything in one function.

Do not block request thread.

Processing must be async.

---

## 5. Parsing

Use Docling.

Do not use pdf-parse.

Do not use LangChain loader.

Parser returns structured blocks.

Chunking must use structure.

---

## 6. Chunking

Use contextual chunking.

Do not use simple text splitter.

Chunks must contain metadata.

Chunks stored in Postgres.

Embeddings stored in Qdrant.

Text stored in OpenSearch.

---

## 7. Vector Storage

Use Qdrant.

Run locally in docker.

Do not use Pinecone.

Do not store vectors in Postgres.

Use cosine similarity.

Use payload filters.

---

## 8. Keyword Search

Use OpenSearch.

Run locally in docker.

Use BM25.

Use filters.

Do not use Postgres full-text search.

---

## 9. Retrieval Pipeline

Steps

Query classification
Build retrievers
EnsembleRetriever
Rerank
Prompt
LLM
Stream

Use LangChain for retrieval.

Use EnsembleRetriever.

Use Qdrant retriever.

Use OpenSearch retriever.

Do not remove hybrid search.

---

## 10. LangChain Usage

Use LangChain only in retrieval layer.

Allowed

Embeddings
VectorStore
Retriever
EnsembleRetriever
Rerank
LLM chain

Not allowed

Ingestion pipeline
Auth
Database
Controllers
DTO
Saga logic

LangChain must not replace NestJS architecture.

---

## 11. LLM Provider

Use env variable

LLM_PROVIDER

Values

ollama
openai

Default

ollama

System must run locally without API key.

OpenAI optional.

---

## 12. Environment Rules

Use ConfigModule.

Do not use process.env directly.

All values must come from env.

Use .env.example.

Do not hardcode keys.

---

## 13. Docker Rules

Everything must run in docker.

Services

postgres
qdrant
opensearch
docling
ollama
backend
frontend

Use service names as hostnames.

Do not use localhost inside containers.

---

## 14. Code Rules

Use DTO validation.

Use exception filters.

Use guards.

Use services.

Use modules.

No business logic in controller.

No direct DB calls in controller.

---

## 15. Goal

Code must look like production backend.

Architecture must be clear.

Pipeline must be explicit.

Retrieval must be hybrid.

LangChain must be used for retriever.

System must run locally.
