# Acceptance — Feature 004: tools-individuales

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## Tests automatizados

Ubicación: `tests/004-tools-individuales.test.ts`

```typescript
describe("consultar_bootcamp", () => {
  test("retorna context con matches cuando knowledge tiene datos");
  test("retorna context vacío cuando no hay matches");
});

describe("inscribir_webinar", () => {
  test("email inválido → { ok: false } sin tocar DB");
  test("email válido → inserta en webinar_signups y actualiza lead");
  test("inscripción duplicada (upsert) → no crea segunda fila");
});

describe("agendar_call", () => {
  test("urgencia='alta' → lead status='hot'");
  test("urgencia='media' → lead status='qualified'");
  test("urgencia='baja' → lead status='qualified'");
  test("CAL_LINK no configurado → usa default cal.com/jack-aguilar");
});

describe("escalar_a_jack", () => {
  test("JACK_WHATSAPP ausente → no llama a sendWhatsAppMessage, retorna ok:true");
  test("JACK_WHATSAPP presente → llama a sendWhatsAppMessage con alerta formateada");
  test("updateLead falla → excepción sube a executeTool (no swallow)");
});

describe("generar_link_pago", () => {
  test("producto='enterprise' → { ok: false } sin llamar a MP");
  test("producto='cohort' → crea preference MP con unit_price=597");
  test("producto='vip' → crea preference MP con unit_price=1497");
  test("MP retorna error → { ok: false, message: '...escalar_a_jack...' }");
});
```

## Validación manual

- [ ] Mandar al agente "¿cuánto cuesta el bootcamp?" → invoca `consultar_bootcamp`, responde con precio real
- [ ] Dar nombre + email + webinar → agente invoca `inscribir_webinar`, fila en `webinar_signups`
- [ ] "Quiero hablar con Jack" → agente invoca `agendar_call`, retorna link Cal.com
- [ ] Confirmar compra de "cohort" → agente invoca `generar_link_pago`, link de MP en respuesta
- [ ] Insultar al agente → invoca `escalar_a_jack`, Jack recibe WhatsApp (si `JACK_WHATSAPP` está configurado)
- [ ] En Supabase: verificar que lead status cambia según las tools

## Definition of done

- [ ] Las 5 tools pasan sus tests unitarios
- [ ] `agendar_call` urgencia="alta" → status="hot" (no "qualified")
- [ ] `escalar_a_jack` actualiza DB antes de notificar a Jack
- [ ] `generar_link_pago` rechaza "enterprise" sin llamar a MP
- [ ] `inscribir_webinar` valida email antes de tocar DB
- [ ] `executeTool` aplica tool_call_cache (spec 005) en todas las tools
- [ ] `npm run typecheck` verde
- [ ] PR mergeada a main
