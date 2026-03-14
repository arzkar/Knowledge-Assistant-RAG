# Ingestion Saga Specification

## 1. Overview
The ingestion pipeline uses a saga pattern to ensure fault tolerance and resume-ability. Each document progresses through 11 distinct states, with progress checkpointed in the PostgreSQL `documents` table.

## 2. Document States (Status Enum)
1. `UPLOADED`: Initial upload state.
2. `FETCHED`: File validated and path prepared.
3. `PARSED`: Docling structured blocks extracted.
4. `METADATA_DONE`: Title, summary, and keywords extracted via LLM.
5. `CHUNKED`: Blocks grouped into chunks (~500-800 chars).
6. `CONTEXTUALIZED`: Chunks enriched with LLM-generated document/section context.
7. `EMBEDDED`: Vectors generated using OpenAI `text-embedding-3-large`.
8. `BM25_INDEXED`: Text and metadata indexed in OpenSearch.
9. `VECTOR_INDEXED`: Vectors and payload upserted to Qdrant.
10. `READY`: Fully indexed and searchable.
11. `FAILED`: Terminal failure state with logged error.

## 3. Saga Rules
- **Non-Blocking**: Ingestion runs asynchronously; the upload endpoint returns immediately after file receipt.
- **Checkpointing**: The `PipelineService` checks the current status and resumes from the first incomplete stage.
- **Isolation**: Each stage is a separate class/service; stages do not call other stages directly.
- **Error Handling**: Failures must update the document status to `FAILED` and record the error message without crashing the background worker.

## 4. Pipeline Order
1. `FETCH` -> 2. `PARSE` -> 3. `METADATA` -> 4. `CHUNK` -> 5. `CONTEXTUALIZE` -> 6. `EMBED` -> 7. `BM25_INDEX` -> 8. `VECTOR_INDEX` -> 9. `FINALIZE`.
