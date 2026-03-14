# Ingestion Pipeline Specification (Saga Pattern)

## 1. Pipeline Overview
The ingestion pipeline is designed to handle document processing in a fault-tolerant, resumable, and asynchronous manner. Each uploaded document is checkpointed at 11 stages.

## 2. Document States (Status Enum)
Documents must move through these states in order:
1.  **UPLOADED**: Initial receipt of file.
2.  **FETCHED**: Local path verified, metadata initialized.
3.  **PARSED**: Docling API extraction complete (JSON structured blocks).
4.  **METADATA_DONE**: LLM extraction of title, summary, and keywords.
5.  **CHUNKED**: Blocks grouped into chunks (~500-800 characters).
6.  **CONTEXTUALIZED**: Each chunk enriched with document/section context using LLM.
7.  **EMBEDDED**: Vector generation for `contextText`.
8.  **BM25_INDEXED**: Chunks and metadata stored in OpenSearch.
9.  **VECTOR_INDEXED**: Vectors and payload stored in Qdrant.
10. **READY**: Fully searchable.
11. **FAILED**: Terminal failure state; records error in `documents.error`.

## 3. Detailed Stage Logic (Saga Pattern)
The `PipelineService` orchestrates these stages. Each stage is a separate class/service.

### Stage 1: FETCH
- **Purpose**: Verify file existence and prepare storage path.
- **Rule**: Must not modify file content.

### Stage 2: PARSE (Docling)
- **Tool**: Docling API (hosted on `http://docling:8000`).
- **Output**: Returns an array of structured blocks (text, page, section heading).
- **Rule**: Reject unsupported formats (only PDF, TXT, MD allowed).

### Stage 3: METADATA
- **Tool**: AI Module (Ollama/OpenAI).
- **Output**: JSON containing `title`, `summary`, and `keywords`.
- **Storage**: JSONB column in `documents` table.

### Stage 4: CHUNK
- **Strategy**: **Contextual Chunking**. Group blocks by section/heading.
- **Size**: Targets 500-800 characters per chunk.
- **Overlap**: Minimal (based on block structure rather than character count).

### Stage 5: CONTEXTUALIZE
- **Tool**: AI Module.
- **Action**: For each chunk, use the document title and section heading to create a "Contextualized Text" string.
- **Example**: `Document Title: [Title] | Section: [Section] | Content: [Chunk Text]`.

### Stage 6: EMBED
- **Tool**: Embeddings Service.
- **Model**: OpenAI `text-embedding-3-large`.
- **Vector Size**: 3072 dimensions.

### Stage 7: BM25_INDEX
- **Tool**: OpenSearch Service.
- **Data**: `text`, `documentId`, `chunkId`, and `metadata` (JSONB).

### Stage 8: VECTOR_INDEX
- **Tool**: Qdrant Service.
- **Data**: Vector + Payload (`chunkId`, `documentId`, `text`, `metadata`).

## 4. Operational Rules
- **Resume-ability**: If a document is in `CHUNKED` status, the `PipelineService.run(docId)` will skip stages 1-5 and start at `CONTEXTUALIZE`.
- **Async Execution**: Ingestion MUST NOT block the request thread. The controller calls `ingestionService.run(docId)` and returns a `202 Accepted`.
- **Concurrency**: Managed via `INGESTION_CONCURRENCY` env variable.
- **Isolation**: Stages are purely functional within their scope. `EmbedStage` should not know about `Qdrant` indexing.
