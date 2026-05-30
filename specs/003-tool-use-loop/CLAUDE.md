# CLAUDE.md — Feature 003: tool-use-loop

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Scope

**Archivos a modificar**:
- `src/claude.ts` — único archivo de este spec

**Archivos a NO tocar**:
- `src/tools/` (scope de spec 004)
- `src/db.ts` (scope de spec 000 — debe estar ya corregido antes de implementar esto)
- `src/index.ts` (scope de spec 001)

## Prerrequisitos obligatorios antes de tocar código

1. Spec 005 (idempotencia) implementado y con tests pasando
2. Spec 000 (foundations) corregido: `saveMessage` que throw, `getOrCreateLead` con upsert

## Contexto técnico

**Alternación user/assistant**: Claude API requiere que el array `messages` alterne estrictamente. Si `loadRecentMessages` retorna `[u, u, a]`, hay que fusionar los dos mensajes `user` consecutivos en uno (join con `\n\n`) antes de enviar.

**stop_reason handling obligatorio**:
- `end_turn` / `stop_sequence` → break, persistir, enviar
- `tool_use` → ejecutar tools, continuar loop
- `max_tokens` → `logger.error(...)`, break, enviar fallback específico ("Mi respuesta fue muy larga...")
- cualquier otro → `logger.warn(...)`, break, enviar fallback genérico

**Loop exhaustion**: cuando `iterations === MAX_TOOL_ITERATIONS` y `stop_reason` sigue siendo `tool_use`, el loop sale en la próxima evaluación de `while`. Loggear `error` con `{ iterations, leadId, wamid }`.

**saveMessage para respuesta asistente**: si falla, loggear `error` pero NO relanzar — el usuario ya recibió la respuesta por WhatsApp. Perder la persistencia es malo pero no debe bloquear al usuario.

**saveMessage para mensaje de usuario**: si falla, SÍ relanzar — sin el mensaje en DB, Claude no tiene contexto. El webhook handler capturará y loggeará.

## Trampas conocidas

- `response.content.find(b => b.type === "text")` puede retornar `undefined` si Claude solo emite tool_use blocks en un turn con `end_turn`. Validar antes de acceder a `.text`.
- `MAX_TOKENS: 1024` puede ser insuficiente cuando `consultar_bootcamp` devuelve contexto RAG extenso. Si `max_tokens` ocurre frecuentemente en staging, aumentar a 2048.
- El `messages` array en memoria durante el loop NO se persiste — solo el mensaje de usuario (inicio) y el texto final del asistente (al final). Los tool_use y tool_result intermedios son efímeros.
