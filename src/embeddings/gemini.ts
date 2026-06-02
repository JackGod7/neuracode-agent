import type { EmbeddingProvider } from "./provider";

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
  readonly dimensions = 768;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(GEMINI_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${response.status}: ${err}`);
    }

    const data = await response.json() as { embedding?: { values?: number[] } };
    const embedding = data.embedding?.values;
    if (!embedding || embedding.length === 0) {
      throw new Error("Gemini returned empty embedding");
    }
    return embedding;
  }
}
