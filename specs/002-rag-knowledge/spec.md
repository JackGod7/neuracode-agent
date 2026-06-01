# Spec 002 — rag-knowledge

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented | Spec inicial desde código existente. |

## Objetivo

Indexar el knowledge base de Neuracode en Supabase pgvector y exponerlo como búsqueda semántica para que el agente responda con datos reales en vez de alucinar.

## Por qué

Sin RAG el agente inventaría precios, fechas y detalles del bootcamp. Con RAG, cualquier pregunta sobre producto pasa por `consultar_bootcamp` que busca en la base de conocimiento real. Los 5 archivos `knowledge/*.md` son la fuente de verdad.

## Alcance

### Incluye
- `scripts/ingest.ts` — lee `knowledge/*.md`, chunkea, embebe con OpenAI, carga a Supabase
- `src/rag.ts` — `searchKnowledge(query, options)` y `formatMatchesAsContext(matches)`
- Tabla `knowledge` en Supabase con columna `embedding vector(1536)`
- RPC `match_knowledge(query_embedding, match_count, filter_source)` en Postgres
- Trigger de ingest vía GitHub Actions al pushear `knowledge/**` a main

### NO incluye
- Cache de queries (Redis/LRU) — Fase 2
- Hybrid search (vector + full-text ts_vector) — Fase 2
- Re-ranking con Claude Haiku — Fase 2
- Ingesta diferencial (solo re-embeber chunks modificados) — Fase 1
- Edición de los archivos `knowledge/*.md` — responsabilidad de Jack, no del agente

## Restricciones

| Constraint | Por qué |
|---|---|
| Modelo: `text-embedding-3-small` (1536 dims) | Mismo modelo en ingest y búsqueda — si difieren, los vectores son incompatibles |
| `CHUNK_SIZE = 500` chars, `CHUNK_OVERLAP = 50` | Chunks pequeños → más precisión; overlap evita perder contexto en cortes |
| `match_count` default = 4 | Suficiente contexto sin saturar el context window de Claude |
| Ingest hace DELETE total antes de re-insertar | Fase 0: simplicidad sobre diferencial; ver D3 para riesgo de ventana vacía |
| `searchKnowledge` retorna `[]` en error, no lanza | Degradación amigable: Claude dice "sin info" en vez de crashear el turn |
| Fuentes válidas: `bootcamp`, `webinars`, `gh600`, `neuracode`, `faqs` | Enum fijo para filtrado; el nombre del archivo .md determina el source |

## No-objetivos

- Chunking semántico por headers markdown — Fase 1
- Multi-tenancy de knowledge bases
- Fine-tuning del modelo de embeddings

## Dependencias

- Spec 000 implementado (cliente Supabase)
- `OPENAI_API_KEY` validado en `index.ts`
- `EMBEDDING_MODEL` env (opcional, default `text-embedding-3-small`)
- Extension `vector` habilitada en proyecto Supabase
- RPC `match_knowledge` deployada vía Supabase SQL Editor
