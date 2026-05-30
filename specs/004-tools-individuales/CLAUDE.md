# CLAUDE.md — Feature 004: tools-individuales

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Scope

**Archivos a modificar**:
- `src/tools/consultar_bootcamp.ts`
- `src/tools/inscribir_webinar.ts`
- `src/tools/agendar_call.ts`
- `src/tools/generar_link_pago.ts`
- `src/tools/escalar_a_jack.ts`
- `src/tools/index.ts` — registry y executeTool con cache (spec 005)

**Archivos a NO tocar**:
- `src/claude.ts` — scope de spec 003
- `src/db.ts` — scope de spec 000 (ya corregido)
- `src/rag.ts` — scope de spec 002

## Contexto técnico

**`executeTool` ya aplica idempotencia** (spec 005 Capa 2 implementada): antes de invocar cualquier handler, consulta `tool_call_cache` por hash de input. Si hay hit, retorna cached. Cada tool individual NO necesita implementar cache — el wrapper lo hace.

**Orden en `escalar_a_jack`**: `updateLead` → `sendWhatsAppMessage`. Si `updateLead` lanza, la excepción sube a `executeTool` (que la convierte en `{ error: "..." }`) y Jack NO es notificado. Gap conocido, documentado en decisions D3.

**`inscribir_webinar`**: tiene dos imports de `../db` (`supabase` y `updateLead`) en líneas separadas — limpieza pendiente, no es bug.

## Trampas conocidas

- **`agendar_call` urgencia="alta"**: antes tenía ternario muerto `"qualified":"qualified"`. Ya corregido → `"hot":"qualified"`. No revertir.
- **`generar_link_pago` `external_reference = ctx.leadId`**: si el mismo lead genera dos links para el mismo producto, MP crea dos preferences con el mismo `external_reference`. La Capa 2 de idempotencia (tool_call_cache, 60s TTL) previene esto para retries de Claude. Para duplicados después de 60s, ver spec 006 D5.
- **`escalar_a_jack` sin `JACK_WHATSAPP`**: retorna `{ ok: true }` aunque no notificó. Claude interpreta esto como éxito y le dice al lead "ya avisé a Jack" — técnicamente mentira. Aceptado en Fase 0.
- **`BASE_URL` env en `generar_link_pago`**: si no está, las `back_urls` y `notification_url` de MP quedan como `undefined/pago/ok` — URLs inválidas. Agregar `BASE_URL` a la lista de env vars validadas en `index.ts`.
