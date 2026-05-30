# ADR 007 — Railway como plataforma de deploy

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
Railway para hosting de producción.

## Razones
- Deploy desde GitHub automático
- ~$5/mes para Fase 0
- Variables de entorno UI-managed
- Healthcheck nativo
- Logs estructurados visibles en dashboard
- Healthcheck path: `/health`

## Cuándo migrar
- Volumen genera costos >$50/mes → considerar Fly.io o VPS
- Compliance requiere infraestructura propia → migrar a OCI o AWS con Terraform
