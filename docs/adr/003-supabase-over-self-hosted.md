# ADR 003 — Supabase sobre Postgres self-hosted

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
Supabase (managed) como Postgres + pgvector.

## Razones
- Free tier suficiente para Fase 0 y 1 (500MB DB, 2GB transfer)
- pgvector preinstalado
- Dashboard SQL editor → no instalas pgAdmin local
- Auth + Storage incluidos si los necesitamos después
- Backup automático

## Cuándo migrar a self-hosted
- Volumen excede free tier (probable en Fase 3, ~1000 leads activos)
- Compliance requiere data residency en Perú (caso banca regulada)
