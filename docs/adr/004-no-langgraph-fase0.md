# ADR 004 — No usar LangGraph en Fase 0

**Status**: Accepted
**Date**: 2026-05-30
**Authors**: Jack Aguilar

## Contexto

Existe presión cultural (LinkedIn, conferencias, demos) para usar LangGraph como "el framework correcto" para agentes. La pregunta surgió en la definición de stack: ¿usamos Anthropic SDK nativo o LangGraph desde el día 1?

## Decisión

**No** usar LangGraph en Fase 0. Usar Anthropic SDK nativo con tool use.

## Justificación técnica

### LangGraph entrega valor real cuando

1. **Hay state machines no triviales** — flows con branches, joins, ciclos con condiciones
2. **Hay human-in-the-loop** — el flow se suspende esperando aprobación humana antes de continuar (caso real: aprobar pagos >$X en banca)
3. **Hay multi-agent orchestration** — supervisor + workers, hierarchical, swarm
4. **Hay checkpointing y replay** — recuperar estado tras crash, debuggear paso a paso
5. **Hay observabilidad con LangSmith** — trazas visuales

### Nuestro caso en Fase 0

- 1 agente, 5 tools, secuencial
- Sin human-in-the-loop
- Sin checkpointing (la conversación vive en Postgres, no en grafo)
- Loops de tool use ya nativos en Anthropic SDK

**LangGraph en este escenario = overhead sin retorno**.

## Costo de adoptar LangGraph en Fase 0

| Costo | Magnitud |
|---|---|
| Curva de aprendizaje (StateGraph, channels, checkpointers) | ~1 semana |
| LangGraphJS es second-class vs Python (menos ejemplos, bugs sin fix) | Riesgo continuo |
| Dependencias extras (@langchain/core, @langchain/langgraph) | +50MB en bundle |
| Abstracción: harder to debug si algo va mal en streaming | Alto |
| Acoplamiento a roadmap de LangChain | Estratégico |

## Costo de NO usar LangGraph

| Costo | Magnitud |
|---|---|
| Migración futura cuando Fase 3 lo justifique | ~2 días (los handlers ya son funciones puras) |
| Sin observabilidad LangSmith | Compensable con Langfuse, que es agnóstico |

## Cuándo revisitar esta decisión

**Trigger condiciones** — si cualquiera de estas se cumple, abrir nuevo ADR para migrar:

- Más de 1 agente activo en el mismo flujo (ej: agente de ventas + agente de revisor de pagos)
- Necesidad de pausar conversación esperando approval de Jack para acciones >X
- Backtracking: revertir tool calls cuando una secuencia falla
- Volumen >500 conversaciones/día con necesidad de trace por conversación
- Spec 008 (`multi-agent-langgraph-fase3`) entra al roadmap activo

## Alternativas consideradas

### Alt 1: LangGraph desde el día 1
**Rechazada**: ver "Costo de adoptar" arriba.

### Alt 2: Vercel AI SDK
**Rechazada**: optimizado para UI streaming hacia React, no para webhooks server-side. Su valor está en `useChat` hook, irrelevante aquí.

### Alt 3: CrewAI
**Rechazada**: Python only, y filosofía multi-agent por default. Innecesario.

### Alt 4: Anthropic SDK nativo (ELEGIDA)
**Razones**:
- Tool use loop está documentado oficialmente
- SDK estable y mantenido directamente por Anthropic
- Cero abstracción extra: lo que ves es lo que pasa
- Las funciones de tool use son fácilmente envolvibles en LangGraph después si hace falta

## Consecuencias

- El loop manual en `src/claude.ts` es responsabilidad nuestra (no del framework)
- Si necesitamos parallel tool calls, lo implementamos a mano (~50 líneas)
- Los handlers de tools son funciones puras, lo que facilita migración futura

## Referencias

- Anthropic tool use docs: https://docs.claude.com/en/docs/build-with-claude/tool-use
- LangGraph JS: https://langchain-ai.github.io/langgraphjs/
- Spec 008 placeholder: `specs/008-multi-agent-langgraph-fase3/`
