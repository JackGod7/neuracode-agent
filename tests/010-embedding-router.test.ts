import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Mocks ----

vi.mock("../src/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// ---- Imports ----

import { FallbackChain } from "../src/embeddings/chain";
import { buildEmbeddingChain, GeminiEmbeddingProvider, OpenAIEmbeddingProvider } from "../src/embeddings/index";
import type { EmbeddingProvider } from "../src/embeddings/provider";
import { logger } from "../src/logger";

// ---- Helpers ----

function makeProvider(name: string, dims: number, result: number[] | Error): EmbeddingProvider {
  return {
    name,
    dimensions: dims,
    embed: result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result),
  };
}

// ============================================================
// EmbeddingProvider interface
// ============================================================

describe("010-embedding-router: EmbeddingProvider interface", () => {
  test("OpenAIEmbeddingProvider.name = 'openai'", () => {
    const p = new OpenAIEmbeddingProvider("fake-key");
    expect(p.name).toBe("openai");
  });

  test("OpenAIEmbeddingProvider.dimensions = 1536", () => {
    const p = new OpenAIEmbeddingProvider("fake-key");
    expect(p.dimensions).toBe(1536);
  });

  test("GeminiEmbeddingProvider.name = 'gemini'", () => {
    const p = new GeminiEmbeddingProvider("fake-key");
    expect(p.name).toBe("gemini");
  });

  test("GeminiEmbeddingProvider.dimensions = 768", () => {
    const p = new GeminiEmbeddingProvider("fake-key");
    expect(p.dimensions).toBe(768);
  });
});

// ============================================================
// FallbackChain
// ============================================================

describe("010-embedding-router: FallbackChain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("primer provider exitoso → retorna su resultado sin intentar el siguiente", async () => {
    const vec = Array(1536).fill(0.1);
    const p1 = makeProvider("openai", 1536, vec);
    const p2 = makeProvider("gemini", 768, new Error("should not be called"));
    const chain = new FallbackChain([p1, p2]);

    const result = await chain.embedWithMeta("test");
    expect(result?.embedding).toBe(vec);
    expect(result?.provider.name).toBe("openai");
    expect(p2.embed).not.toHaveBeenCalled();
  });

  test("primer provider falla → loggea warn + intenta el segundo", async () => {
    const vec = Array(768).fill(0.2);
    const p1 = makeProvider("openai", 1536, new Error("quota exceeded"));
    const p2 = makeProvider("gemini", 768, vec);
    const chain = new FallbackChain([p1, p2]);

    const result = await chain.embedWithMeta("test");
    expect(result?.embedding).toBe(vec);
    expect(result?.provider.name).toBe("gemini");
    expect(logger.warn).toHaveBeenCalled();
  });

  test("todos fallan → retorna null + loggea error", async () => {
    const p1 = makeProvider("openai", 1536, new Error("error 1"));
    const p2 = makeProvider("gemini", 768, new Error("error 2"));
    const chain = new FallbackChain([p1, p2]);

    const result = await chain.embedWithMeta("test");
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  test("chain con un solo provider → comportamiento normal sin fallback", async () => {
    const vec = Array(1536).fill(0.5);
    const p1 = makeProvider("openai", 1536, vec);
    const chain = new FallbackChain([p1]);

    const result = await chain.embedWithMeta("test");
    expect(result?.embedding).toBe(vec);
    expect(result?.provider.name).toBe("openai");
  });

  test("FallbackChain requiere al menos un provider", () => {
    expect(() => new FallbackChain([])).toThrow();
  });
});

// ============================================================
// Factory desde env
// ============================================================

describe("010-embedding-router: factory desde env", () => {
  const origOrder = process.env.EMBEDDING_PROVIDER_ORDER;
  const origGemini = process.env.GEMINI_API_KEY;
  const origOpenAI = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.EMBEDDING_PROVIDER_ORDER = origOrder;
    process.env.GEMINI_API_KEY = origGemini;
    process.env.OPENAI_API_KEY = origOpenAI;
  });

  test("EMBEDDING_PROVIDER_ORDER=gemini,openai → chain primario = gemini", () => {
    process.env.EMBEDDING_PROVIDER_ORDER = "gemini,openai";
    process.env.GEMINI_API_KEY = "fake-gemini";
    process.env.OPENAI_API_KEY = "fake-openai";

    const chain = buildEmbeddingChain();
    expect(chain.name).toBe("gemini");
    expect(chain.dimensions).toBe(768);
  });

  test("EMBEDDING_PROVIDER_ORDER ausente → chain [OpenAI] (default)", () => {
    delete process.env.EMBEDDING_PROVIDER_ORDER;
    process.env.OPENAI_API_KEY = "fake-openai";
    delete process.env.GEMINI_API_KEY;

    const chain = buildEmbeddingChain();
    expect(chain.name).toBe("openai");
  });

  test("provider desconocido en ORDER → loggea warn, se ignora", () => {
    process.env.EMBEDDING_PROVIDER_ORDER = "gemmini,openai";
    process.env.OPENAI_API_KEY = "fake-openai";

    buildEmbeddingChain();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('provider desconocido "gemmini"')
    );
  });
});
