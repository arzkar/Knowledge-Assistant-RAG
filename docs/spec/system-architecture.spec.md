# System Architecture & Design Decisions

## 1. Objective & Philosophy
The goal is to build a production-grade RAG (Retrieval-Augmented Generation) system that prioritizes explicit control, fault tolerance, and modularity. Unlike framework-heavy solutions, this architecture emphasizes visibility into every stage of the pipeline—from ingestion checkpointing to hybrid retrieval ranking.

## 2. Core Decisions (The "Why")

### 2.1 Backend & Frontend
- **NestJS + TypeScript**: Chosen for its modular architecture and dependency injection. Essential for keeping the ingestion saga and complex retrieval logic separated and testable.
- **Next.js 14**: Provides the best-in-class structure for modern web apps, with native SSE support for streaming LLM tokens.

### 2.2 Storage & Search
- **Qdrant (Vector)**: Specialized vector database. Chosen for HNSW indexing, fast cosine similarity, and robust payload filtering. We avoid storing vectors in Postgres to maintain performance at scale.
- **OpenSearch (Keyword)**: Essential for hybrid retrieval. Provides BM25 ranking, advanced analyzers, and scalable keyword indexing.
- **Dual Index Strategy**: Hybrid search (Vector + BM25) is the production standard. Vector captures semantic meaning, while BM25 handles exact terms and rare identifiers.

### 2.3 RAG Pipeline Logic
- **Query Classification**: Classifying queries (FACTUAL, CONCEPTUAL, etc.) allows us to dynamically weight BM25 vs. Vector scores, significantly improving relevance.
- **Ensemble Retrieval (K*3)**: We fetch more candidates than needed (e.g., fetch 15 for a top-5 limit) to give RRF and Rerankers enough context to work with.
- **Reciprocal Rank Fusion (RRF)**: Since vector and BM25 scores are not directly comparable, RRF merges them based on rank positions, which is more robust for hybrid search.
- **Two-Stage Reranking**: First stage maximizes recall; second stage (rerank) maximizes precision using an LLM or cross-encoder.

### 2.4 Ingestion & Parsing
- **Docling**: Returns structured blocks rather than raw text. This allows for "Contextual Chunking" where chunks respect document boundaries (headings, sections).
- **Saga-Based Pipeline**: An 11-stage checkpoint-based process. If a 10MB document fails at the embedding stage, the system resumes there instead of restarting the whole parse/metadata extraction.
- **Contextualization**: Adding document-level and section-level context to each chunk before embedding. This "grounds" short chunks that might otherwise lose meaning.

### 2.5 AI & LLM
- **Ollama (Primary)**: Local inference for zero cost and offline development.
- **OpenAI (Fallback)**: Ensures system reliability if local models fail or for high-quality production embeddings (`text-embedding-3-large`).
- **Custom AI Module**: We avoid LangChain for core logic to maintain control over classification, reranking, and fallback flows.

## 3. High-Level Architecture
- **Ingestion**: Upload -> Docling -> LLM Metadata -> Contextual Chunking -> Embedding -> Dual Index.
- **Retrieval**: User Query -> LLM Classify -> Hybrid Search (Qdrant + OpenSearch) -> RRF Merge -> Rerank -> LLM Stream.
- **Transport**: SSE (Server-Sent Events) for real-time token delivery.
