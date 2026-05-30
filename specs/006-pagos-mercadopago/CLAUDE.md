# CLAUDE.md — Feature 006: pagos-mercadopago

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Scope

**Archivos a modificar**:
- `src/tools/generar_link_pago.ts` — ya implementado, solo fixes si se detectan bugs
- `src/index.ts` — agregar `POST /payments/webhook` handler (cuando se implemente)
- `supabase/schema.sql` — agregar `mp_webhook_log` si no existe (spec 005 la define)

**Archivos a NO tocar**:
- `src/tools/index.ts` — tool cache ya implementado en spec 005
- `knowledge/bootcamp.md` — si cambias precios en PRECIOS dict, actualizar también este archivo

## Contexto técnico

**SDK**: `mercadopago@^2.0.15`. API: `new Preference(mpClient).create({ body: {...} })`.

**`external_reference`**: se usa para identificar al lead cuando MP envía el webhook de confirmación. Formato actual: `leadId` (solo UUID). Ver D2.

**`notification_url`**: debe ser URL pública de Railway. En desarrollo local, MP no puede alcanzarla — usar ngrok o MP sandbox sin verificar webhook. Env var `BASE_URL` debe tener el dominio de Railway en producción.

**Webhook de MP** (cuando se implemente):
- MP envía `POST /payments/webhook` con `{ type: "payment", data: { id: "payment_id" } }`
- Verificar firma con header `x-signature` usando `MP_WEBHOOK_SECRET`
- Consultar `GET https://api.mercadopago.com/v1/payments/{id}` para verificar status
- Solo procesar si `payment.status === "approved"`
- Guardar en `mp_webhook_log` antes de cualquier acción (dedup)

## Trampas conocidas

- **`BASE_URL` sin configurar**: `notification_url` y `back_urls` quedan como `"undefined/payments/webhook"` — URL inválida. MP no puede notificar pagos. Agregar `BASE_URL` a la validación de env vars en `index.ts`.
- **MP Sandbox vs Producción**: el `MP_ACCESS_TOKEN` de sandbox empieza con `TEST-`. En producción empieza con otro prefijo. Verificar que el token de Railway es el de producción antes del Cohort 1.
- **`currency_id: "USD"`**: Mercado Pago Perú procesa USD para productos internacionales. Si en algún momento cambias a PEN, actualizar también `PRECIOS` dict y `knowledge/bootcamp.md`.
- **`mp_webhook_log` no está en `schema.sql`**: spec 005 la define en su CLAUDE.md. Ejecutar el SQL de spec 005 antes de implementar el webhook handler.
- **Precios en dos lugares**: `PRECIOS` en `generar_link_pago.ts` Y `knowledge/bootcamp.md`. Deben estar sincronizados. Si Claude lee el knowledge con un precio y el link de pago tiene otro, el lead se confunde.
