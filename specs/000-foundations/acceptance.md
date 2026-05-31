# Acceptance — Feature 000: foundations

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |
| v1.1.0 | 2026-05-30 | Claude Code | implemented — tests pasan, verificado en prod |

## Tests automatizados

Ubicación: `tests/000-foundations.test.ts`

```typescript
describe("000-foundations: getOrCreateLead", () => {
  test("crea lead nuevo con status='new' para número desconocido");
  test("retorna lead existente sin crear duplicado para número conocido");
  test("upsert concurrente — 2 llamadas simultáneas al mismo número no lanzan excepción");
  test("upsert concurrente — exactamente 1 fila en leads al final");
});

describe("000-foundations: saveMessage", () => {
  test("inserta mensaje y retorna void en caso exitoso");
  test("lanza excepción cuando Supabase retorna error (stub)");
  test("lanza excepción en wamid duplicado (UniqueViolation)");
});

describe("000-foundations: loadRecentMessages", () => {
  test("retorna mensajes en orden cronológico ascendente");
  test("limita a N mensajes cuando hay más en DB");
  test("excluye mensajes con role='tool'");
  test("retorna [] si Supabase retorna error (log pero no throw)");
});

describe("000-foundations: startup env validation", () => {
  test("proceso sale con exit 1 si falta ANTHROPIC_API_KEY");
  test("proceso sale con exit 1 si falta MP_ACCESS_TOKEN");
  test("proceso sale con exit 1 si falta VERIFY_TOKEN");
  test("proceso sale con exit 1 si falta APP_SECRET");
  test("proceso sale con exit 1 si falta SUPABASE_URL");
  test("proceso sale con exit 1 si falta SUPABASE_SERVICE_KEY");
  test("proceso sale con exit 1 si falta WHATSAPP_TOKEN");
  test("proceso sale con exit 1 si falta PHONE_NUMBER_ID");
});
```

## Validación manual

- [x] `npm run typecheck` pasa sin errores
- [x] Crear lead con número nuevo → aparece en Supabase dashboard
- [x] Crear mismo lead dos veces → una sola fila en `leads`
- [x] Quitar `ANTHROPIC_API_KEY` del `.env` → `npm run dev` sale con mensaje fatal claro
- [x] Quitar `MP_ACCESS_TOKEN` del `.env` → `npm run dev` sale con mensaje fatal claro
- [x] Insertar mensaje en `messages` con `wamid` duplicado → excepción en logs, no silencio

## Definition of done

- [x] `getOrCreateLead` usa upsert (no SELECT+INSERT)
- [x] `saveMessage` lanza excepción en vez de swallow
- [x] Todas las env vars validadas en `index.ts` con `process.exit(1)`
- [x] Tests de concurrencia pasan (dos llamadas simultáneas → sin excepción)
- [x] Schema de DB migrado en Supabase (UNIQUE constraints activos)
- [x] `npm run typecheck` verde
- [x] PR mergeada a `main`
