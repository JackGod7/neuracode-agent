# Spec 006 — pagos-mercadopago

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft | Spec inicial. Webhook de confirmación de pago NO implementado — pendiente. |

## Objetivo

Integrar Mercado Pago Perú para que el agente genere links de pago y el sistema registre cuando un lead completa la compra del bootcamp.

## Por qué

Sin pagos integrados, Jack debe generar links manualmente y no hay forma automática de saber quién pagó. Con la integración, el agente genera el link en segundos y el webhook de MP actualiza el lead a `status="paid"` automáticamente.

## Alcance

### Incluye
- `src/tools/generar_link_pago.ts` — crea preference en MP con items, external_reference, back_urls
- Tabla `payment_links` — log de links generados con status (pending/paid/expired)
- Tabla `mp_webhook_log` — dedup de webhooks de MP (spec 005 Capa 3)
- `POST /payments/webhook` — endpoint que recibe notificaciones de MP y actualiza `payment_links` y lead status **[PENDIENTE de implementar]**

### NO incluye
- Refunds / devoluciones — manual por ahora
- Pagos en cuotas — MP lo maneja del lado del comprador, no requiere código adicional
- Múltiples monedas (solo USD) — Mercado Pago Perú acepta USD para productos internacionales
- Notificación por email al completar pago — Fase 2

## Restricciones

| Constraint | Por qué |
|---|---|
| `MP_ACCESS_TOKEN` validado en startup con `process.exit(1)` | Sin token, `generar_link_pago` falla silenciosamente con 401 — inaceptable en path de revenue |
| `external_reference = leadId` | Permite identificar al lead cuando MP envía el webhook de confirmación |
| `notification_url = BASE_URL + "/payments/webhook"` | MP llama a este endpoint al confirmar el pago — debe ser URL pública |
| Tier "enterprise" → redirigir a `agendar_call`, no generar link | Enterprise se cotiza 1:1, no tiene precio fijo |
| Webhook de MP tiene idempotencia vía `mp_webhook_log` (spec 005 Capa 3) | MP reintenta hasta 8 veces con backoff — sin dedup, el lead quedaría "paid" N veces con N actualizaciones redundantes |

## No-objetivos

- Implementar checkout propio (usamos la checkout de MP)
- Manejar disputas y chargebacks (manual)
- Webhooks de MP en tiempo real < 1s (los reintentos de MP pueden tardar minutos)

## Dependencias

- Spec 000 (DB: payment_links, leads)
- Spec 005 (idempotencia: mp_webhook_log para Capa 3)
- Spec 004 (tools: generar_link_pago es una tool)
- `MP_ACCESS_TOKEN` en env (Mercado Pago Perú, production access token)
- `BASE_URL` en env (URL pública de Railway, para notification_url y back_urls)
- `mercadopago@^2.0.15` SDK

## Estado de implementación

| Componente | Estado |
|---|---|
| `generar_link_pago.ts` — crea preference | ✅ implementado |
| `payment_links` tabla | ✅ en schema.sql |
| `mp_webhook_log` tabla | ⚠️ falta en schema.sql (spec 005 la define) |
| `POST /payments/webhook` handler | ❌ **no implementado** |
| Actualización de lead a status="paid" | ❌ depende del webhook |
