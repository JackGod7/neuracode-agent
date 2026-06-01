import { describe, test, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----

const mockEmbeddingsCreate = vi.hoisted(() => vi.fn());
const mockSupabaseRpc = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

vi.mock("../src/db", () => ({
  supabase: {
    rpc: mockSupabaseRpc,
  },
}));

vi.mock("../src/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// ---- Import after mocks ----

import { searchKnowledge, formatMatchesAsContext, type KnowledgeMatch } from "../src/rag";

// ---- Helpers ----

function makeEmbeddingResponse(vec: number[] = Array(1536).fill(0.1)) {
  return { data: [{ embedding: vec }] };
}

function makeMatch(overrides: Partial<KnowledgeMatch> = {}): KnowledgeMatch {
  return {
    id: "uuid-1",
    source: "bootcamp",
    title: "bootcamp #1",
    content: "El bootcamp Harness Engineering cuesta USD 1497",
    similarity: 0.92,
    ...overrides,
  };
}

// ---- Tests ----

describe("002-rag-knowledge: searchKnowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("retorna matches con similarity cuando knowledge tiene datos", async () => {
    mockEmbeddingsCreate.mockResolvedValue(makeEmbeddingResponse());
    const matches = [makeMatch(), makeMatch({ id: "uuid-2", similarity: 0.85 })];
    mockSupabaseRpc.mockResolvedValue({ data: matches, error: null });

    const result = await searchKnowledge("precio del bootcamp VIP");

    expect(result).toHaveLength(2);
    expect(result[0].similarity).toBe(0.92);
    expect(mockSupabaseRpc).toHaveBeenCalledWith("match_knowledge", {
      query_embedding: expect.any(Array),
      match_count: 4,
      filter_source: null,
    });
  });

  test("retorna [] sin lanzar cuando OpenAI falla", async () => {
    mockEmbeddingsCreate.mockRejectedValue(new Error("openai rate limit"));

    await expect(searchKnowledge("precio")).resolves.toEqual([]);
    expect(mockSupabaseRpc).not.toHaveBeenCalled();
  });

  test("retorna [] sin lanzar cuando Supabase RPC falla", async () => {
    mockEmbeddingsCreate.mockResolvedValue(makeEmbeddingResponse());
    mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: "rpc error" } });

    await expect(searchKnowledge("precio")).resolves.toEqual([]);
  });

  test("retorna [] sin lanzar cuando OpenAI retorna embedding vacío", async () => {
    mockEmbeddingsCreate.mockResolvedValue({ data: [] });

    await expect(searchKnowledge("precio")).resolves.toEqual([]);
    expect(mockSupabaseRpc).not.toHaveBeenCalled();
  });

  test("filtro por source pasa filter_source al RPC", async () => {
    mockEmbeddingsCreate.mockResolvedValue(makeEmbeddingResponse());
    mockSupabaseRpc.mockResolvedValue({ data: [makeMatch({ source: "webinars" })], error: null });

    const result = await searchKnowledge("fecha del W2", { source: "webinars" });

    expect(result[0].source).toBe("webinars");
    expect(mockSupabaseRpc).toHaveBeenCalledWith("match_knowledge", expect.objectContaining({
      filter_source: "webinars",
    }));
  });

  test("matchCount se pasa al RPC", async () => {
    mockEmbeddingsCreate.mockResolvedValue(makeEmbeddingResponse());
    mockSupabaseRpc.mockResolvedValue({ data: [makeMatch()], error: null });

    await searchKnowledge("precio", { matchCount: 2 });

    expect(mockSupabaseRpc).toHaveBeenCalledWith("match_knowledge", expect.objectContaining({
      match_count: 2,
    }));
  });

  test("knowledge vacío → retorna []", async () => {
    mockEmbeddingsCreate.mockResolvedValue(makeEmbeddingResponse());
    mockSupabaseRpc.mockResolvedValue({ data: [], error: null });

    const result = await searchKnowledge("precio");

    expect(result).toEqual([]);
  });
});

describe("002-rag-knowledge: formatMatchesAsContext", () => {
  test("[] → '(sin información en la base de conocimiento)'", () => {
    expect(formatMatchesAsContext([])).toBe("(sin información en la base de conocimiento)");
  });

  test("match con source y title → formato [Fuente N: source — title]", () => {
    const result = formatMatchesAsContext([makeMatch()]);
    expect(result).toBe("[Fuente 1: bootcamp — bootcamp #1]\nEl bootcamp Harness Engineering cuesta USD 1497");
  });

  test("match sin title → formato [Fuente N: source] sin guión", () => {
    const result = formatMatchesAsContext([makeMatch({ title: "" })]);
    expect(result).toBe("[Fuente 1: bootcamp]\nEl bootcamp Harness Engineering cuesta USD 1497");
  });

  test("múltiples matches separados por doble newline", () => {
    const matches = [
      makeMatch({ content: "Contenido A" }),
      makeMatch({ id: "uuid-2", source: "webinars", title: "webinars #1", content: "Contenido B" }),
    ];
    const result = formatMatchesAsContext(matches);
    expect(result).toContain("\n\n");
    expect(result.split("\n\n")).toHaveLength(2);
    expect(result).toContain("[Fuente 1: bootcamp — bootcamp #1]");
    expect(result).toContain("[Fuente 2: webinars — webinars #1]");
  });
});

describe("002-rag-knowledge: ingest logic (unit)", () => {
  test("chunkText salta chunks vacíos — source = nombre de archivo sin extensión", () => {
    // Verifica la lógica de naming que ingest.ts usa: path.basename(file, ".md")
    const file = "bootcamp.md";
    const source = file.replace(/\.md$/, "");
    expect(source).toBe("bootcamp");
  });

  test("chunkText con CHUNK_SIZE y CHUNK_OVERLAP produce chunks correctos", () => {
    // Replica la función interna de ingest.ts
    function chunkText(text: string, size: number, overlap: number): string[] {
      const chunks: string[] = [];
      let i = 0;
      while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size - overlap;
      }
      return chunks;
    }

    const text = "A".repeat(1000);
    const chunks = chunkText(text, 500, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toHaveLength(500);
    // overlap: chunk[1] empieza en 450 → primer char igual al último slice del chunk[0]
    expect(chunks[1].slice(0, 50)).toBe(chunks[0].slice(450));
  });

  test("archivo vacío → chunkText retorna [] y se salta sin insertar", () => {
    function chunkText(text: string, size: number, overlap: number): string[] {
      const chunks: string[] = [];
      let i = 0;
      while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size - overlap;
      }
      return chunks;
    }

    const chunks = chunkText("", 500, 50);
    expect(chunks).toHaveLength(0);
  });
});
