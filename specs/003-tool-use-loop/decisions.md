# Decisiones locales — Feature 003: tool-use-loop

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## D1: `max_tokens` → fallback explícito, no reintento

**Decisión**: cuando `stop_reason === "max_tokens"`, loggear `error` y enviar fallback al usuario: "Mi respuesta fue muy larga. ¿Puedes ser más específico?". No reintentar con `max_tokens` mayor.

**Alternativa rechazada**: reintentar con `max_tokens: 2048` o similar. Riesgo: respuestas muy largas para WhatsApp (límite 4096 chars por mensaje), costo de tokens duplicado, posible loop si Claude sigue siendo verboso.

**Trade-off**: usuario recibe fallback en vez de respuesta completa. Acción: aumentar `MAX_TOKENS` en `claude.ts` si esto ocurre frecuentemente en producción (actualmente 1024 — puede ser insuficiente para herramientas que devuelven contexto RAG extenso).

**Trazabilidad**: bug #5 del code-review audit 2026-05-30.

---

## D2: alternación user/assistant — reparar en vez de rechazar

**Decisión**: antes de llamar a la Claude API, validar que `messages` alterna roles. Si hay dos roles iguales consecutivos (e.g., `[user, user]`), fusionar los mensajes del mismo rol en uno solo (concatenar contenido con `\n\n`).

**Alternativa rechazada**: rechazar con error al lead ("hubo un error"). El problema de alternación ocurre por condiciones de carrera (dos mensajes en ráfaga) que el lead no controla — culparlos es mala UX.

**Alternativa rechazada**: descartar el mensaje más antiguo de los consecutivos. Pierde información del usuario.

**Trade-off**: fusionar es más complejo de implementar pero preserva el contexto. La fusión simple (join con `\n\n`) es suficiente para Fase 0.

**Excepción**: spec 005 (idempotencia) previene la mayoría de estos casos con wamid dedup. Esta reparación es una segunda línea de defensa.

**Trazabilidad**: bug #3 del code-review audit 2026-05-30.

---

## D3: loop exhaustion → log `error`, no `warn`

**Decisión**: cuando `iterations === MAX_TOOL_ITERATIONS` y el loop sale sin `end_turn`, loggear `level: "error"` con contexto completo (lead, wamid, número de iteraciones, última `stop_reason`).

**Alternativa rechazada**: `logger.warn` (comportamiento actual para stop_reason inesperado). `warn` se filtra en dashboards de Railway; `error` dispara alertas. El agotamiento del loop es un estado operacional anómalo que requiere intervención.

**Trade-off**: más ruido en logs si el system prompt es malo. Aceptable — mejor ruidoso que silencioso para bugs de producción.

**Trazabilidad**: bug #5 del code-review audit 2026-05-30.

---

## D4: spec 005 debe estar implementado ANTES de implementar spec 003

**Decisión**: no implementar ni deployar `handleIncomingMessage` hasta que la Capa 1 de idempotencia (wamid UNIQUE + dedup check) esté en producción.

**Razón**: sin dedup, Meta retries ejecutan el loop dos veces. Si el segundo retry llega mientras el primero aún procesa, se generan dos respuestas y potencialmente dos payment links. El doble cobro es el peor caso de negocio.

**Trazabilidad**: bug #1 (crítico) del code-review audit 2026-05-30. Violación del orden de implementación de CLAUDE.md.
