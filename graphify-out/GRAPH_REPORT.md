# Graph Report - .  (2026-05-30)

## Corpus Check
- Corpus is ~13,461 words - fits in a single context window. You may not need a graph.

## Summary
- 216 nodes · 255 edges · 22 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Infrastructure & Foundation Specs|Infrastructure & Foundation Specs]]
- [[_COMMUNITY_Webhook Processing & Idempotency|Webhook Processing & Idempotency]]
- [[_COMMUNITY_Business Domain & Payments|Business Domain & Payments]]
- [[_COMMUNITY_Conversation Orchestration|Conversation Orchestration]]
- [[_COMMUNITY_Roadmap & Feature Lifecycle|Roadmap & Feature Lifecycle]]
- [[_COMMUNITY_Agent Tools & Lead Data|Agent Tools & Lead Data]]
- [[_COMMUNITY_RAG Knowledge Feature|RAG Knowledge Feature]]
- [[_COMMUNITY_Architectural Decisions & Stack|Architectural Decisions & Stack]]
- [[_COMMUNITY_Claude Tool Use & Agent Identity|Claude Tool Use & Agent Identity]]
- [[_COMMUNITY_Message Persistence Layer|Message Persistence Layer]]
- [[_COMMUNITY_RAG Retrieval Engine|RAG Retrieval Engine]]
- [[_COMMUNITY_Foundations Spec Docs|Foundations Spec Docs]]
- [[_COMMUNITY_Knowledge Ingestion|Knowledge Ingestion]]
- [[_COMMUNITY_Dual-Model Strategy|Dual-Model Strategy]]
- [[_COMMUNITY_Project Identity|Project Identity]]
- [[_COMMUNITY_Incoming Message Type|Incoming Message Type]]
- [[_COMMUNITY_Webhook Verification|Webhook Verification]]
- [[_COMMUNITY_Health Check|Health Check]]
- [[_COMMUNITY_Pino Logger|Pino Logger]]
- [[_COMMUNITY_WhatsApp API|WhatsApp API]]
- [[_COMMUNITY_Implementation Roadmap|Implementation Roadmap]]
- [[_COMMUNITY_Payments Feature Acceptance|Payments Feature Acceptance]]

## God Nodes (most connected - your core abstractions)
1. `Spec 001 — Webhook Meta` - 12 edges
2. `GH-600 GitHub Copilot Certification` - 9 edges
3. `Spec 007: Multimodal Fase 2` - 9 edges
4. `handleIncomingMessage()` - 8 edges
5. `Bootcamp Harness Engineering for Regulated AI` - 8 edges
6. `Spec 003 — Tool Use Loop (Template)` - 8 edges
7. `Spec 006 — Pagos Mercado Pago (Template)` - 8 edges
8. `Spec 008: Multi-Agent LangGraph Fase 3` - 8 edges
9. `handleIncomingMessage()` - 7 edges
10. `Webinars Junio 2026 (Free Pre-Bootcamp Series)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Embedding Model text-embedding-3-small` --semantically_similar_to--> `OpenAI Embeddings (rag.ts)`  [INFERRED] [semantically similar]
  scripts/ingest.ts → src/rag.ts
- `Anthropic SDK Client (claude.ts)` --references--> `ADR 004 — No LangGraph in Phase 0`  [INFERRED]
  src/claude.ts → docs/adr/004-no-langgraph-fase0.md
- `Supabase Client (db.ts)` --references--> `ADR 003 — Supabase over Self-Hosted Postgres`  [INFERRED]
  src/db.ts → docs/adr/003-supabase-over-self-hosted.md
- `Fastify App (index.ts)` --references--> `ADR 002 — Fastify over Express`  [INFERRED]
  src/index.ts → docs/adr/002-fastify-over-express.md
- `handleIncomingMessage()` --calls--> `getOrCreateLead()`  [INFERRED]
  src\claude.ts → src\db.ts

## Hyperedges (group relationships)
- **WhatsApp Message Processing Pipeline** — index_webhookPost, index_processWebhook, claude_handleIncomingMessage, claude_toolUseLoop, whatsapp_sendWhatsAppMessage [EXTRACTED 0.95]
- **RAG Knowledge Ingestion and Retrieval Pipeline** — ingest_ingest, ingest_supabaseKnowledgeTable, rag_searchKnowledge, consultar_bootcamp_consultarBootcamp, rag_matchKnowledgeRPC [INFERRED 0.88]
- **Lead Lifecycle Management Pattern** — db_getOrCreateLead, db_updateLead, db_leadsTable, agendar_call_agendarCall, inscribir_webinar_inscribirWebinar, escalar_a_jack_escalarAJack [INFERRED 0.85]
- **Webinar-to-Bootcamp-to-GH600 Certification Funnel** — knowledge_webinars, knowledge_bootcamp, knowledge_gh600 [EXTRACTED 0.95]
- **Webhook Meta Security Pattern (HMAC + Raw Body + Fire-and-Forget)** — spec001_hmac_sha256, spec001_raw_body_parser, spec001_fire_and_forget [INFERRED 0.90]
- **Railway Deploy + /health Endpoint + Incident Runbook Trio** — adr007_railway, spec001_health_endpoint, runbook_incident_webhook [INFERRED 0.88]
- **3-Layer Idempotency Defense (wamid + tool cache + external keys)** — spec005_layer1_wamid_dedup, spec005_layer2_tool_call_cache, spec005_layer3_external_effects [EXTRACTED 1.00]
- **Webhook Security Pipeline (HMAC + timingSafeEqual + 200 sync)** — spec001_hmac_sha256_validation, spec001_timing_safe_equal, spec001_async_processing [EXTRACTED 1.00]
- **Spec 005 DB Schema — Tool Cache + Messages + MP Log Tables** — spec005_tool_call_cache_table, spec005_messages_table, spec005_mp_webhook_log_table [EXTRACTED 1.00]
- **5-File Spec Template Pattern applied across Features 006, 007, 008** — spec006_pagos_mercadopago, spec007_multimodal_fase2, spec008_multi_agent_langgraph_fase3 [EXTRACTED 1.00]
- **Feature 007 Acceptance Bundle: spec + hu + acceptance + definition_of_done** — spec007_multimodal_fase2, spec007_hu, spec007_acceptance, spec007_definition_of_done [EXTRACTED 1.00]
- **Feature 008 Acceptance Bundle: spec + hu + acceptance + definition_of_done** — spec008_multi_agent_langgraph_fase3, spec008_hu, spec008_acceptance, spec008_definition_of_done [EXTRACTED 1.00]

## Communities

### Community 0 - "Infrastructure & Foundation Specs"
Cohesion: 0.09
Nodes (29): Fly.io (Railway Migration Alternative), ADR 007 — Railway Deploy Platform, Runbook — Deploy Process, Runbook — Incident: Webhook 5xx Failure, Spec 000 Foundations — CLAUDE.md (Scope), Spec 001 Webhook Meta — Acceptance Criteria, APP_SECRET Env Var, Spec 001 Webhook Meta — CLAUDE.md (Scope) (+21 more)

### Community 1 - "Webhook Processing & Idempotency"
Cohesion: 0.09
Nodes (27): Async Fire-and-Forget Message Processing, POST /webhook Event Endpoint, wamid — WhatsApp Message Unique ID, Spec 005 Acceptance Criteria — Idempotencia, Wrapper: executeTool (cache-aware tool executor), Spec 005 — Idempotencia, Function: idempotencyKey(leadId, toolName, input), Capa 1 — Webhook wamid Deduplication (+19 more)

### Community 2 - "Business Domain & Payments"
Cohesion: 0.13
Nodes (24): Culqi (Rejected Payment Gateway), ADR 006 — Mercado Pago Perú Payment Gateway, Bootcamp Harness Engineering for Regulated AI, Jack Aguilar — Instructor / Founder, Bootcamp Tier — Cohort (USD 597), Bootcamp Tier — Enterprise (USD 6,500–7,500), Bootcamp Tier — VIP (USD 1,497), FAQs and Objection Handling (+16 more)

### Community 3 - "Conversation Orchestration"
Cohesion: 0.11
Nodes (12): handleIncomingMessage(), getOrCreateLead(), loadRecentMessages(), saveMessage(), updateLead(), processWebhook(), markAsRead(), sendWhatsAppMessage() (+4 more)

### Community 4 - "Roadmap & Feature Lifecycle"
Cohesion: 0.12
Nodes (19): Definition of Done (tests pass, deploy green, runbook), Fase 2 Trigger Condition (>0 validated leads), Fase 3 Trigger Condition (>50 leads/month), Spec Template (5-file pattern: spec, hu, decisions, acceptance, CLAUDE), Feature 007 Acceptance Criteria, Feature 007 Scope & Context (CLAUDE.md), Claude Vision Image Processing, Feature 007 Local Decisions (+11 more)

### Community 5 - "Agent Tools & Lead Data"
Cohesion: 0.18
Nodes (17): agendarCall(), consultarBootcamp(), Lead type, getOrCreateLead(), Supabase leads table, updateLead(), escalarAJack(), PRECIOS canonical price map (+9 more)

### Community 6 - "RAG Knowledge Feature"
Cohesion: 0.13
Nodes (15): Spec 002 Acceptance Criteria (Template), Spec 002 CLAUDE.md Context (Template), Spec 002 Local Decisions (Template), Spec 002 — RAG Knowledge (Template), Spec 002 User Stories HU-002 (Template), Spec 003 Acceptance Criteria (Template), Spec 003 CLAUDE.md Context (Template), Spec 003 Local Decisions (Template) (+7 more)

### Community 7 - "Architectural Decisions & Stack"
Cohesion: 0.15
Nodes (13): ADR 001 — TypeScript over Python, ADR 002 — Fastify over Express, ADR 003 — Supabase over Self-Hosted Postgres, Canonical Tech Stack, Supabase Client (db.ts), Fastify App (index.ts), Embedding Model text-embedding-3-small, ingest() script (+5 more)

### Community 8 - "Claude Tool Use & Agent Identity"
Cohesion: 0.18
Nodes (12): ADR 004 — No LangGraph in Phase 0, agendarCallSchema (Anthropic.Tool), Anthropic SDK Client (claude.ts), Agent Identity Rules (Neuracode), Tool Use Loop, consultarBootcampSchema (Anthropic.Tool), escalarAJackSchema (Anthropic.Tool), generarLinkPagoSchema (Anthropic.Tool) (+4 more)

### Community 9 - "Message Persistence Layer"
Cohesion: 0.22
Nodes (8): handleIncomingMessage(), SaveMessageInput type, loadRecentMessages(), Supabase messages table, saveMessage(), processWebhook(), POST /webhook (message receiver), sendWhatsAppMessage()

### Community 10 - "RAG Retrieval Engine"
Cohesion: 0.5
Nodes (3): formatMatchesAsContext(), searchKnowledge(), consultarBootcamp()

### Community 11 - "Foundations Spec Docs"
Cohesion: 0.5
Nodes (4): Spec 000 Foundations — Acceptance Criteria, Spec 000 Foundations — Decisions, Spec 000 Foundations — User Stories, Spec 000 Foundations — Feature Spec

### Community 12 - "Knowledge Ingestion"
Cohesion: 1.0
Nodes (2): chunkText(), ingest()

### Community 13 - "Dual-Model Strategy"
Cohesion: 1.0
Nodes (3): Claude Haiku 4.5 (Intent Classification Model), Claude Sonnet 4.6 (Primary Reasoning Model), ADR 005 — Dual Model Strategy

### Community 15 - "Project Identity"
Cohesion: 1.0
Nodes (2): Spec-Driven Development (SDD) workflow, Neuracode WhatsApp Agent Project

### Community 18 - "Incoming Message Type"
Cohesion: 1.0
Nodes (1): IncomingMessage type

### Community 19 - "Webhook Verification"
Cohesion: 1.0
Nodes (1): GET /webhook (Meta verification)

### Community 20 - "Health Check"
Cohesion: 1.0
Nodes (1): GET /health

### Community 21 - "Pino Logger"
Cohesion: 1.0
Nodes (1): Pino Logger

### Community 22 - "WhatsApp API"
Cohesion: 1.0
Nodes (1): WhatsApp Graph API Base URL

### Community 23 - "Implementation Roadmap"
Cohesion: 1.0
Nodes (1): Phase 0 Implementation Order

### Community 24 - "Payments Feature Acceptance"
Cohesion: 1.0
Nodes (1): Spec 006 Acceptance Criteria (Template)

## Knowledge Gaps
- **71 isolated node(s):** `IncomingMessage type`, `Lead type`, `SaveMessageInput type`, `Fastify App (index.ts)`, `GET /webhook (Meta verification)` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Knowledge Ingestion`** (3 nodes): `chunkText()`, `ingest()`, `ingest.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Identity`** (2 nodes): `Spec-Driven Development (SDD) workflow`, `Neuracode WhatsApp Agent Project`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Incoming Message Type`** (1 nodes): `IncomingMessage type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Webhook Verification`** (1 nodes): `GET /webhook (Meta verification)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Check`** (1 nodes): `GET /health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pino Logger`** (1 nodes): `Pino Logger`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WhatsApp API`** (1 nodes): `WhatsApp Graph API Base URL`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Implementation Roadmap`** (1 nodes): `Phase 0 Implementation Order`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Payments Feature Acceptance`** (1 nodes): `Spec 006 Acceptance Criteria (Template)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Spec 006 — Pagos Mercado Pago (Template)` connect `Webhook Processing & Idempotency` to `Roadmap & Feature Lifecycle`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Spec 001 — Webhook Meta` connect `Infrastructure & Foundation Specs` to `Webhook Processing & Idempotency`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Spec 007: Multimodal Fase 2` (e.g. with `Whisper Audio Processing` and `Claude Vision Image Processing`) actually correct?**
  _`Spec 007: Multimodal Fase 2` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `handleIncomingMessage()` (e.g. with `getOrCreateLead()` and `markAsRead()`) actually correct?**
  _`handleIncomingMessage()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IncomingMessage type`, `Lead type`, `SaveMessageInput type` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Infrastructure & Foundation Specs` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Webhook Processing & Idempotency` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._