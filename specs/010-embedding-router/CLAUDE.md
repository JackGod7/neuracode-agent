# CLAUDE.md — Feature 010: embedding-router

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-06-01 | Claude Code | draft |

## Scope

**Archivos a crear**:
- `src/embeddings/provider.ts` — interface + tipos
- `src/embeddings/openai.ts` — adapter OpenAI
- `src/embeddings/gemini.ts` — adapter Gemini
- `src/embeddings/chain.ts` — FallbackChain
- `src/embeddings/index.ts` — factory desde env

**Archivos a modificar**:
- `src/rag.ts` — usar EmbeddingProvider en vez de openai SDK directo
- `scripts/ingest.ts` — usar EmbeddingProvider, escribir a columna correcta según dims
- `supabase/schema.sql` — agregar embedding_768, provider_used, actualizar RPC
- `.env.example` — GEMINI_API_KEY, EMBEDDING_PROVIDER_ORDER

**Archivos a NO tocar**:
- `src/tools/` — no saben de embeddings
- `src/claude.ts` — scope de spec 003
- `src/db.ts` — no agregar lógica de embeddings aquí

## Interface canónica

```typescript
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}
```

## Schema additions

```sql
alter table knowledge
  add column if not exists embedding_1536 vector(1536),
  add column if not exists embedding_768  vector(768),
  add column if not exists provider_used  text;

-- Migrar embedding existente a embedding_1536
update knowledge set embedding_1536 = embedding where embedding is not null;
```

RPC `match_knowledge` necesita param `provider text` para elegir columna:
```sql
create or replace function match_knowledge(
  query_embedding vector,   -- dims variables según provider
  match_count int,
  filter_source text,
  provider text default 'openai'
) returns table (...) as $$
  select ... from knowledge
  where case provider
    when 'gemini' then embedding_768 <=> query_embedding
    else embedding_1536 <=> query_embedding
  end ...
$$ language sql;
```

## Trampas conocidas

- **Dimensiones distintas → RPC distinta**: no puedes pasar un vector de 768 dims a una función que espera 1536 — Postgres lanza error de tipo. El RPC debe usar la columna correcta según `provider`.
- **Re-ingest obligatorio**: al cambiar de provider, los embeddings existentes son de otro espacio vectorial — buscar con Gemini contra embeddings de OpenAI da resultados sin sentido.
- **`EMBEDDING_PROVIDER_ORDER` typo**: si escribes `gemmini` en vez de `gemini`, el factory lo ignora silenciosamente (con warn). Validar en startup.
- **Gemini SDK**: `@google/generative-ai` usa `genai.getGenerativeModel` para texto pero `genai.getGenerativeModel("text-embedding-004").embedContent(text)` para embeddings. API diferente a OpenAI.
