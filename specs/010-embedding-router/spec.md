# Spec 010 — embedding-router

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-06-01 | Claude Code | draft | Spec inicial — multi-provider embeddings con Strategy + Chain of Responsibility |

## Objetivo

Abstraer el proveedor de embeddings detrás de una interfaz `EmbeddingProvider` para que el agente pueda usar OpenAI, Gemini, u otros proveedores de forma intercambiable, con fallback automático y columnas dedicadas por proveedor en pgvector.

## Por qué

OpenAI tiene cuotas/costos variables; Gemini tiene créditos disponibles ahora. Sin abstracción, cambiar de proveedor requiere modificar `rag.ts`, `ingest.ts` y el schema — alto riesgo de regresión. Con el router, cambiar proveedor = cambiar config. Además, columnas separadas por provider permiten comparar calidad de retrieval en paralelo y elegir el mejor para producción.

## Alcance

### Incluye
- `src/embeddings/provider.ts` — interface `EmbeddingProvider` y tipo `EmbeddingConfig`
- `src/embeddings/openai.ts` — `OpenAIEmbeddingProvider` (adapter existente)
- `src/embeddings/gemini.ts` — `GeminiEmbeddingProvider` (nuevo)
- `src/embeddings/chain.ts` — `FallbackChain`: intenta providers en orden, retorna primer éxito
- `src/embeddings/index.ts` — factory que construye el chain desde env vars
- `src/rag.ts` — refactor para usar `EmbeddingProvider` en vez de openai directo
- `scripts/ingest.ts` — refactor para usar `EmbeddingProvider`
- `supabase/schema.sql` — agregar `embedding_768 vector(768)`, columna `provider_used text`, actualizar RPC `match_knowledge` para aceptar `provider` param
- `.env.example` — `GEMINI_API_KEY`, `EMBEDDING_PROVIDER_ORDER`

### NO incluye
- UI para comparar providers — análisis manual en Supabase dashboard
- Reranking cross-provider — Fase 2
- Fine-tuning de modelos de embedding
- Cambiar el modelo de Claude (lectura de imágenes es scope distinto)

## Restricciones

| Constraint | Por qué |
|---|---|
| Cada provider tiene su propia columna en `knowledge` (`embedding_1536`, `embedding_768`) | pgvector requiere dimensión fija por columna — no se puede mezclar |
| La columna `provider_used` registra qué provider generó el embedding activo | Al buscar, hay que usar el mismo provider que ingresó |
| `EMBEDDING_PROVIDER_ORDER=gemini,openai` define el orden del chain | Variable de entorno — cambiable sin redeploy |
| Si todos los providers del chain fallan, `searchKnowledge` retorna `[]` (no lanza) | Comportamiento heredado de spec 002 — degradación amigable |
| Re-ingest obligatorio al cambiar provider principal | Los embeddings existentes son de OpenAI (1536 dims) — incompatibles con Gemini (768 dims) |
| Gemini model: `gemini-embedding-001` (768 dims) | `text-embedding-004` no disponible en AI Studio free tier — `gemini-embedding-001` es el reemplazo estable con mismas dims |

## No-objetivos

- Comparación automática de calidad entre providers (A/B testing automatizado)
- Multi-tenant: cada cliente con su provider — Fase 3
- Streaming de embeddings

## Dependencias

- Spec 002 (rag-knowledge) implementado
- `GEMINI_API_KEY` en env
- `@google/generative-ai` SDK
- `EMBEDDING_PROVIDER_ORDER` env (opcional, default `openai`)
