# AI Provider Specification

## 1. Overview
The AI module is a unified provider-agnostic layer for LLM and Embedding operations. It supports local inference (Ollama) as the primary provider and cloud APIs (OpenAI) as the secondary/fallback provider.

## 2. Module Structure
Location: `backend/src/modules/ai/`
- `ai.module.ts`: Module definition and provider registration.
- `llm.service.ts`: Orchestrates LLM calls and fallback logic.
- `embeddings.service.ts`: Handles vector generation.
- `providers/`:
    - `provider.interface.ts`: Interface for LLM providers.
    - `ollama.provider.ts`: Ollama SDK integration.
    - `openai.provider.ts`: OpenAI SDK integration.

## 3. Configuration (Env Variable `LLM_PROVIDER`)
- **Primary**: `ollama` (Default)
- **Secondary**: `openai`
- **Rule**: If `LLM_PROVIDER=ollama` and the call fails, the service MUST attempt a retry via `openai` if `OPENAI_API_KEY` is present.

## 4. LLM Models
- **Ollama**: Default model `llama3`.
- **OpenAI**: Default model `gpt-4o`.
- **Reranker**: Optional model `rerank-v3.5`.

## 5. Embeddings Model
- **Model**: OpenAI `text-embedding-3-large`.
- **Vector Size**: 3072 (Must match Qdrant `chunks` collection).
- **Rule**: All chunks MUST be embedded before being indexed in Qdrant.

## 6. Provider Interface (`ILlmProvider`)
```typescript
interface ILlmProvider {
  /** Generate a complete response */
  generate(prompt: string): Promise<string>;
  
  /** Stream tokens for real-time interaction */
  stream(prompt: string): AsyncGenerator<string>;
  
  /** Generate vector embeddings */
  embed(text: string): Promise<number[]>;
}
```

## 7. Implementation Rules
- **No Direct Calls**: Do not call OpenAI or Ollama SDKs directly in the `QueryService` or `IngestionService`. All calls must pass through `LlmService`.
- **Logging**: Log every provider transition (e.g., "Ollama failed, falling back to OpenAI").
- **Cost Management**: Prefer local models (Ollama) for extraction/parsing stages if performance is sufficient. Use OpenAI for high-precision retrieval reranking.
