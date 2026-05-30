# Spec 003 — tool-use-loop

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft | Spec inicial — generado desde audit. Bugs #3, #4, #5, #7 del audit trazados aquí. |

## Objetivo

Implementar el loop de tool use con el Anthropic SDK: recibe un mensaje de usuario, mantiene historial, invoca Claude, ejecuta tools hasta `end_turn`, y persiste la respuesta.

## Por qué

Sin este loop, el agente no puede responder. Sin los constraints de esta spec, el loop produce duplicados, rompe el contrato de alternación de Claude API, o falla silenciosamente sin que nadie lo sepa.

## Alcance

### Incluye
- `handleIncomingMessage({ from, wamid, text })` en `src/claude.ts`
- Carga de historial reciente desde Supabase (últimos 20 turnos user/assistant)
- Loop `while (iterations < MAX_TOOL_ITERATIONS)` con manejo explícito de todos los `stop_reason`
- Ejecución secuencial de tool_use blocks y colección de tool_results
- Persistencia del mensaje de usuario **antes** de cargar historial
- Persistencia de la respuesta del asistente **después** de enviar a WhatsApp
- Fallback de error visible al usuario cuando el loop no produce texto

### NO incluye
- Deduplicación por wamid (spec 005 — **debe estar implementado antes**)
- Rate limiting / backoff hacia Anthropic API (Fase 2)
- Streaming de respuesta (Fase 2)
- Tool call cache (spec 005 Capa 2)
- Carga de historial completo (más de 20 mensajes) — fuera de scope Fase 0

## Restricciones

| Constraint | Por qué |
|---|---|
| Spec 005 (idempotencia) debe estar implementado **antes** de este feature | Sin wamid dedup, Meta retries ejecutan el loop dos veces → doble respuesta, doble pago |
| `saveMessage` para el mensaje de usuario debe propagar error (throw) | Si swallows, `loadRecentMessages` no encontrará el mensaje → Claude responde sin contexto del turno actual |
| El array `messages` enviado a Claude debe respetar alternación estricta user/assistant | Claude API retorna 400 si hay dos roles iguales consecutivos. El historial cargado de DB puede tener este problema si mensajes llegaron en ráfaga |
| `stop_reason === "max_tokens"` debe manejarse explícitamente | Sin manejo, cae al logger.warn + break y `finalText` queda vacío → usuario recibe fallback genérico sin diagnóstico |
| `stop_reason === "max_tokens"` NO reintenta — envía fallback con log `error` | Reintentar con `max_tokens` más alto puede generar respuestas no acotadas. Fase 0: pedir al usuario que simplifique |
| Loop exhaustion (`iterations === MAX_TOOL_ITERATIONS`) debe loggear `error`, no `warn` | Es un estado anómalo que requiere atención del operador |
| `finalText` vacío → fallback amigable + log `error` | Nunca dejar al usuario sin respuesta, pero siempre alertar al operador |
| Alternación validada antes de llamar a Claude API | Si el historial ya tiene roles consecutivos iguales, truncar o reparar antes de enviar |

## Comportamiento esperado por `stop_reason`

| stop_reason | Acción |
|---|---|
| `end_turn` | Extraer texto, break, persistir, enviar |
| `stop_sequence` | Igual que `end_turn` |
| `tool_use` | Ejecutar tools, agregar tool_results, continuar loop |
| `max_tokens` | Log `error`, break, enviar fallback al usuario |
| cualquier otro | Log `warn` con el valor, break, enviar fallback |

## No-objetivos

- Exactly-once delivery (depende de spec 005)
- Contexto > 20 mensajes (truncation strategy Fase 1)
- Multi-agent (spec 008)

## Dependencias

- **spec 005** implementado (idempotencia — Capa 1 y Capa 2)
- **spec 000** implementado (foundations, DB, saveMessage que throw)
- **spec 001** implementado (webhook entrega mensajes aquí)
- `@anthropic-ai/sdk@^0.32`
- `ANTHROPIC_API_KEY` en env
- `CLAUDE_MODEL` (opcional, default `claude-sonnet-4-6`)
