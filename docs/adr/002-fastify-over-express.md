# ADR 002 — Fastify sobre Express

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
Fastify 5.x como framework HTTP.

## Razones
- 2-3x más rápido que Express bajo carga
- Tipado nativo de TypeScript (Express requiere @types)
- Parser de body custom necesario para validar firma de Meta — Fastify lo expone limpio
- Plugin system robusto (cuando vengan rate limits y CORS en Fase 2)

## Trade-off
Comunidad más chica que Express. Aceptable: documentación oficial es excelente.
