# Criterios de aceptación — Feature 001

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |
| v1.1.0 | 2026-05-30 | Claude Code | implemented — test from/wamid vacío (audit 2026-05-30) |

> Si estos checks pasan, la feature está hecha.

## Tests automatizados

Ubicación: `tests/001-webhook.test.ts`

```typescript
// Pseudocódigo de los tests que deben existir y pasar
describe("Feature 001: Webhook Meta", () => {
  test("GET /webhook con token correcto devuelve challenge");
  test("GET /webhook con token incorrecto devuelve 403");
  test("POST /webhook sin firma devuelve 403");
  test("POST /webhook con firma inválida devuelve 403");
  test("POST /webhook con firma válida devuelve 200 en <2s");
  test("POST /webhook con mensaje de texto loggea { from, wamid, text }");
  test("POST /webhook con audio loggea 'Tipo no soportado'");
  test("POST /webhook con status update no genera log de mensaje");
  test("POST /webhook con from vacío → ignorado, log warn, no crea lead");
  test("POST /webhook con wamid vacío → ignorado, log warn, no crea lead");
  test("GET /health devuelve 200 con { ok: true }");
});
```

## Validación manual (Jack ejecuta)

### Pre-deploy
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run dev` arranca sin warnings
- [ ] `curl http://localhost:3000/health` → `{"ok":true}`
- [ ] `curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=test123"` → `test123`

### Post-deploy en Railway
- [ ] Dominio público generado en Railway
- [ ] `curl https://<dominio>/health` → `{"ok":true}`
- [ ] En Meta Developers: Webhook → Verify and save → "Webhook verified"
- [ ] Suscripción al campo `messages` activa
- [ ] Mandar WhatsApp desde celular al número de prueba
- [ ] En logs de Railway aparece: `Mensaje entrante { from: "51...", wamid: "wamid.XXX", text: "..." }`

## Observabilidad

- [ ] Cada request loggea con campos: `method`, `path`, `status`, `duration_ms`
- [ ] Firmas inválidas loggean `level=warn` con header recibido (sin filtrar APP_SECRET)
- [ ] Errores no controlados loggean `level=error` con stack trace

## Performance

- [ ] p95 de POST /webhook <500ms
- [ ] Sin memory leaks tras 1000 requests (verificar con `node --inspect` y heap snapshot)

## Seguridad

- [ ] `APP_SECRET` nunca se loggea ni se devuelve en responses
- [ ] Comparación de firma usa `timingSafeEqual`
- [ ] Endpoint `/health` no expone info sensible
- [ ] No hay CORS abierto (Fastify por defecto cierra; verificar que no se haya abierto)

## Definition of done

- [ ] Todos los tests pasan en CI
- [ ] PR mergeada a `main`
- [ ] Deploy en Railway exitoso con healthcheck verde
- [ ] Webhook verificado en Meta Developers
- [ ] Un mensaje de WhatsApp real llega y se loggea correctamente
- [ ] ADR actualizado si se tomó alguna decisión nueva
