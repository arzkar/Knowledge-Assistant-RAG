export interface LLMResponse {
  text: string;
}

export interface LLMStreamResponse {
  textStream: AsyncIterable<string>;
}

export interface ILLMProvider {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  stream(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
