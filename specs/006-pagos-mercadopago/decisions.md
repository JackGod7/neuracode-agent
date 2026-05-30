# Decisiones locales — Feature 006: pagos-mercadopago

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## D1: Mercado Pago Perú — `mercadopago@^2.0.15` SDK

**Decisión**: usar Mercado Pago como pasarela de pago. ADR 006 en `docs/adr/` documenta la elección sobre Stripe/PayU.

**Razón principal**: Mercado Pago tiene penetración en Perú y LATAM regulado. El cliente objetivo (banca, seguros) puede pagar con tarjeta local. Stripe requiere cuenta internacional y tiene fricción adicional.

## D2: `external_reference = leadId`

**Decisión**: usar el UUID del lead como `external_reference` en la preference de MP.

**Alternativa rechazada**: `external_reference = leadId + ":" + producto`. Más específico pero complica el parsing en el webhook handler.

**Trade-off**: con solo `leadId`, si el lead genera links para dos productos distintos, el webhook de confirmación solo conoce el leadId — hay que consultar `payment_links` para saber cuál producto fue el que pagó. Simple en Fase 0.

## D3: Precios en USD, hardcodeados en `PRECIOS` dict

**Decisión**: los precios viven en `generar_link_pago.ts` en el objeto `PRECIOS`. Si cambian, actualizar código Y `knowledge/bootcamp.md`.

**Alternativa rechazada**: precios en Supabase con tabla `products`. Exceso para Fase 0 con 3 productos estáticos.

**Constraint**: `PRECIOS` en código y `knowledge/bootcamp.md` DEBEN estar sincronizados. Si el agente consulta el knowledge y responde un precio diferente al que genera el link de pago, crea desconfianza en el lead.

## D4: Webhook de confirmación de MP — no implementado en Fase 0

**Decisión**: el handler `POST /payments/webhook` está en scope de esta spec pero no implementado. En Fase 0, Jack verifica pagos manualmente en el dashboard de MP.

**Razón**: implementar el webhook requiere verificar el `x-signature` de MP, consultar la API de MP para validar el payment, y actualizar el lead. Es ~2 días de trabajo adicional. Con <10 pagos/mes esperados en el cohort inicial, la verificación manual es aceptable.

**Condición de implementación**: implementar el webhook antes del Cohort 1 (inicio 13 jul 2026). Sin él, Jack actualiza `lead.status = "paid"` manualmente en Supabase.

## D5: Idempotencia de links — Capa 2 (tool_call_cache) es suficiente en Fase 0

**Decisión**: no implementar dedup adicional en `generar_link_pago` más allá del tool_call_cache de 60s.

**Razón**: el mayor riesgo de doble link es un retry de Claude dentro del mismo turn (< 60s). El tool_call_cache cubre ese caso. Para retries después de 60s, el lead recibiría un segundo link — confuso pero no catastrófico (el primer link sigue siendo válido por 30 días en MP).

**Condición de revisión**: si se observan dos `payment_links` activos para el mismo lead+producto, implementar check en DB antes de crear nueva preference.
