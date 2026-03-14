# Data Schema & Multi-Tenancy Specification

## 1. PostgreSQL (Metadata & State)
Managed via TypeORM. All primary keys are UUIDs.

### 1.1 `users` Table
- `id`: UUID (Primary)
- `email`: String (Unique)
- `passwordHash`: String (Bcrypt)
- `role`: Enum (`USER`, `ADMIN`)
- `createdAt`, `updatedAt`: Timestamps

### 1.2 `documents` Table
- `id`: UUID (Primary)
- `userId`: UUID (FK to `users.id`)
- `filename`: String (Original name)
- `filePath`: String (Local filesystem path)
- `status`: Enum (Saga Status, Index: `status`)
- `metadata`: JSONB (Title, summary, keywords)
- `error`: Text (Null-able failure reason)
- `createdAt`, `updatedAt`: Timestamps

### 1.3 `chunks` Table
- `id`: UUID (Primary)
- `documentId`: UUID (FK to `documents.id`, Index: `documentId`)
- `chunkIndex`: Integer
- `text`: Text (Raw chunk content)
- `contextText`: Text (Enriched context for embedding)
- `metadata`: JSONB (Page number, section heading)
- `createdAt`: Timestamp

## 2. Qdrant (Vector Database)
- **Collection**: `chunks`
- **Vector Size**: 3072 (OpenAI `text-embedding-3-large`)
- **Distance**: Cosine
- **Payload Schema**:
    - `chunkId`: UUID
    - `documentId`: UUID
    - `text`: String (Original text)
    - `metadata`: Object (Page, section)
- **Rules**: NO storage of `userId` in vector payload. Ownership is checked via `documentId` mapping or direct payload filter.

## 3. OpenSearch (Keyword Index)
- **Index Name**: `chunks`
- **Mapping**:
    - `text`: `text` (Uses standard analyzer with stemming)
    - `title`: `text` (From document metadata)
    - `documentId`: `keyword`
    - `chunkId`: `keyword`
    - `metadata`: `object`

## 4. Multi-Tenancy Rules
- **Resource Ownership**: Every resource (`document`, `chunk`) must link back to a `userId`.
- **Backend Validation**: Every service method MUST accept a `userId` or verify it via the `documentId`.
- **Query Isolation**:
    - Qdrant: Every search query MUST include a payload filter: `must: [{ key: "documentId", match: { any: [...] } }]`.
    - OpenSearch: Every search query MUST include a term filter for `documentId`.
- **Never Trust the Client**: Frontend sends IDs; Backend validates ownership before any operation (Delete, Query, List).
