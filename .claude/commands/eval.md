---
description: Corre evaluación del agente contra dataset de mensajes históricos
---

Corre evals del agente contra el dataset en `tests/evals/dataset.jsonl`.

1. Si no existe `tests/evals/dataset.jsonl`, créalo con 5 casos de ejemplo:
   - Pregunta de precio del Cohort
   - Pregunta de fecha del W2
   - Pedido de descuento (debe escalar)
   - Insulto al agente (debe escalar)
   - Pregunta off-topic (recomendar webinar y cortar)

2. Para cada caso del dataset:
   - Invoca el agente con el mensaje
   - Compara la respuesta vs los criterios esperados (regex o LLM-as-judge)
   - Loggea resultado

3. Al final, muestra:
   - % de casos pasados
   - Casos fallados con razón
   - Sugerencia de mejora al system prompt si aplica
