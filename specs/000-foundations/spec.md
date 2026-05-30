# Spec 000 — foundations

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft | Spec inicial — generado desde audit de code-review. Bugs #2 y #3 del audit trazados aquí. |

## Objetivo

Establecer la capa de infraestructura base: cliente Supabase, validación de env vars en startup, esquema de DB y las queries core (`getOrCreateLead`, `saveMessage`, `loadRecentMessages`).

## Por qué

Sin foundations sólidas, todos los features que vienen encima (webhook, Claude loop, tools) fallan de formas opacas. La validación de env vars en startup y las queries atómicas de DB son la red de seguridad del sistema.

## Alcance

### Incluye
- Validación de env vars requeridas al arrancar (`fail-fast` con mensaje claro)
- Cliente Supabase (`src/db.ts`) con `persistSession: false`
- `getOrCreateLead(whatsappNumber)` — **upsert atómico**, nunca SELECT+INSERT
- `saveMessage(input)` — inserta mensaje; **debe lanzar excepción** si falla (no swallow)
- `loadRecentMessages(leadId, limit)` — últimos N mensajes en orden cronológico
- `updateLead(leadId, patch)` — actualización parcial con error propagado
- Esquema de DB: tablas `leads`, `messages`, `webinar_signups`, `payment_links`, `tool_call_cache`

### NO incluye
- Lógica de negocio (spec 003, 004)
- Idempotencia por wamid (spec 005 — se construye sobre este capa)
- Embeddings / pgvector (spec 002)
- Webhook HTTP (spec 001)

## Restricciones

| Constraint | Por qué |
|---|---|
| `getOrCreateLead` usa `upsert` con `onConflict('whatsapp_number')` | SELECT+INSERT tiene race condition cuando Meta reintenta el mismo webhook — dos inserts concurrentes chocan con unique constraint y el segundo mensaje se pierde |
| `saveMessage` lanza excepción si el insert falla | El caller (`claude.ts`) depende del éxito para que el mensaje esté en historial. Swallow silencioso → Claude responde sin ver el mensaje del usuario → conversación rota |
| `loadRecentMessages` retorna solo roles `user` y `assistant` | Claude API rechaza roles desconocidos en el array messages |
| Toda validación de env vars en `src/index.ts` antes de importar módulos que las usen | Si `whatsapp.ts` lanza en import-time, el error no es capturado por el startup check de `index.ts` |
| Usar `SUPABASE_SERVICE_KEY` (no `anon key`) | Service key bypasa RLS — necesario para writes desde el servidor |

## No-objetivos

- Tipado generado automáticamente (`supabase gen types`) — Fase 1 post-cliente-cero
- Soft delete de conversations
- Múltiples conversaciones por lead (siempre `conversation_id = lead_id` en Fase 0)

## Dependencias

- Spec(s) previas: ninguna (este es el primero)
- Librerías: `@supabase/supabase-js@^2`
- Supabase project con tablas migradas (ver `supabase/migrations/`)

## Esquema de DB requerido

```sql
-- leads: una fila por número de WhatsApp
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text UNIQUE NOT NULL,   -- UNIQUE requerido para upsert
  name text,
  email text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- messages: historial de conversación
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES leads(id),
  wamid text UNIQUE,                       -- UNIQUE para idempotencia (spec 005)
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content text NOT NULL,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz DEFAULT now()
);
```

> **Nota**: el `UNIQUE` en `wamid` es la base de la Capa 1 de spec 005. Este constraint debe existir antes de implementar spec 005.
