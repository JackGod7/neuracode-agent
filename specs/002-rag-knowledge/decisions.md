# Decisiones locales — Feature 002: rag-knowledge

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## D1: OpenAI `text-embedding-3-small` (1536 dims)

**Decisión**: usar `text-embedding-3-small` de OpenAI para embeddings de ingest y búsqueda.

**Alternativa rechazada**: Voyage AI `voyage-3-lite`, Cohere Embed, embeddings nativos de Supabase. OpenAI ya es dependencia (api key disponible). Agregar otro proveedor aumenta superficie de fallo.

**Constraint crítico**: el modelo en `ingest.ts` y en `rag.ts` DEBEN ser idénticos. Cambiar el modelo requiere re-ingest completo — los vectores de distintos modelos no son comparables.

**Trade-off**: `text-embedding-3-small` cuesta ~USD 0.02/M tokens. Para el volumen de Fase 0 (5 archivos, ~500 chunks), el costo de ingest completo es < USD 0.01.

## D2: Chunk size = 500 chars, overlap = 50

**Decisión**: sliding window simple de 500 chars con 50 de overlap.

**Alternativa rechazada**: chunking semántico por headers markdown (`## Sección`). Más inteligente pero requiere parser y lógica de decisión sobre tamaño mínimo de chunk.

**Trade-off**: chunks pueden cortar en medio de una oración. El overlap de 50 chars mitiga el corte en el borde. Aceptable para Fase 0 con contenido editorial denso.

## D3: DELETE total en ingest, no diferencial

**Decisión**: `ingest.ts` borra TODA la tabla `knowledge` antes de re-insertar.

**Alternativa rechazada**: diff-based ingest (hash por archivo, solo re-embeber lo que cambió).

**Riesgo asumido**: ventana de ~30s donde la tabla está vacía. Si ingest falla a mitad, el agente responde "sin información" hasta el próximo ingest exitoso. Mitigación en Fase 1: transacción + ingesta diferencial.

## D4: `searchKnowledge` retorna `[]` en error, no lanza

**Decisión**: en cualquier error (OpenAI timeout, Supabase RPC falla), `searchKnowledge` loggea `error` y retorna `[]`.

**Trade-off**: con `[]`, `formatMatchesAsContext` retorna "(sin información en la base de conocimiento)". Claude puede responder "no tengo información actualizada, te recomiendo escribirle a Jack". Degradación amigable sin romper el turn del usuario.

**Alternativa rechazada**: lanzar excepción. Si la búsqueda falla y se propaga, el turn completo de Claude falla → usuario recibe "tuve un problema procesando tu mensaje" — peor UX.

## D5: `match_count` default = 4

**Decisión**: 4 chunks por defecto.

**Razón**: 4 × ~500 chars = ~2000 chars de contexto RAG. Con MAX_TOKENS=1024 y system prompt de ~1500 chars, cabe holgadamente en Claude Sonnet (200K context). Suficiente para responder preguntas de precio/fecha/contenido.
