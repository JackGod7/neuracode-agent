# ADR 006 — Mercado Pago Perú sobre Culqi

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
Mercado Pago Perú como gateway de pagos.

## Razones
- Acepta USD y PEN (Culqi solo PEN)
- Cuotas hasta 12 meses con tarjetas LATAM
- SDK Node oficial maduro
- Webhook robusto con header `x-idempotency-key`
- Comisión: 4.59% + IGV (Culqi 4.99% + IGV)

## Trade-off
UX del checkout es de MP, no white-label. Aceptable en Fase 0.

## Cuándo reconsiderar
- Si abrimos a otros países LATAM con preferencia local distinta
- Si necesitamos white-label total → Stripe Atlas (requiere LLC USA)
