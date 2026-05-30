# CLAUDE.md — Constitución del repositorio

> **Para Claude Code**: este archivo es la fuente de verdad sobre cómo trabajar en este repo.
> No improvises. Si algo no está aquí o en `specs/`, **pregunta** o consulta los ADRs en `docs/adr/`.

## Sobre este proyecto

**Neuracode WhatsApp Agent**: agente conversacional de Jack Aguilar (Neuracode SAC) para captar leads del bootcamp Harness Engineering, inscribir webinars, agendar 1:1 y procesar pagos.

Este repo es también el **demo público** del bootcamp: el harness que se enseña, aplicado al propio agente de ventas. Toda decisión arquitectónica debe poder defenderse frente a un alumno crítico.

## Flujo de trabajo (SDD — Spec-Driven Development)

Inspiración: Birgitta Böckeler en martinfowler.com y Sean Chen (harness-engineering.ai).

```
specs/NNN-feature/  →  Claude Code lee  →  genera código  →  valida vs acceptance.md
```

**Cada feature vive en una carpeta `specs/NNN-nombre/` con 5 archivos**:

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Contexto local: qué carpetas tocar, qué evitar, qué archivos son críticos |
| `spec.md` | Qué se construye y **por qué**. Restricciones y no-objetivos |
| `hu.md` | Historias de usuario en Gherkin (Given/When/Then) |
| `decisions.md` | Decisiones locales: librería elegida, patrón aplicado, trade-offs |
| `acceptance.md` | Criterios testeables. Si esto pasa, la feature está hecha |

**Regla**: ninguna feature se implementa sin que las 5 piezas existan y estén firmadas (commit del autor).

## Orden de implementación (Fase 0)

Resolver en este orden — cada uno depende del anterior:

1. `000-foundations` — Setup base, env vars, healthcheck
2. `001-webhook-meta` — Webhook Meta verificado y firmado
3. `005-idempotencia` — **Antes** de procesar nada, garantizar idempotencia
4. `003-tool-use-loop` — Loop de Claude con tool use
5. `002-rag-knowledge` — Ingesta + búsqueda en pgvector
6. `004-tools-individuales` — Las 5 tools una por una
7. `006-pagos-mercadopago` — Pagos con webhook de MP

Fase 2 (después de cliente cero validado):
- `007-multimodal-fase2` — Audio (Whisper) + imagen (Claude vision)

Fase 3 (cuando haya >50 leads/mes):
- `008-multi-agent-langgraph-fase3` — Multi-agent con LangGraph

## Stack canonical (no negociable sin ADR)

| Capa | Elección | ADR |
|---|---|---|
| Lenguaje | TypeScript estricto | `001-typescript-over-python.md` |
| Framework HTTP | Fastify | `002-fastify-over-express.md` |
| DB | Supabase (Postgres + pgvector) | `003-supabase-over-self-hosted.md` |
| Orquestación | Anthropic SDK nativo (no LangGraph en Fase 0) | `004-no-langgraph-fase0.md` |
| LLM | `claude-sonnet-4-6` razonar / `claude-haiku-4-5-20251001` clasificar | `005-modelos-claude.md` |
| Pagos | Mercado Pago Perú | `006-mercadopago-perú.md` |
| Deploy | Railway | `007-railway-deploy.md` |

Cualquier cambio sobre lo anterior requiere ADR nuevo en `docs/adr/`.

## Identidad del agente (no del repo)

Cuando estés generando código para el system prompt o las tools, el agente:
- Habla en **tercera persona** sobre Jack ("Jack está organizando…")
- **Español Perú**: "tú", no "vos" ni "usted"
- Sin emojis excesivos (1 máximo por mensaje)
- Sin frases vacías ("¡Excelente pregunta!")
- No inventa precios, fechas ni cupos — usa `consultar_bootcamp` o escala

## Reglas duras para Claude Code

1. **Antes de escribir código**, lee `specs/NNN-*/spec.md` y `acceptance.md` de la feature en cuestión.
2. **Si el spec es ambiguo**, no asumas — para y pregunta a Jack.
3. **No tocar archivos fuera del scope** del spec actual. Si necesitas modificar otra área, abre TODO en `specs/NNN-*/decisions.md`.
4. **Todo cambio en arquitectura → ADR en `docs/adr/`**. No mezclar decisiones con código.
5. **Idempotencia primero**. Cualquier handler que reciba input externo (webhook Meta, webhook MP, retry de tool) tiene que ser idempotente. Ver `specs/005-idempotencia/`.
6. **Pruebas mínimas**: cada tool tiene al menos un test happy-path. Sin tests, no se merge.
7. **No agregar dependencias** sin entrada en `decisions.md` justificando.

## Hooks de Claude Code

Configurados en `.claude/settings.json` y `.claude/hooks/`:

| Hook | Cuándo dispara | Qué hace |
|---|---|---|
| `pre-tool-use.sh` | Antes de cualquier tool call de Claude | Valida que no ejecute comandos en blacklist (`rm -rf`, `sudo`, escritura fuera del repo) |
| `post-tool-use.sh` | Después de cada tool call | Loggea a `.claude/logs/` para auditoría |
| `stop.sh` | Cuando Claude termina turno | Corre `npm run typecheck` y reporta resultado |

## Comandos personalizados en `.claude/commands/`

Invocables desde Claude Code con `/comando`:

- `/new-feature <nombre>` → bootstrapea `specs/NNN-nombre/` con los 5 archivos plantilla
- `/validate-spec <NNN>` → verifica que el spec esté completo antes de implementar
- `/test-webhook` → manda payload de prueba al webhook local
- `/ingest` → re-ingesta `knowledge/*.md` a Supabase
- `/eval` → corre evals contra dataset de mensajes históricos

## GitHub Actions (CI/CD)

Workflows en `.github/workflows/`:

| Workflow | Trigger | Qué hace |
|---|---|---|
| `typecheck.yml` | push a cualquier rama | `tsc --noEmit` + lint |
| `ingest-knowledge.yml` | push a `main` con cambios en `knowledge/**` | Corre `scripts/ingest.ts` contra Supabase prod |
| `deploy-railway.yml` | push a `main` con cambios fuera de `knowledge/` y `specs/` | Railway auto-deploy |
| `claude-eval.yml` | manual (workflow_dispatch) o nightly | Corre evals con dataset y reporta a Slack |

Claude Code puede invocar cualquier workflow desde su terminal con `gh workflow run <name>`.

## Convenciones de commits

Conventional Commits + prefijo de feature:

```
feat(001-webhook): implementar verificación de firma
fix(005-idempotencia): manejar wamid duplicado sin error
docs(adr): agregar 004-no-langgraph-fase0
chore(deps): bump anthropic sdk a 0.32.1
```

## Cómo arrancar una sesión de Claude Code

Prompt inicial sugerido:

> Lee `CLAUDE.md` y `specs/001-webhook-meta/`. Implementa lo que falta en `src/index.ts` y `src/whatsapp.ts` para cumplir el `acceptance.md`. Antes de codear, dime qué archivos vas a tocar y por qué.
