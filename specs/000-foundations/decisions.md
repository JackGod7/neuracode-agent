# Decisiones locales — Feature 000: foundations

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## D1: upsert atómico en `getOrCreateLead` en vez de SELECT + INSERT

**Decisión**: usar `supabase.from('leads').upsert({ whatsapp_number }, { onConflict: 'whatsapp_number', ignoreDuplicates: false }).select().single()`.

**Alternativa rechazada**: SELECT primero, INSERT si null. Esta es la implementación inicial que existe en el código — tiene race condition documentada: dos webhooks concurrentes del mismo número ambos pasan el SELECT (retorna null para los dos), ambos intentan INSERT, el segundo falla con `23505 unique_violation`, la excepción sube y el mensaje del segundo webhook se pierde silenciosamente.

**Trade-off**: el upsert es ligeramente más complejo de leer pero elimina la clase de bug. En Postgres, `INSERT ... ON CONFLICT DO UPDATE` es atómico. No hay ventana de race.

**Trazabilidad**: bug #2 del code-review audit 2026-05-30.

---

## D2: `saveMessage` lanza excepción en vez de swallow silencioso

**Decisión**: `if (error) throw error` — propagar siempre el error de Supabase al caller.

**Alternativa rechazada**: `if (error) logger.error(...)` solo — comportamiento actual. Swallow silencioso significa que el caller no sabe si el mensaje fue persistido. Si falla, `loadRecentMessages` no verá el mensaje → Claude responde sin el contexto del turno actual → conversación rota sin alerta.

**Trade-off**: el caller debe manejar el error. En `claude.ts`, un saveMessage fallido para el mensaje de usuario debe abortar el procesamiento (no responder). Para el mensaje del asistente, debe loggear error pero puede continuar (el mensaje ya se envió por WhatsApp). Esa distinción la maneja el caller.

**Excepción conocida**: cuando spec 005 implementa dedup por wamid, un `UniqueViolation` en `saveMessage` es la señal de "ya procesado" — el caller lo captura y retorna sin error. saveMessage sigue lanzando, spec 005 la interpreta.

**Trazabilidad**: bug #3 y #4 del code-review audit 2026-05-30.

---

## D3: validación de env vars centralizada en `src/index.ts` antes de cualquier import

**Decisión**: todas las env vars requeridas (incluyendo `MP_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`, `JACK_WHATSAPP`) se validan en `index.ts` con `process.exit(1)` antes de que los módulos dependientes se inicialicen.

**Alternativa rechazada**: validar en cada módulo con `throw new Error(...)` en el nivel top-level del módulo (comportamiento actual de `whatsapp.ts`). Problema: el throw ocurre durante la carga del módulo, antes del try/catch de startup en `index.ts`. El proceso crashea con stack trace sin el mensaje amigable del logger.

**Trade-off**: centralizar requiere que `index.ts` conozca todas las vars. Es un trade-off de acoplamiento aceptable — `index.ts` ya es el entry point.

**Trazabilidad**: bug #6 del code-review audit 2026-05-30.
