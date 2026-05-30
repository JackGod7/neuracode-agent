# Acceptance — Feature 003: tool-use-loop

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Tests automatizados

Ubicación: `tests/003-tool-use-loop.test.ts`

```typescript
describe("003-tool-use-loop: happy path", () => {
  test("mensaje simple → Claude responde con end_turn → texto enviado por WhatsApp");
  test("tool use → end_turn → tool ejecutada, resultado enviado");
  test("dos tool calls consecutivas → ambas ejecutadas → respuesta final correcta");
  test("mensaje de usuario y respuesta asistente persistidos en messages");
});

describe("003-tool-use-loop: stop_reason handling", () => {
  test("stop_reason='max_tokens' → log error + fallback al usuario + NO reintenta");
  test("stop_reason='stop_sequence' → tratado igual que end_turn");
  test("stop_reason desconocido → log warn + fallback al usuario");
  test("MAX_TOOL_ITERATIONS agotado → log error + fallback + sin excepción al webhook");
});

describe("003-tool-use-loop: alternación user/assistant", () => {
  test("historial limpio [u,a,u,a] → Claude API acepta sin error");
  test("historial con [u,u,a] → mensajes user fusionados antes de enviar a Claude");
  test("historial vacío (primer mensaje) → Claude recibe solo el mensaje actual");
});

describe("003-tool-use-loop: saveMessage error handling", () => {
  test("saveMessage falla en mensaje de usuario → handleIncomingMessage lanza error");
  test("saveMessage falla en respuesta asistente → log error pero no falla el handler");
});
```

## Validación manual

- [ ] Mandar "hola" al número de prueba → recibir respuesta del agente en WhatsApp
- [ ] Mandar "¿cuánto cuesta el bootcamp?" → agente invoca `consultar_bootcamp` y responde con precio real
- [ ] Mandar dos mensajes en ráfaga (< 1 segundo entre ellos) → no hay HTTP 400 en logs
- [ ] Simular `stop_reason=max_tokens` (bajar `MAX_TOKENS` a 10) → usuario recibe fallback amigable, logs muestran `level=error`
- [ ] En logs de Railway: verificar que cada turno loggea `{ stop_reason, iterations, from, wamid }`

## Validación de idempotencia (prerrequisito spec 005)

- [ ] Spec 005 implementado y tests pasando ANTES de este acceptance
- [ ] Mandar mismo POST al webhook 3 veces → agente responde solo 1 vez
- [ ] En DB: un solo mensaje de usuario y un solo mensaje de asistente por wamid

## Definition of done

- [ ] `stop_reason === "max_tokens"` manejado explícitamente con log `error` y fallback
- [ ] Loop exhaustion (`MAX_TOOL_ITERATIONS`) manejado con log `error` y fallback
- [ ] Alternación user/assistant validada/reparada antes de llamar a Claude API
- [ ] `saveMessage` propaga error (spec 000 D2 implementado)
- [ ] Spec 005 implementado (wamid dedup activo)
- [ ] Tests de alternación y stop_reason pasan
- [ ] `npm run typecheck` verde
- [ ] PR mergeada a `main`
- [ ] No hay doble respuesta en prueba de retry manual
