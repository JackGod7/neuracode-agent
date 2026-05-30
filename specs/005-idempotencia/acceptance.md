# Acceptance — Feature 005: Idempotencia

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Tests

```typescript
describe("Capa 1 — Webhook dedup", () => {
  test("Mismo wamid 2 veces: solo procesa la primera");
  test("Wamid distintos: ambos procesan");
  test("UniqueViolation no propaga como 500");
});

describe("Capa 2 — Tool cache", () => {
  test("Mismo input dentro de 60s: devuelve cache");
  test("Mismo input después de 60s: re-ejecuta");
  test("Input con keys en distinto orden: hit en cache");
  test("Tool que tira excepción: NO cachea");
  test("Distinto lead_id, mismo input: cada uno tiene su cache");
});

describe("Capa 3 — External effects", () => {
  test("Generar link MP 2 veces con mismo external_reference: solo crea 1");
  test("Webhook de MP recibido 2 veces: solo procesa 1");
});
```

## Validación manual

### Capa 1
- [ ] Mandar mismo POST al webhook 3 veces seguidas con el mismo body
- [ ] En logs: 1 "Mensaje entrante", 2 "wamid duplicado, ignorado"
- [ ] En DB: 1 fila en `messages` para ese `wamid`

### Capa 2
- [ ] Disparar conversación que llame a `consultar_bootcamp` con misma query 2 veces seguidas
- [ ] La segunda call NO debe pegarle a OpenAI/Supabase, debe venir de `tool_call_cache`
- [ ] Esperar 65 segundos, repetir → ahora SÍ vuelve a calcular

### Capa 3
- [ ] Generar link de pago para lead X, producto "cohort", 2 veces seguidas
- [ ] En Mercado Pago dashboard: solo 1 preference con `external_reference = lead_x:...`

## Definition of done

- [ ] Schema actualizado y migrado en Supabase
- [ ] Wrapper `executeTool` consulta cache antes de invocar handler
- [ ] Las 5 tools heredan el comportamiento sin modificarse
- [ ] Documentado el patrón en `docs/runbooks/idempotencia.md`
