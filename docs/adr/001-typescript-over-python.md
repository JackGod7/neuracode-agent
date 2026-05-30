# ADR 001 — TypeScript sobre Python

**Status**: Accepted | **Date**: 2026-05-30

## Decisión
TypeScript estricto + Node 20 como lenguaje único del proyecto.

## Razones
- Tu stack actual (Claude Code, MCP, repo neuracode-ceo-copilot) ya es TS
- WhatsApp Cloud API y Anthropic SDK tienen first-class support en JS/TS
- Un solo lenguaje en todo Neuracode reduce carga cognitiva
- Tipado fuerte en webhooks de Meta (objetos anidados con campos opcionales) previene bugs

## Cuándo reconsiderar
- Si vas a hacer fine-tuning, eval pipelines complejos, o ML batch → Python en repo separado
- Si embeddings locales con sentence-transformers se vuelven críticos
