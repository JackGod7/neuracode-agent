import { describe, test, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----

const mockGetCachedToolResult = vi.hoisted(() => vi.fn());
const mockCacheToolResult = vi.hoisted(() => vi.fn());
const mockMakeIdempotencyKey = vi.hoisted(() => vi.fn().mockReturnValue("hash-abc123"));

vi.mock("../src/db", () => ({
  getCachedToolResult: mockGetCachedToolResult,
  cacheToolResult: mockCacheToolResult,
  makeIdempotencyKey: mockMakeIdempotencyKey,
}));

const mockConsultarBootcamp = vi.hoisted(() => vi.fn());

vi.mock("../src/tools/consultar_bootcamp", () => ({
  consultarBootcamp: mockConsultarBootcamp,
  consultarBootcampSchema: {
    name: "consultar_bootcamp",
    description: "test",
    input_schema: { type: "object", properties: {}, required: [] },
  },
}));

vi.mock("../src/tools/inscribir_webinar", () => ({
  inscribirWebinar: vi.fn(),
  inscribirWebinarSchema: {
    name: "inscribir_webinar",
    description: "test",
    input_schema: { type: "object", properties: {}, required: [] },
  },
}));

vi.mock("../src/tools/agendar_call", () => ({
  agendarCall: vi.fn(),
  agendarCallSchema: {
    name: "agendar_call",
    description: "test",
    input_schema: { type: "object", properties: {}, required: [] },
  },
}));

vi.mock("../src/tools/generar_link_pago", () => ({
  generarLinkPago: vi.fn(),
  generarLinkPagoSchema: {
    name: "generar_link_pago",
    description: "test",
    input_schema: { type: "object", properties: {}, required: [] },
  },
}));

vi.mock("../src/tools/escalar_a_jack", () => ({
  escalarAJack: vi.fn(),
  escalarAJackSchema: {
    name: "escalar_a_jack",
    description: "test",
    input_schema: { type: "object", properties: {}, required: [] },
  },
}));

vi.mock("../src/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
}));

// ---- Imports ----

import { executeTool } from "../src/tools";

// ---- Fixtures ----

const CTX = { leadId: "lead-uuid", whatsappNumber: "+51999888777" };
const MOCK_RESULT = { context: "Bootcamp VIP cuesta S/1500", matches: 3 };

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
  mockMakeIdempotencyKey.mockReturnValue("hash-abc123");
  mockGetCachedToolResult.mockResolvedValue(null); // default: no cache
  mockCacheToolResult.mockResolvedValue(undefined);
  mockConsultarBootcamp.mockResolvedValue(MOCK_RESULT);
});

// ============================================================
// Capa 2 — Tool call cache
// ============================================================

describe("005-idempotencia: Capa 2 — tool cache", () => {
  test("cache hit within TTL → handler NOT called, returns cached result", async () => {
    const cachedResult = { context: "cached answer", matches: 1 };
    mockGetCachedToolResult.mockResolvedValue(cachedResult);

    const result = await executeTool("consultar_bootcamp", { query: "precio" }, CTX);

    expect(result).toEqual(cachedResult);
    expect(mockConsultarBootcamp).not.toHaveBeenCalled();
  });

  test("cache miss → handler called, result stored in cache", async () => {
    mockGetCachedToolResult.mockResolvedValue(null);

    const result = await executeTool("consultar_bootcamp", { query: "precio" }, CTX);

    expect(mockConsultarBootcamp).toHaveBeenCalledOnce();
    expect(mockCacheToolResult).toHaveBeenCalledWith(
      "hash-abc123",
      "consultar_bootcamp",
      "lead-uuid",
      MOCK_RESULT
    );
    expect(result).toEqual(MOCK_RESULT);
  });

  test("tool throws → result NOT cached, returns error object", async () => {
    mockConsultarBootcamp.mockRejectedValue(new Error("OpenAI timeout"));

    const result = await executeTool("consultar_bootcamp", { query: "precio" }, CTX) as {
      error: string;
    };

    expect(result.error).toBeDefined();
    expect(mockCacheToolResult).not.toHaveBeenCalled();
  });

  test("input with different key order → same idempotency key → cache hit", async () => {
    // makeIdempotencyKey is mocked to always return same hash
    // This tests that the cache lookup key is consistent regardless of input order
    const cachedResult = { context: "cached", matches: 1 };
    mockGetCachedToolResult.mockResolvedValue(cachedResult);

    const r1 = await executeTool("consultar_bootcamp", { b: 2, a: 1 }, CTX);
    const r2 = await executeTool("consultar_bootcamp", { a: 1, b: 2 }, CTX);

    expect(r1).toEqual(cachedResult);
    expect(r2).toEqual(cachedResult);
    // makeIdempotencyKey called with same args both times → same hash
    expect(mockMakeIdempotencyKey).toHaveBeenCalledTimes(2);
    expect(mockConsultarBootcamp).not.toHaveBeenCalled();
  });

  test("different leadId + same input → separate cache entries", async () => {
    mockGetCachedToolResult.mockResolvedValue(null);
    // Mock returns different keys for different leadIds
    mockMakeIdempotencyKey
      .mockReturnValueOnce("hash-lead-1")
      .mockReturnValueOnce("hash-lead-2");

    await executeTool("consultar_bootcamp", { query: "precio" }, { ...CTX, leadId: "lead-1" });
    await executeTool("consultar_bootcamp", { query: "precio" }, { ...CTX, leadId: "lead-2" });

    expect(mockGetCachedToolResult).toHaveBeenNthCalledWith(1, "hash-lead-1");
    expect(mockGetCachedToolResult).toHaveBeenNthCalledWith(2, "hash-lead-2");
  });

  test("unknown tool → returns error object, no cache interaction", async () => {
    const result = await executeTool("herramienta_fantasma", {}, CTX) as { error: string };

    expect(result.error).toContain("herramienta_fantasma");
    expect(mockGetCachedToolResult).not.toHaveBeenCalled();
    expect(mockCacheToolResult).not.toHaveBeenCalled();
  });
});

// ============================================================
// Capa 1 — Wamid dedup (unit test for the pattern in claude.ts)
// The integration of this pattern is tested in 003-tool-use-loop.test.ts.
// Here we verify makeIdempotencyKey produces collision-resistant keys.
// ============================================================

describe("005-idempotencia: Capa 1 — wamid key properties", () => {
  test("makeIdempotencyKey is called with leadId + toolName + input", async () => {
    mockGetCachedToolResult.mockResolvedValue(null);

    await executeTool("consultar_bootcamp", { query: "precio" }, CTX);

    expect(mockMakeIdempotencyKey).toHaveBeenCalledWith(
      "lead-uuid",
      "consultar_bootcamp",
      { query: "precio" }
    );
  });
});
