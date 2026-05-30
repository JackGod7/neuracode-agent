# Spec 001 — Webhook Meta

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented | Spec original. |
| v1.1.0 | 2026-05-30 | Claude Code | implemented | Agregado constraint `from`/`wamid` no-vacíos. Bug #9 del audit 2026-05-30. |

## Objetivo

Recibir mensajes de WhatsApp Cloud API de forma segura y confiable. Esta es la puerta de entrada al sistema.

## Por qué

Sin webhook funcional y verificado, no hay agente. Meta no entregará mensajes a un endpoint que no pase su handshake ni que no valide firma.

Es la **primera línea de defensa contra abuso**: cualquiera puede mandar POST a tu webhook si no validas firma, suplantando mensajes de usuarios reales.

## Alcance

### Incluye
- Endpoint `GET /webhook` para handshake de Meta
- Endpoint `POST /webhook` para recibir eventos
- Validación HMAC SHA256 contra `APP_SECRET`
- Respuesta `200 OK` síncrona (procesamiento async después)
- Logging estructurado de cada request (con/sin firma válida)
- Endpoint `GET /health` para healthcheck de Railway

### NO incluye
- Persistir mensajes (spec 005)
- Procesar el contenido (spec 003)
- Responder al usuario (spec 003)
- Manejar audio/imagen (spec 007)
- Rate limiting (Fase 3)

## Restricciones

| Constraint | Por qué |
|---|---|
| Responder a Meta en <2s | Meta reintenta a los 5s; queremos buffer |
| Logger debe ser estructurado (JSON) | Railway parsea logs JSON, facilita búsqueda |
| Validación de firma con `timingSafeEqual` | Evitar timing attacks |
| No usar `body-parser` ni `express.raw` | Fastify nativo es más rápido y tiene el parser custom |
| El handler POST nunca debe tirar excepción al cliente | Meta marca el endpoint como inestable si recibe 5xx repetidos |
| `from` y `wamid` deben ser strings no vacíos antes de procesar | Meta puede entregar status updates con estructura de mensaje pero sin `from`/`id` válidos; procesarlos causaría leads con número vacío y wamid inútil como clave de dedup |

## No-objetivos

- Procesar audios o imágenes
- Implementar reintentos hacia Meta (Meta es quien reintenta hacia nosotros)
- Soporte para múltiples números (multi-tenancy) — Fase 3

## Dependencias

- `fastify@5.x`
- `crypto` (built-in)
- `pino@9.x` (vía `src/logger.ts`)

## Variables de entorno requeridas

```
VERIFY_TOKEN          # string aleatorio inventado por ti
WHATSAPP_TOKEN        # access token de Meta
PHONE_NUMBER_ID       # Phone Number ID de Meta
APP_SECRET            # App Secret de Meta (para HMAC)
GRAPH_API_VERSION     # default v21.0
PORT                  # default 3000
```

## Diagrama de flujo

```
Meta Cloud API
     │
     │ POST /webhook
     │ headers: x-hub-signature-256
     │ body: { entry: [{ changes: [{ value: { messages: [...] } }] }] }
     ▼
[1] Validar firma HMAC
     │
     ├─ inválida → 403 Forbidden + log warn
     │
     └─ válida → [2] Responder 200 OK
                      │
                      ▼ (async, fire-and-forget)
                 [3] Extraer mensaje
                      │
                      ├─ no es 'text' → log info y termina
                      │
                      └─ es 'text' → [4] log info con { from, wamid, text }
                                          └─ TODO: pasar a spec 003 (Claude loop)
```

Ver `acceptance.md` para criterios testeables.
