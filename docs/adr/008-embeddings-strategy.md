# ADR 008 — Embeddings: OpenAI text-embedding-3-small

**Status**: Accepted | **Date**: 2026-05-30

## Contexto

RAG requiere embeddings vectoriales para ingestar `knowledge/*.md` y buscar por similaridad semántica. Anthropic no ofrece API de embeddings propia. El stack canónico (ADR 001–007) no cubría esta capa.

## Decisión

Usar `text-embedding-3-small` de OpenAI para ingesta (`scripts/ingest.ts`) y búsqueda (`src/rag.ts`).

Requiere `OPENAI_API_KEY` como variable de entorno adicional.

## Alternativas evaluadas

| Opción | Por qué no |
|---|---|
| Cohere Embed v3 | Segunda dependencia de pago sin ventaja clara sobre OAI |
| Ollama (local) | Railway no soporta GPU; embeddings CPU son lentos en Fase 0 |
| pgvector full-text (tsvector) | No semántico — no encuentra "precio" si el usuario escribe "cuánto cuesta" |
| Voyage AI (Anthropic-adjacent) | Mejor para código; overkill para knowledge base en español |

## Trade-offs aceptados

- Dependencia adicional a OpenAI (segunda API key, segundo proveedor)
- Costo marginal: ~$0.02 por millón de tokens — insignificante en Fase 0
- Vendor split intencional: Anthropic para razonamiento, OpenAI solo para embeddings

## Cuándo revisar

- Anthropic lanza API de embeddings propia → migrar para unificar proveedor
- `knowledge/` supera 500 archivos → evaluar ingesta diferencial (ADR separado)
- Latencia de `searchKnowledge()` > 200ms → considerar cache LRU (ya documentado como TODO en `src/rag.ts`)
