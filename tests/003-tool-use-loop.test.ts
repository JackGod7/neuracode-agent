import { describe, test, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

vi.mock("../src/db", () => ({
  getOrCreateLead: vi.fn(),
  saveMessage: vi.fn(),
  loadRecentMessages: vi.fn(),
}));

vi.mock("../src/tools", () => ({
  TOOLS: [],
  executeTool: vi.fn(),
}));

vi.mock("../src/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn(),
  markAsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/system_prompt", () => ({
  SYSTEM_PROMPT: "Test system prompt.",
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

import { handleIncomingMessage } from "../src/claude";
import { getOrCreateLead, saveMessage, loadRecentMessages } from "../src/db";
import { executeTool } from "../src/tools";
import { sendWhatsAppMessage } from "../src/whatsapp";
import { logger } from "../src/logger";

// ---- Fixtures ----

const MOCK_LEAD = {
  id: "lead-uuid",
  whatsapp_number: "+51999888777",
  name: null,
  email: null,
  status: "new",
};

const INCOMING = {
  from: "+51999888777",
  wamid: "wamid.ABC123",
  text: "hola",
};

// ---- Response builders ----

function endTurnResponse(text: string) {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text }],
  };
}

function toolUseResponse(id: string, name: string, input: Record<string, unknown>) {
  return {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id, name, input }],
  };
}

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrCreateLead).mockResolvedValue(MOCK_LEAD);
  vi.mocked(saveMessage).mockResolvedValue(undefined);
  vi.mocked(loadRecentMessages).mockResolvedValue([]);
  vi.mocked(sendWhatsAppMessage).mockResolvedValue(undefined);
});

// ============================================================
// Happy path
// ============================================================

describe("003-tool-use-loop: happy path", () => {
  test("simple message → Claude end_turn → text sent via WhatsApp", async () => {
    mockMessagesCreate.mockResolvedValue(endTurnResponse("Hola, ¿cómo te puedo ayudar?"));

    await handleIncomingMessage(INCOMING);

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "+51999888777",
      "Hola, ¿cómo te puedo ayudar?"
    );
  });

  test("tool_use → end_turn → tool executed, final response sent", async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(toolUseResponse("tool-1", "consultar_bootcamp", { query: "precio" }))
      .mockResolvedValueOnce(endTurnResponse("El bootcamp VIP cuesta S/1500"));
    vi.mocked(executeTool).mockResolvedValue("Precio: S/1500");

    await handleIncomingMessage(INCOMING);

    expect(executeTool).toHaveBeenCalledWith(
      "consultar_bootcamp",
      { query: "precio" },
      { leadId: "lead-uuid", whatsappNumber: "+51999888777" }
    );
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "+51999888777",
      "El bootcamp VIP cuesta S/1500"
    );
  });

  test("two consecutive tool calls → both executed → final response sent", async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(toolUseResponse("t1", "consultar_bootcamp", { query: "precio" }))
      .mockResolvedValueOnce(toolUseResponse("t2", "inscribir_webinar", { webinar: "W1" }))
      .mockResolvedValueOnce(endTurnResponse("Listo, te inscribí"));
    vi.mocked(executeTool).mockResolvedValue("ok");

    await handleIncomingMessage(INCOMING);

    expect(executeTool).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+51999888777", "Listo, te inscribí");
  });

  test("user message and assistant response are persisted", async () => {
    mockMessagesCreate.mockResolvedValue(endTurnResponse("ok"));

    await handleIncomingMessage(INCOMING);

    expect(saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "hola", wamid: "wamid.ABC123" })
    );
    expect(saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", content: "ok", wamid: null })
    );
  });
});

// ============================================================
// stop_reason handling
// ============================================================

describe("003-tool-use-loop: stop_reason handling", () => {
  test("stop_reason='max_tokens' → logger.error + specific fallback, no retry", async () => {
    mockMessagesCreate.mockResolvedValue({ stop_reason: "max_tokens", content: [] });

    await handleIncomingMessage(INCOMING);

    expect(logger.error).toHaveBeenCalled();
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1); // no retry
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "+51999888777",
      expect.stringMatching(/larga|concret/i)
    );
  });

  test("stop_reason='stop_sequence' → treated as end_turn", async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: "stop_sequence",
      content: [{ type: "text", text: "respuesta final" }],
    });

    await handleIncomingMessage(INCOMING);

    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+51999888777", "respuesta final");
  });

  test("unknown stop_reason → logger.warn + generic fallback", async () => {
    mockMessagesCreate.mockResolvedValue({ stop_reason: "weird_stop", content: [] });

    await handleIncomingMessage(INCOMING);

    expect(logger.warn).toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "+51999888777",
      expect.stringMatching(/problema|reformul/i)
    );
  });

  test("MAX_TOOL_ITERATIONS exhausted → logger.error + fallback, no exception", async () => {
    // Always returns tool_use — never reaches end_turn
    mockMessagesCreate.mockResolvedValue(toolUseResponse("t", "consultar_bootcamp", {}));
    vi.mocked(executeTool).mockResolvedValue("result");

    await expect(handleIncomingMessage(INCOMING)).resolves.not.toThrow();

    expect(logger.error).toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "+51999888777",
      expect.stringMatching(/problema|reformul/i)
    );
  });
});

// ============================================================
// Alternación user/assistant
// ============================================================

describe("003-tool-use-loop: user/assistant alternation", () => {
  test("clean history [u,a,u,a] → Claude API called without error", async () => {
    vi.mocked(loadRecentMessages).mockResolvedValue([
      { role: "user", content: "msg 1" },
      { role: "assistant", content: "resp 1" },
      { role: "user", content: "msg 2" },
      { role: "assistant", content: "resp 2" },
    ]);
    mockMessagesCreate.mockResolvedValue(endTurnResponse("ok"));

    await handleIncomingMessage(INCOMING);

    const callArgs = mockMessagesCreate.mock.calls[0][0] as {
      messages: Array<{ role: string }>;
    };
    for (let i = 1; i < callArgs.messages.length; i++) {
      expect(callArgs.messages[i].role).not.toBe(callArgs.messages[i - 1].role);
    }
  });

  test("history [u,u,a] → consecutive user messages merged before sending", async () => {
    vi.mocked(loadRecentMessages).mockResolvedValue([
      { role: "user", content: "primer mensaje" },
      { role: "user", content: "segundo mensaje" },
      { role: "assistant", content: "respuesta" },
    ]);
    mockMessagesCreate.mockResolvedValue(endTurnResponse("ok"));

    await handleIncomingMessage(INCOMING);

    const callArgs = mockMessagesCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    // No consecutive same roles after repair
    for (let i = 1; i < callArgs.messages.length; i++) {
      expect(callArgs.messages[i].role).not.toBe(callArgs.messages[i - 1].role);
    }
    // Merged content contains both messages
    const mergedUser = callArgs.messages.find(
      (m) => m.role === "user" && m.content.includes("primer") && m.content.includes("segundo")
    );
    expect(mergedUser).toBeDefined();
  });
});

// ============================================================
// saveMessage error handling
// ============================================================

describe("003-tool-use-loop: saveMessage error handling", () => {
  test("saveMessage 23505 on user message → returns early without calling Claude", async () => {
    vi.mocked(saveMessage).mockRejectedValueOnce({ code: "23505" });

    await handleIncomingMessage(INCOMING);

    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  test("saveMessage non-23505 on user message → propagates error", async () => {
    vi.mocked(saveMessage).mockRejectedValueOnce(new Error("DB down"));

    await expect(handleIncomingMessage(INCOMING)).rejects.toThrow("DB down");
  });

  test("saveMessage fails for assistant response → logged but user already got reply", async () => {
    mockMessagesCreate.mockResolvedValue(endTurnResponse("respuesta ok"));
    vi.mocked(saveMessage)
      .mockResolvedValueOnce(undefined) // user message succeeds
      .mockRejectedValueOnce(new Error("insert failed")); // assistant persist fails

    await handleIncomingMessage(INCOMING);

    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+51999888777", "respuesta ok");
    expect(logger.error).toHaveBeenCalled();
  });
});
