import { describe, test, expect, vi, beforeEach } from "vitest";

// ---- Mocks (hoisted by vitest before imports) ----

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
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

import {
  getOrCreateLead,
  saveMessage,
  loadRecentMessages,
  makeIdempotencyKey,
} from "../src/db";

// ---- Helpers ----

const MOCK_LEAD = {
  id: "lead-uuid-1",
  whatsapp_number: "+51999888777",
  name: null,
  email: null,
  status: "new",
};

/**
 * Builds a chainable Supabase query mock.
 * - Chainable methods (.select, .insert, .eq, etc.) return the same object.
 * - Terminal methods (.single, .maybeSingle) resolve to `value`.
 * - Direct await also resolves to `value` via the thenable interface.
 */
function makeChain(value: { data?: unknown; error?: unknown } = {}) {
  const resolved = { data: null, error: null, ...value };
  const c: Record<string, unknown> = {};

  for (const fn of [
    "select",
    "insert",
    "upsert",
    "update",
    "eq",
    "neq",
    "in",
    "gt",
    "gte",
    "order",
    "limit",
  ]) {
    c[fn] = vi.fn().mockReturnValue(c);
  }

  c.single = vi.fn().mockResolvedValue(resolved);
  c.maybeSingle = vi.fn().mockResolvedValue(resolved);

  // Make the chain itself directly awaitable (for queries without terminal method).
  c.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(resolve, reject);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// getOrCreateLead
// ============================================================

describe("000-foundations: getOrCreateLead", () => {
  test("creates new lead with status='new' for unknown number", async () => {
    mockFrom.mockReturnValue(makeChain({ data: MOCK_LEAD, error: null }));

    const lead = await getOrCreateLead("+51999888777");

    expect(lead).toEqual(MOCK_LEAD);
    expect(mockFrom).toHaveBeenCalledWith("leads");
  });

  test("returns existing lead without duplicate when number already known (23505)", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: INSERT hits unique constraint
        return makeChain({ data: null, error: { code: "23505" } });
      }
      // Second call: SELECT existing lead
      return makeChain({ data: MOCK_LEAD, error: null });
    });

    const lead = await getOrCreateLead("+51999888777");

    expect(lead).toEqual(MOCK_LEAD);
    expect(callCount).toBe(2);
  });

  test("throws on non-23505 INSERT error", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: null, error: { code: "42501", message: "permission denied" } })
    );

    await expect(getOrCreateLead("+51999888777")).rejects.toBeTruthy();
  });

  test("throws when lead not found after 23505 conflict", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: { code: "23505" } });
      return makeChain({ data: null, error: { message: "not found" } });
    });

    await expect(getOrCreateLead("+51999888777")).rejects.toBeTruthy();
  });
});

// ============================================================
// saveMessage
// ============================================================

describe("000-foundations: saveMessage", () => {
  const MSG_INPUT = {
    leadId: "lead-uuid-1",
    wamid: "wamid.ABC123",
    role: "user" as const,
    content: "hola",
  };

  test("inserts message and returns void on success", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    await expect(saveMessage(MSG_INPUT)).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("messages");
  });

  test("throws exception when Supabase returns error", async () => {
    const dbErr = { code: "42P01", message: "relation does not exist" };
    mockFrom.mockReturnValue(makeChain({ error: dbErr }));

    await expect(saveMessage(MSG_INPUT)).rejects.toEqual(dbErr);
  });

  test("throws on wamid duplicate (23505 UniqueViolation)", async () => {
    const dupeErr = { code: "23505", message: "unique_violation" };
    mockFrom.mockReturnValue(makeChain({ error: dupeErr }));

    const err = await saveMessage({ ...MSG_INPUT, wamid: "wamid.DUP" }).catch((e) => e);

    expect(err.code).toBe("23505");
  });
});

// ============================================================
// loadRecentMessages
// ============================================================

describe("000-foundations: loadRecentMessages", () => {
  test("returns messages in chronological (ascending) order", async () => {
    // DB returns DESC — [newest, oldest]. reverse() makes it [oldest, newest].
    const dbRows = [
      { role: "assistant", content: "respuesta" },
      { role: "user", content: "hola" },
    ];
    mockFrom.mockReturnValue(makeChain({ data: dbRows, error: null }));

    const result = await loadRecentMessages("lead-uuid-1");

    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("hola");
    expect(result[1].role).toBe("assistant");
  });

  test("limits to N messages when more exist in DB", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      role: "user" as const,
      content: `msg ${i}`,
    }));
    const chain = makeChain({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    await loadRecentMessages("lead-uuid-1", 5);

    expect((chain as unknown as Record<string, ReturnType<typeof vi.fn>>).limit).toHaveBeenCalledWith(5);
  });

  test("excludes role='tool' (only queries user and assistant)", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await loadRecentMessages("lead-uuid-1");

    expect((chain as unknown as Record<string, ReturnType<typeof vi.fn>>).in).toHaveBeenCalledWith(
      "role",
      ["user", "assistant"]
    );
  });

  test("returns [] when Supabase returns error (logs but does not throw)", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "timeout" } }));

    const result = await loadRecentMessages("lead-uuid-1");

    expect(result).toEqual([]);
  });

  test("returns [] when data is null without error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await loadRecentMessages("lead-uuid-1");

    expect(result).toEqual([]);
  });
});

// ============================================================
// makeIdempotencyKey
// ============================================================

describe("000-foundations: makeIdempotencyKey", () => {
  test("same inputs produce same key", () => {
    const k1 = makeIdempotencyKey("lead-1", "consultar_bootcamp", { query: "precio" });
    const k2 = makeIdempotencyKey("lead-1", "consultar_bootcamp", { query: "precio" });

    expect(k1).toBe(k2);
  });

  test("different key order in input → same key (sorted before hashing)", () => {
    const k1 = makeIdempotencyKey("lead-1", "tool", { a: 1, b: 2 });
    const k2 = makeIdempotencyKey("lead-1", "tool", { b: 2, a: 1 });

    expect(k1).toBe(k2);
  });

  test("different leadId → different key", () => {
    const k1 = makeIdempotencyKey("lead-1", "tool", { q: "test" });
    const k2 = makeIdempotencyKey("lead-2", "tool", { q: "test" });

    expect(k1).not.toBe(k2);
  });

  test("different toolName → different key", () => {
    const k1 = makeIdempotencyKey("lead-1", "tool_a", { q: "test" });
    const k2 = makeIdempotencyKey("lead-1", "tool_b", { q: "test" });

    expect(k1).not.toBe(k2);
  });

  test("key is a 64-char hex string (SHA-256)", () => {
    const k = makeIdempotencyKey("lead-1", "tool", {});

    expect(k).toMatch(/^[a-f0-9]{64}$/);
  });
});
