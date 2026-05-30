# Decisiones locales — Feature 005: Idempotencia

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## D1: Capa 1 usa INSERT ... ON CONFLICT DO NOTHING, no SELECT + check

**Decisión**: el dedup de wamid se implementa intentando el INSERT del mensaje primero. Si `UniqueViolation` (`23505`) → wamid ya procesado → salir sin error. No hacer SELECT previo.

**Alternativa rechazada**: `SELECT wamid FROM messages WHERE wamid = $1` antes de procesar. Tiene la misma race condition que `getOrCreateLead`: dos webhooks simultáneos ambos ven null, ambos procesan. El INSERT atómico elimina la ventana de race.

**Implementación**: en `processWebhook` de `index.ts`, antes de llamar `handleIncomingMessage`, hacer el INSERT early del mensaje de usuario con `onConflict: 'wamid', ignoreDuplicates: true`. Si Supabase retorna `null` (conflicto ignorado) → `return` inmediato.

**Trade-off**: el mensaje se inserta con datos mínimos primero (wamid, role, leadId provisional), luego se actualiza si es necesario. Alternativamente, la inserción completa ocurre en `saveMessage` de `claude.ts` — en ese caso el check de duplicado debe hacerse antes. Ver CLAUDE.md de esta spec para el patrón exacto.

**Trazabilidad**: bug #1 (crítico) del code-review audit 2026-05-30.

---

## D2: idempotency key del cache de tools incluye `lead_id`

**Decisión**: `sha256(leadId + ":" + toolName + ":" + JSON.stringify(input, sortedKeys))`.

**Alternativa rechazada**: hash solo de `toolName + input` sin `leadId`. Si dos leads distintos hacen la misma consulta (e.g., "precio del bootcamp"), el cache del lead A respondería al lead B con los mismos datos. Para `consultar_bootcamp` el resultado sería igual, pero para `inscribir_webinar` o `agendar_call` el contexto es diferente por lead. Incluir `leadId` es más seguro.

**Trade-off**: menos reutilización de cache entre leads (cada lead tiene su propio cache). Aceptable — el TTL es 60s y el ahorro principal es contra retries del mismo lead, no cross-lead.

---

## D3: TTL de tool cache = 60 segundos, no parametrizable en Fase 0

**Decisión**: hardcodear 60 segundos. No usar env var ni config.

**Razón**: Meta reintenta dentro de un período corto (5-20s inicialmente). 60s cubre holgadamente cualquier retry del mismo turno de conversación. Más de 60s podría devolver datos stale de una DB que cambió (e.g., cupos de webinar actualizados).

**Alternativa rechazada**: TTL configurable por tool (consultar_bootcamp puede tolerar más, inscribir_webinar menos). Exceso de complejidad para Fase 0.

---

## D4: errores de tools NO se cachean

**Decisión**: si `executeTool` captura una excepción, retorna `{ error: "..." }` a Claude pero NO inserta en `tool_call_cache`.

**Razón**: un error puede ser transitorio (timeout de DB, rate limit de OpenAI). Si lo cacheas, Claude recibirá el error por 60s aunque la causa ya haya desaparecido. Las retries legítimas deben poder ejecutarse.

**Excepción conocida**: si Claude está en loop y llama la misma tool fallida 5 veces, igual agota `MAX_TOOL_ITERATIONS`. Spec 003 maneja ese caso con fallback y log error.

---

## D5: Capa 3 (MP external_reference) se cubre por Capa 2, no implementación adicional en Fase 0

**Decisión**: para `generar_link_pago`, la Capa 2 (tool cache) es suficiente protección en Fase 0. Un retry de Claude dentro de 60s retorna el `init_point` cacheado sin llamar a MP por segunda vez. No implementar lógica adicional de dedup en MP en Fase 0.

**Condición de revisión**: si en producción se observan dos preferences en MP dashboard para el mismo lead+producto, implementar `external_reference` único y `SELECT` en tabla `payment_links` antes de crear nueva preference.

**Trazabilidad**: bug #1 del audit — el doble pago es el worst case. La Capa 2 lo previene para retries de Claude. El retry de Meta (Capa 1) lo previene a nivel de webhook.
