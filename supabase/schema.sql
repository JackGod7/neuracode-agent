-- ============================================
-- Neuracode WhatsApp Agent — Schema
-- ============================================
-- Ejecutar en Supabase SQL Editor.
-- Crea: leads, conversations, messages, knowledge + RPC para búsqueda vectorial.
-- ============================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ============================================
-- leads: perfil único por número de WhatsApp
-- ============================================
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  whatsapp_number text unique not null,
  name text,
  email text,
  company text,
  role text,
  interest text,                            -- 'bootcamp_cohort', 'bootcamp_vip', 'webinar', 'consulting'
  status text default 'new',                -- 'new', 'qualified', 'paid', 'lost', 'escalated'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leads_whatsapp on leads(whatsapp_number);
create index if not exists idx_leads_status on leads(status);

-- ============================================
-- conversations: una por lead (puede haber múltiples sesiones)
-- ============================================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  whatsapp_number text not null,
  active boolean default true,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_conversations_lead on conversations(lead_id);
create index if not exists idx_conversations_number on conversations(whatsapp_number);

-- ============================================
-- messages: log completo de mensajes (entrada y salida)
-- Fase 0: conversation_id = lead_id (1:1). Ver spec 000.
-- ============================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references leads(id) on delete cascade,
  wamid text unique,                        -- ID de WhatsApp para idempotencia (spec 005 Capa 1)
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  tool_calls jsonb,                         -- si role = 'assistant' y usó tools
  tool_results jsonb,                       -- si role = 'tool'
  created_at timestamptz default now()
);

create index if not exists idx_messages_conv on messages(conversation_id, created_at);
create index if not exists idx_messages_wamid on messages(wamid);

-- ============================================
-- knowledge: RAG base para que el agente consulte
-- ============================================
create table if not exists knowledge (
  id uuid primary key default gen_random_uuid(),
  source text not null,                     -- 'bootcamp', 'webinars', 'gh600', 'neuracode', 'faqs'
  title text,
  content text not null,
  embedding vector(1536),                   -- text-embedding-3-small = 1536 dims
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_knowledge_source on knowledge(source);
create index if not exists idx_knowledge_embedding on knowledge
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================
-- RPC: búsqueda semántica
-- ============================================
create or replace function match_knowledge (
  query_embedding vector(1536),
  match_count int default 4,
  filter_source text default null
)
returns table (
  id uuid,
  source text,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    k.id, k.source, k.title, k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from knowledge k
  where filter_source is null or k.source = filter_source
  order by k.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================
-- webinar_signups: tracking específico
-- ============================================
create table if not exists webinar_signups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  webinar_code text not null,               -- 'W1', 'W2', 'W3', 'W4'
  attended boolean default false,
  created_at timestamptz default now(),
  unique (lead_id, webinar_code)
);

-- ============================================
-- payment_links: log de links Mercado Pago generados
-- ============================================
create table if not exists payment_links (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  product text not null,                    -- 'cohort', 'vip', 'enterprise'
  amount_usd numeric(10,2) not null,
  mp_preference_id text,
  init_point text,                          -- el link que se envió al lead
  status text default 'pending',            -- 'pending', 'paid', 'expired', 'cancelled'
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- tool_call_cache: idempotencia de tool calls (spec 005 Capa 2)
-- TTL 60s — purgar con job: DELETE WHERE created_at < NOW() - INTERVAL '24 hours'
-- ============================================
create table if not exists tool_call_cache (
  idempotency_key text primary key,
  lead_id uuid references leads(id) on delete cascade,
  tool_name text not null,
  result jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_tool_cache_created on tool_call_cache(created_at);

-- ============================================
-- mp_webhook_log: idempotencia webhooks Mercado Pago (spec 005 Capa 3)
-- ============================================
create table if not exists mp_webhook_log (
  idempotency_key text primary key,
  payload jsonb,
  processed_at timestamptz default now()
);

-- ============================================
-- trigger: actualiza updated_at en leads
-- ============================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at
  before update on leads
  for each row execute function update_updated_at();
