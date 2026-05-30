# CLAUDE.md — Feature 001: Webhook Meta

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |
| v1.1.0 | 2026-05-30 | Claude Code | implemented — trampa from/wamid vacío agregada |

## Scope de archivos

**Archivos que vas a modificar**:
- `src/index.ts` — handlers GET y POST `/webhook`
- `src/whatsapp.ts` — cliente Graph API (solo lo necesario para esta feature)
- `src/logger.ts` — instanciado, no modificar la API pública

**Archivos que NO tocas en esta feature**:
- `src/claude.ts` — la integración con Claude se trata en spec 003
- `src/db.ts` — persistencia se trata en spec 005
- `src/tools/*` — tools individuales en spec 004

## Contexto técnico

Meta Cloud API hace 2 cosas con el webhook:

1. **Handshake inicial (GET)**: envía `hub.mode`, `hub.verify_token`, `hub.challenge`. Debes devolver el `challenge` solo si el token coincide con `VERIFY_TOKEN`.

2. **Eventos (POST)**: envía notifications con estructura `entry[].changes[].value.messages[]`. Debes:
   - Validar firma HMAC SHA256 con `APP_SECRET`
   - Responder `200 OK` **antes de procesar** (Meta reintenta si tardas >5s)
   - Extraer `from`, `id` (wamid), `type`, `text.body`

## Trampas conocidas

- **`x-hub-signature-256` viene en header con prefijo `sha256=`** — no olvides el prefijo al comparar.
- **El raw body se necesita para validar firma**. Fastify por defecto parsea JSON y pierde el raw. Usa el `addContentTypeParser` que ya está en `src/index.ts`.
- **`timingSafeEqual` tira si los buffers tienen distinto largo**. Envolver en try/catch.
- **Status updates también llegan al webhook** (delivered, read, sent). Filtrar antes de procesar.
- **`from` y `wamid` pueden ser strings vacíos** en algunos payloads de Meta. Validar `if (!from || !wamid)` antes de llamar a `handleIncomingMessage` — sin este guard se crea un lead con número vacío y la clave de dedup queda rota.

## Lo que NO va a esta feature

- Procesamiento de audio/imagen → spec 007
- Persistencia del mensaje en Postgres → spec 005
- Llamar a Claude → spec 003
- Tool calls → spec 004

Esta feature termina cuando el webhook recibe un mensaje, lo loggea, y responde 200. Nada más.
