# CLAUDE.md — Feature 005: Idempotencia

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Scope

**Archivos a modificar**:
- `src/index.ts` — check de `wamid` antes de procesar
- `src/claude.ts` — invocar `executeTool` con idempotency key
- `src/tools/index.ts` — wrapper `executeTool` consulta `tool_call_cache`
- `src/db.ts` — funciones `getCachedToolResult`, `cacheToolResult`, `markWamidProcessed`
- `supabase/schema.sql` — agregar tablas `tool_call_cache`, `mp_webhook_log`

**Archivos a NO tocar**:
- Las tools individuales (`src/tools/*.ts`) no saben de cache, el wrapper lo maneja

## Función `idempotencyKey(leadId, toolName, input)`

```typescript
import crypto from "crypto";

function idempotencyKey(leadId: string, toolName: string, input: object): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return crypto
    .createHash("sha256")
    .update(`${leadId}:${toolName}:${normalized}`)
    .digest("hex");
}
```

**Nota**: ordenar las keys del input es crítico — distintos órdenes producen hashes distintos pero representan el mismo call.

## Schema adicional

```sql
create table if not exists tool_call_cache (
  idempotency_key text primary key,
  lead_id uuid references leads(id) on delete cascade,
  tool_name text not null,
  result jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_tool_cache_created on tool_call_cache(created_at);

create table if not exists mp_webhook_log (
  idempotency_key text primary key,
  payload jsonb,
  processed_at timestamptz default now()
);
```

Job de limpieza (Fase 1): purgar `tool_call_cache` con `created_at < NOW() - INTERVAL '24 hours'`.

## Trampas

- **`ON CONFLICT DO NOTHING`** es el patrón para Capa 1. NO uses `SELECT then INSERT` (race condition).
- **No cachear errores** — si la tool tira, no insertes en `tool_call_cache`. Permite retry legítimo.
- **El cache es por-conversación, no global** — el `lead_id` debe estar en el key, o un mismo "consultar precio" entre leads diferentes se contaminaría.
