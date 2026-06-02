-- ============================================
-- Migration 010: embedding-router
-- Agrega columnas por provider y actualiza RPC match_knowledge
-- Ejecutar en Supabase SQL Editor.
-- ============================================

-- Columna dedicada para embeddings OpenAI (1536 dims)
alter table knowledge
  add column if not exists embedding_1536 vector(1536);

-- Columna dedicada para embeddings Gemini text-embedding-004 (768 dims)
alter table knowledge
  add column if not exists embedding_768 vector(768);

-- Registro del provider que generó el embedding activo
alter table knowledge
  add column if not exists provider_used text;

-- Migrar embeddings existentes (generados con OpenAI) a embedding_1536
update knowledge
set embedding_1536 = embedding
where embedding is not null and embedding_1536 is null;

-- Índices IVFFlat por columna
create index if not exists idx_knowledge_embedding_1536 on knowledge
  using ivfflat (embedding_1536 vector_cosine_ops) with (lists = 100);

create index if not exists idx_knowledge_embedding_768 on knowledge
  using ivfflat (embedding_768 vector_cosine_ops) with (lists = 100);

-- ============================================
-- RPC actualizado: acepta provider param para elegir columna
-- ============================================
create or replace function match_knowledge(
  query_embedding vector,
  match_count int default 4,
  filter_source text default null,
  provider text default 'openai'
)
returns table(
  id uuid,
  source text,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  if provider = 'gemini' then
    return query
    select
      k.id, k.source, k.title, k.content,
      1 - (k.embedding_768 <=> query_embedding) as similarity
    from knowledge k
    where (filter_source is null or k.source = filter_source)
      and k.embedding_768 is not null
    order by k.embedding_768 <=> query_embedding
    limit match_count;
  else
    return query
    select
      k.id, k.source, k.title, k.content,
      1 - (k.embedding_1536 <=> query_embedding) as similarity
    from knowledge k
    where (filter_source is null or k.source = filter_source)
      and k.embedding_1536 is not null
    order by k.embedding_1536 <=> query_embedding
    limit match_count;
  end if;
end;
$$;
