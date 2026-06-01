# CLAUDE.md — Feature 002: rag-knowledge

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## Scope

**Archivos a modificar**:
- `src/rag.ts` — searchKnowledge, formatMatchesAsContext
- `scripts/ingest.ts` — script de carga
- `supabase/schema.sql` — RPC match_knowledge ya existe, no cambiar

**Archivos a NO tocar**:
- `knowledge/*.md` — contenido editorial, solo Jack los edita
- `src/tools/consultar_bootcamp.ts` — consume rag.ts, scope de spec 004
- `src/db.ts` — no agregar lógica de knowledge aquí

## Contexto técnico

**Modelo**: `text-embedding-3-small` → 1536 dimensiones. Hardcodeado en ingest.ts y usado vía `EMBEDDING_MODEL` env en rag.ts. DEBEN coincidir. Ver D1.

**RPC `match_knowledge`**: calcula similitud coseno con `<=>` y retorna top-k. Ya está en `supabase/schema.sql`. Ejecutar en Supabase SQL Editor si no existe.

**Ingest**: DELETE total + re-insert. Crear ventana de vacío de ~30s. Normal en Fase 0. Ver D3.

**`searchKnowledge` silencia errores**: retorna `[]` siempre en fallo. El caller formatea como "sin información". No cambiar sin actualizar spec D4.

## Trampas conocidas

- **`embedding.data[0]?.embedding` puede ser undefined** si OpenAI retorna lista vacía. Ingest inserta `null` en la columna → rompe búsqueda vectorial para ese chunk. Agregar guard: `if (!chunk_embedding) continue`.
- **IVFFlat con `lists = 100`** requiere ~3900 filas para ser eficiente. Con <100 chunks, Postgres hace sequential scan — correcto pero no eficiente en escala.
- **`EMBEDDING_MODEL` env**: si no está, default `text-embedding-3-small`. No cambiar el default sin re-ingest completo.
- **Ingest borra TODO al inicio**: si el script falla en mitad, la tabla queda vacía. Ejecutar solo cuando haya confirmación de que el contenido está listo.
