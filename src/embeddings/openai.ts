import OpenAI from "openai";
import type { EmbeddingProvider } from "./provider";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimensions = 1536;

  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "text-embedding-3-small") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("OpenAI returned empty embedding");
    return embedding;
  }
}
