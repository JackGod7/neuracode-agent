# Spec 005 — Idempotencia

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | **pendiente de implementar** | Spec correcto. No implementado — orden de CLAUDE.md violado. Bug #1 (crítico) del audit 2026-05-30 trazado aquí. Implementar ANTES de spec 003. |

## Objetivo

Garantizar que cada operación con efecto externo (responder a WhatsApp, generar link de pago, inscribir webinar, escalar a Jack) se ejecuta **una sola vez** aunque reciba la misma entrada N veces.

## Por qué

Tres fuentes de duplicación reales:

1. **Meta reintenta** webhooks si no recibe 200 en 5s o si recibe 5xx. Mismo `wamid` puede llegar 2-3 veces.
2. **Mercado Pago reintenta** webhooks de pago hasta 8 veces con backoff exponencial.
3. **Claude puede invocar la misma tool dos veces** en un loop si malinterpreta el resultado del primer call.

Sin idempotencia: cliente recibe la respuesta duplicada, link de pago duplicado, lead inscrito 3 veces, Jack notificado N veces. Pérdida de confianza inmediata.

## Estrategia: 3 capas

### Capa 1 — Webhook layer (`wamid` único)

Cada mensaje de WhatsApp tiene un ID único llamado `wamid` (ej: `wamid.HBgLNTE5...`). Lo usamos como clave de deduplicación.

**Implementación**:
- Tabla `messages` tiene `wamid` con `UNIQUE` constraint
- Al recibir un POST, antes de procesar: `INSERT INTO messages(wamid, ...)`. Si choca con UniqueViolation → ya procesado → salimos sin error
- TTL: 30 días (luego se purga)

### Capa 2 — Tool call layer (idempotency key derivado)

Cada tool call genera un hash determinístico del input + lead_id + tool_name. Si el mismo hash aparece dentro de 60s, devolvemos el resultado cacheado.

**Implementación**:
- Tabla `tool_call_cache` con columnas: `idempotency_key` (PK), `tool_name`, `result_jsonb`, `created_at`
- Antes de ejecutar tool: buscar por key. Si existe y `created_at > NOW() - INTERVAL '60 seconds'` → devolver cache
- Si no existe: ejecutar tool, insertar resultado, devolver

### Capa 3 — External effects layer (idempotency keys explícitos)

Para llamadas a APIs externas que cambian estado:

- **Mercado Pago**: usar `external_reference = "{lead_id}:{tool_call_id}"`. MP garantiza una sola preferencia por external_reference activo.
- **WhatsApp Cloud API**: enviar mensaje con `biz_opaque_callback_data = "{conversation_id}:{turn_id}"` para tracing, pero Meta no garantiza dedup desde el lado nuestro — solo nosotros podemos prevenir doble-send con la Capa 2.
- **Webhooks entrantes de Mercado Pago**: header `x-idempotency-key` viene con cada retry. Tabla `mp_webhook_log` con UNIQUE constraint sobre ese key.

## Restricciones

- No usar Redis en Fase 0 → idempotencia en Postgres
- TTL de cache de tools: 60 segundos (suficiente para retries del loop)
- TTL de wamid log: 30 días (cumple ventana de 24h de WhatsApp con margen)
- Si una tool falla, su resultado NO se cachea (debe poder reintentar)

## No-objetivos

- Exactly-once delivery distribuida (eso requiere Sagas o transaction logs, exceso para Fase 0)
- Idempotencia entre instancias múltiples de Railway (Fase 0 corre un solo proceso)

## Diagrama

```
                    ┌─────────────────┐
POST /webhook ────▶ │ Capa 1: wamid   │
                    │ UNIQUE en DB    │
                    └────────┬────────┘
                             │ nuevo
                             ▼
                    ┌─────────────────┐
                    │ Claude tool use │
                    │ loop            │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Capa 2: hash    │
                    │ tool_call_cache │
                    └────────┬────────┘
                             │ nuevo
                             ▼
                    ┌─────────────────┐
                    │ Capa 3:         │
                    │ external API    │  ──▶ Mercado Pago / Meta
                    │ + idempotency   │
                    │   key explícito │
                    └─────────────────┘
```

Ver `acceptance.md` para tests específicos.
