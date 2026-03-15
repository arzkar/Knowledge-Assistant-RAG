export interface LLMOptions {
  json?: boolean;
}

export interface ILLMProvider {
  generate(
    prompt: string, 
    systemPrompt?: string, 
    options?: LLMOptions
  ): Promise<string>;
  stream(
    prompt: string, 
    systemPrompt?: string, 
    options?: LLMOptions
  ): AsyncGenerator<string>;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
