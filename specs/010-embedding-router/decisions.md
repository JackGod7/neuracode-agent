# Decisiones locales — Feature 010: embedding-router

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-06-01 | Claude Code | draft |

## D1: Strategy Pattern + Adapter por provider

**Decisión**: cada provider implementa la interfaz `EmbeddingProvider { embed(text): Promise<number[]>, dimensions: number, name: string }`. `rag.ts` e `ingest.ts` solo hablan con esta interfaz.

**Alternativa rechazada**: `if (provider === "openai") ... else if (provider === "gemini")`. Añadir un tercer provider requeriría modificar `rag.ts` e `ingest.ts` — viola Open/Closed.

**Trade-off**: más archivos, pero cada provider es aislado y testeable independientemente.

---

## D2: Chain of Responsibility para fallback

**Decisión**: `FallbackChain(providers[])` itera en orden; si un provider lanza, loggea warn y pasa al siguiente. Si todos fallan, loggea error y retorna `null` (el caller convierte a `[]`).

**Alternativa rechazada**: fallback dentro de cada adapter. Viola Single Responsibility — el adapter no debe saber de otros providers.

**Trade-off**: `FallbackChain` es un objeto más, pero el comportamiento de fallback está centralizado y testeable en aislamiento.

---

## D3: Columnas separadas por dimensión en pgvector

**Decisión**: `embedding_1536 vector(1536)` para OpenAI, `embedding_768 vector(768)` para Gemini. Columna `provider_used text` registra cuál se usó en el último ingest.

**Alternativa rechazada**: una sola columna `embedding vector(1536)` y truncar/padear Gemini a 1536. Truncar vectores destroza la similitud coseno — matemáticamente inválido.

**Alternativa rechazada**: tabla `knowledge_embeddings(chunk_id, provider, embedding jsonb)`. Pierde las optimizaciones de IVFFlat de pgvector al salir de la columna tipada.

**Trade-off**: schema más ancho, pero cada columna mantiene sus garantías vectoriales.

---

## D4: `EMBEDDING_PROVIDER_ORDER` como env var CSV

**Decisión**: `EMBEDDING_PROVIDER_ORDER=gemini,openai` define el orden del chain. Ausente → default `openai` para retrocompatibilidad.

**Razón**: cambiable en Railway sin redeploy ni código. Operacionalmente lo más barato.

**Trade-off**: el valor es una string que hay que parsear y validar — error silencioso si hay typo. Mitigación: validar contra lista de providers conocidos en startup y loggear warn si hay unknown.

---

## D5: Gemini model = `text-embedding-004` (768 dims)

**Decisión**: usar `gemini-embedding-001` de Google AI Studio. 768 dims, estable.

**Alternativa rechazada**: `text-embedding-004` — no disponible en AI Studio free tier (404 en v1 y v1beta). Nombre heredado, reemplazado por `gemini-embedding-001`.

**Alternativa rechazada**: `gemini-embedding-2` (3072 dims). Mayor costo de almacenamiento y columna requiere schema change.

**Trade-off**: 768 dims < 1536 de OpenAI → potencialmente menos calidad de retrieval. Por eso mantenemos ambas columnas para comparar en staging.
