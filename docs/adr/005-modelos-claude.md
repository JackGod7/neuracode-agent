# ADR 005 — Modelos Claude: Sonnet 4.6 + Haiku 4.5

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
- `claude-sonnet-4-6`: razonamiento principal (tool use, respuestas a leads)
- `claude-haiku-4-5-20251001`: clasificación rápida y barata (intent detection)

## Razones
- Sonnet 4.6: balance calidad/costo para conversación B2B
- Haiku 4.5: ~7x más barato, suficiente para clasificar intent ("es pregunta de precio?")

## Cuándo cambiar
- Opus 4.7/4.8 si Sonnet falla en casos complejos de tool use múltiple
- Haiku solo si latencia <500ms es crítica
