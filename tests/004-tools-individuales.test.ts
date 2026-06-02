import { describe, test, expect, vi, beforeEach } from "vitest";

// ---- Hoisted mocks ----

const mockSearchKnowledge = vi.hoisted(() => vi.fn());
const mockFormatMatchesAsContext = vi.hoisted(() => vi.fn());
const mockUpdateLead = vi.hoisted(() => vi.fn());
const mockSupabaseFrom = vi.hoisted(() => vi.fn());
const mockSendWhatsAppMessage = vi.hoisted(() => vi.fn());
const mockMpPreferencesCreate = vi.hoisted(() => vi.fn());

vi.mock("../src/rag", () => ({
  searchKnowledge: mockSearchKnowledge,
  formatMatchesAsContext: mockFormatMatchesAsContext,
}));

vi.mock("../src/db", () => ({
  supabase: { from: mockSupabaseFrom },
  updateLead: mockUpdateLead,
}));

vi.mock("../src/whatsapp", () => ({
  sendWhatsAppMessage: mockSendWhatsAppMessage,
}));

vi.mock("../src/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
  Preference: vi.fn().mockImplementation(() => ({
    create: mockMpPreferencesCreate,
  })),
}));

// ---- Helpers ----

function makeInsertChain(error: unknown = null) {
  const chain = { insert: vi.fn(), upsert: vi.fn(), update: vi.fn(), eq: vi.fn() };
  chain.insert.mockReturnValue({ error });
  chain.upsert.mockReturnValue({ error });
  chain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) });
  mockSupabaseFrom.mockReturnValue(chain);
  return chain;
}

const LEAD_CTX = { leadId: "lead-uuid-123", from: "+51987654321", whatsappNumber: "+51987654321" };

// ---- consultar_bootcamp ----

describe("consultar_bootcamp", () => {
  beforeEach(() => vi.clearAllMocks());

  test("retorna context con matches cuando knowledge tiene datos", async () => {
    const { consultarBootcamp } = await import("../src/tools/consultar_bootcamp.js");
    const matches = [{ id: "1", source: "bootcamp", title: "bootcamp #1", content: "USD 1497", similarity: 0.9 }];
    mockSearchKnowledge.mockResolvedValue(matches);
    mockFormatMatchesAsContext.mockReturnValue("[Fuente 1: bootcamp — bootcamp #1]\nUSD 1497");

    const result = await consultarBootcamp({ query: "precio VIP" }, LEAD_CTX);

    expect(result).toMatchObject({ matches: 1 });
    expect(result.context).toContain("bootcamp");
  });

  test("retorna context vacío cuando no hay matches", async () => {
    const { consultarBootcamp } = await import("../src/tools/consultar_bootcamp.js");
    mockSearchKnowledge.mockResolvedValue([]);
    mockFormatMatchesAsContext.mockReturnValue("(sin información en la base de conocimiento)");

    const result = await consultarBootcamp({ query: "certificación GCP" }, LEAD_CTX);

    expect(result.context).toBe("(sin información en la base de conocimiento)");
    expect(result.matches).toBe(0);
  });
});

// ---- inscribir_webinar ----

describe("inscribir_webinar", () => {
  beforeEach(() => vi.clearAllMocks());

  test("email inválido → { ok: false } sin tocar DB", async () => {
    const { inscribirWebinar } = await import("../src/tools/inscribir_webinar.js");

    const result = await inscribirWebinar(
      { nombre: "Ana", email: "noesunEmail", webinar: "W1" },
      LEAD_CTX
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/email/i);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  test("email válido → upsert en webinar_signups y actualiza lead", async () => {
    const { inscribirWebinar } = await import("../src/tools/inscribir_webinar.js");
    makeInsertChain(null);
    mockUpdateLead.mockResolvedValue(undefined);

    const result = await inscribirWebinar(
      { nombre: "Ana Ramos", email: "ana@banco.pe", webinar: "W1" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
    expect(mockUpdateLead).toHaveBeenCalledWith(
      LEAD_CTX.leadId,
      expect.objectContaining({ email: "ana@banco.pe", name: "Ana Ramos" })
    );
  });

  test("inscripción duplicada (upsert) → retorna ok:true sin duplicar", async () => {
    const { inscribirWebinar } = await import("../src/tools/inscribir_webinar.js");
    makeInsertChain(null);
    mockUpdateLead.mockResolvedValue(undefined);

    const result = await inscribirWebinar(
      { nombre: "Ana", email: "ana@banco.pe", webinar: "W2" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
  });
});

// ---- agendar_call ----

describe("agendar_call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateLead.mockResolvedValue(undefined);
  });

  test("urgencia='alta' → lead status='hot'", async () => {
    const { agendarCall } = await import("../src/tools/agendar_call.js");

    await agendarCall({ motivo: "quiere comprar VIP", urgencia: "alta" }, LEAD_CTX);

    expect(mockUpdateLead).toHaveBeenCalledWith(
      LEAD_CTX.leadId,
      expect.objectContaining({ status: "hot" })
    );
  });

  test("urgencia='media' → lead status='qualified'", async () => {
    const { agendarCall } = await import("../src/tools/agendar_call.js");

    await agendarCall({ motivo: "duda técnica", urgencia: "media" }, LEAD_CTX);

    expect(mockUpdateLead).toHaveBeenCalledWith(
      LEAD_CTX.leadId,
      expect.objectContaining({ status: "qualified" })
    );
  });

  test("urgencia='baja' → lead status='qualified'", async () => {
    const { agendarCall } = await import("../src/tools/agendar_call.js");

    await agendarCall({ motivo: "explorar opciones", urgencia: "baja" }, LEAD_CTX);

    expect(mockUpdateLead).toHaveBeenCalledWith(
      LEAD_CTX.leadId,
      expect.objectContaining({ status: "qualified" })
    );
  });

  test("CAL_LINK no configurado → usa default cal.com/jack-aguilar", async () => {
    delete process.env.CAL_LINK;
    const { agendarCall } = await import("../src/tools/agendar_call.js");

    const result = await agendarCall({ motivo: "consulta", urgencia: "baja" }, LEAD_CTX);

    expect(result.link).toContain("cal.com/jack-aguilar");
  });
});

// ---- escalar_a_jack ----

describe("escalar_a_jack", () => {
  beforeEach(() => vi.clearAllMocks());

  test("JACK_WHATSAPP ausente → no llama sendWhatsAppMessage, retorna ok:true", async () => {
    delete process.env.JACK_WHATSAPP;
    mockUpdateLead.mockResolvedValue(undefined);
    const { escalarAJack } = await import("../src/tools/escalar_a_jack.js");

    const result = await escalarAJack(
      { razon: "lead agresivo", contexto: "...", prioridad: "urgente" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  test("JACK_WHATSAPP presente → llama sendWhatsAppMessage con alerta formateada", async () => {
    process.env.JACK_WHATSAPP = "+51900000000";
    mockUpdateLead.mockResolvedValue(undefined);
    mockSendWhatsAppMessage.mockResolvedValue(undefined);
    const { escalarAJack } = await import("../src/tools/escalar_a_jack.js");

    const result = await escalarAJack(
      { razon: "lead agresivo", contexto: "amenaza", prioridad: "urgente" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
    expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(
      "+51900000000",
      expect.stringContaining("lead agresivo")
    );
  });

  test("updateLead falla → excepción sube sin swallow", async () => {
    mockUpdateLead.mockRejectedValue(new Error("DB timeout"));
    const { escalarAJack } = await import("../src/tools/escalar_a_jack.js");

    await expect(
      escalarAJack({ razon: "error", contexto: "", prioridad: "normal" }, LEAD_CTX)
    ).rejects.toThrow("DB timeout");

    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });
});

// ---- generar_link_pago ----

describe("generar_link_pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MP_ACCESS_TOKEN = "TEST_TOKEN";
    process.env.BASE_URL = "https://test.railway.app";
  });

  test("producto='enterprise' → { ok: false } sin llamar a MP", async () => {
    const { generarLinkPago } = await import("../src/tools/generar_link_pago.js");

    const result = await generarLinkPago(
      { producto: "enterprise", nombre: "Carlos" },
      LEAD_CTX
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/agendar_call/i);
    expect(mockMpPreferencesCreate).not.toHaveBeenCalled();
  });

  test("producto='cohort' → crea preference MP con unit_price=597", async () => {
    const { generarLinkPago } = await import("../src/tools/generar_link_pago.js");
    mockMpPreferencesCreate.mockResolvedValue({ init_point: "https://mpago.la/abc" });
    makeInsertChain(null);

    const result = await generarLinkPago(
      { producto: "cohort", nombre: "Carlos" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
    expect(result.link).toContain("mpago.la");
    expect(mockMpPreferencesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ unit_price: 597 }),
          ]),
        }),
      })
    );
  });

  test("producto='vip' → crea preference MP con unit_price=1497", async () => {
    const { generarLinkPago } = await import("../src/tools/generar_link_pago.js");
    mockMpPreferencesCreate.mockResolvedValue({ init_point: "https://mpago.la/xyz" });
    makeInsertChain(null);

    const result = await generarLinkPago(
      { producto: "vip", nombre: "María" },
      LEAD_CTX
    );

    expect(result.ok).toBe(true);
    expect(mockMpPreferencesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ unit_price: 1497 }),
          ]),
        }),
      })
    );
  });

  test("MP retorna error → { ok: false, message incluye escalar_a_jack }", async () => {
    const { generarLinkPago } = await import("../src/tools/generar_link_pago.js");
    mockMpPreferencesCreate.mockRejectedValue(new Error("401 Unauthorized"));

    const result = await generarLinkPago(
      { producto: "cohort", nombre: "Carlos" },
      LEAD_CTX
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/escalar_a_jack/i);
  });
});
