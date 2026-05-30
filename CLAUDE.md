# CLAUDE.md — Neuracode WhatsApp Agent

**Agente conversacional** de Neuracode SAC: captar leads del bootcamp Harness Engineering, inscribir webinars, agendar 1:1, procesar pagos. Demo público del bootcamp — toda decisión arquitectónica debe poder defenderse frente a un alumno crítico.

## 1. Think Before Coding

Lee `specs/NNN-*/spec.md` y `acceptance.md` **antes** de escribir una línea.

- Spec ambiguo → para, pregunta a Jack. No asumas.
- Múltiples interpretaciones → preséntaslas, no elijas en silencio.
- Approach más simple existe → dilo. Push back cuando vale.
- Necesitas modificar otra área → abre TODO en `specs/NNN-*/decisions.md`, no toques.

## 2. Simplicity First

Mínimo código que resuelve el problema. Nada especulativo.

- Sin features más allá de lo pedido.
- Sin abstracciones para código de un solo uso.
- Sin dependencias nuevas sin entrada en `specs/NNN-*/decisions.md`.
- Sin error handling para escenarios imposibles.

## 3. Surgical Changes

Toca solo lo que el spec pide. No "mejores" código adyacente.

- No refactorizar lo que no está roto.
- No tocar archivos fuera del scope del spec activo.
- Dead code no relacionado → menciona, no borres.
- Cambio de stack o arquitectura → ADR en `docs/adr/` antes de codear.

Prueba: cada línea cambiada traza directamente al request.

## 4. SDD Compliance

Cada feature vive en `specs/NNN-nombre/` con 5 archivos:

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Scope local: qué tocar, qué evitar |
| `spec.md` | Qué se construye y por qué. Restricciones |
| `hu.md` | Historias Gherkin (Given/When/Then) |
| `decisions.md` | Librería elegida, trade-offs locales |
| `acceptance.md` | Criterios testeables — si pasa, está hecho |

**Regla dura**: sin los 5 archivos firmados, no se implementa. Usar `/validate-spec NNN` antes de codear.

Idempotencia primero: todo handler con input externo (webhook Meta, webhook MP, retry de tool) debe ser idempotente. Ver `specs/005-idempotencia/`.

Tests mínimos: cada tool tiene al menos un test happy-path. Sin tests, no se merge.

## 5. Goal-Driven

Convierte cada task en criterio verificable antes de codear:

```
1. [Paso] → verificar: [check concreto]
2. [Paso] → verificar: [check concreto]
```

Comandos de flujo:
- Nueva feature → `/new-feature NNN nombre`
- Validar spec → `/validate-spec NNN`
- Modificaste `knowledge/` → `/ingest` después
- Evals → `/eval`

---

## Stack (no negociable sin ADR)

| Capa | Elección | ADR |
|---|---|---|
| Lenguaje | TypeScript estricto | `001-typescript-over-python.md` |
| HTTP | Fastify | `002-fastify-over-express.md` |
| DB | Supabase (Postgres + pgvector) | `003-supabase-over-self-hosted.md` |
| Orquestación | Anthropic SDK nativo | `004-no-langgraph-fase0.md` |
| LLM | `claude-sonnet-4-6` razonar / `claude-haiku-4-5-20251001` clasificar | `005-modelos-claude.md` |
| Pagos | Mercado Pago Perú | `006-mercadopago-perú.md` |
| Deploy | Railway | `007-railway-deploy.md` |

## Orden de implementación

Fase 0 — cada uno depende del anterior:

1. `000-foundations` — setup base, env vars, healthcheck
2. `001-webhook-meta` — webhook Meta verificado y firmado
3. `005-idempotencia` — antes de procesar nada
4. `003-tool-use-loop` — loop Claude con tool use
5. `002-rag-knowledge` — ingesta + búsqueda pgvector
6. `004-tools-individuales` — las 5 tools
7. `006-pagos-mercadopago` — pagos con webhook MP

Fase 2 (post cliente cero validado): `007-multimodal-fase2`
Fase 3 (>50 leads/mes): `008-multi-agent-langgraph-fase3`

## Identidad del agente

Al generar código para system prompt o tools:
- Tercera persona sobre Jack: "Jack está organizando…"
- Español Perú: "tú" (no "vos", no "usted")
- Máximo 1 emoji por mensaje
- No inventa precios, fechas ni cupos — usa `consultar_bootcamp` o escala a Jack

## Commits

```
feat(001-webhook): implementar verificación de firma
fix(005-idempotencia): manejar wamid duplicado sin error
docs(adr): agregar 004-no-langgraph-fase0
chore(deps): bump anthropic sdk a 0.32.1
```

---

**Funciona si:** diffs sin cambios innecesarios, preguntas de clarificación antes de implementar (no después de equivocarse), specs completos antes de primer commit de código.
