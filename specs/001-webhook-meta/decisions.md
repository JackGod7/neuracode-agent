# Decisiones locales — Feature 001

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |
| v1.1.0 | 2026-05-30 | Claude Code | implemented — D6 agregado (audit 2026-05-30) |

## D1: Fastify nativo, sin middleware externo para body parsing

**Decisión**: usar `addContentTypeParser` con `parseAs: "buffer"` de Fastify para retener el raw body.

**Alternativa rechazada**: `fastify-raw-body` plugin. Es un wrapper innecesario para algo que Fastify hace nativo.

**Trade-off**: aumenta complejidad del setup en 8 líneas, pero evita una dependencia.

## D2: HMAC con `timingSafeEqual` envuelto en try/catch

**Decisión**: comparar firmas con `crypto.timingSafeEqual()`, no con `===`.

**Razón**: `===` permite timing attacks que pueden filtrar la firma esperada. El throw cuando los buffers tienen distinto largo se maneja con try/catch que retorna `false`.

## D3: Procesamiento async fire-and-forget tras 200

**Decisión**: `reply.code(200).send("ok")` antes de procesar el mensaje. El procesamiento corre en `.catch()` separado.

**Alternativa rechazada**: cola con BullMQ en Fase 0.

**Razón**: BullMQ requiere Redis. En Fase 0 con <100 mensajes/día no se justifica. Cuando los volúmenes crezcan o necesitemos retry/dead-letter, migrar a BullMQ es un día de trabajo (ver `specs/005-idempotencia/decisions.md`).

**Riesgo asumido**: si el proceso muere entre el 200 y el procesamiento, perdemos el mensaje. Mitigación en Fase 1: persistir el evento antes de responder 200.

## D4: Filtrar audio/imagen con respuesta cortés en spec 003, no aquí

**Decisión**: en esta feature, simplemente loggear y descartar audio/imagen.

**Razón**: responder al usuario requiere el cliente WhatsApp (`whatsapp.ts`) en su forma completa, lo cual pertenece a spec 003. Aquí solo loggeamos.

**TODO en spec 003**: enviar mensaje "todavía no proceso audios" al usuario.

## D5: No usar Fastify schemas en esta feature

**Decisión**: no agregar `schema` a las rutas todavía.

**Razón**: el payload de Meta no tiene un schema oficial estable. Validar contra schema rígido nos haría fallar con cambios menores de Meta. Suficiente: type assertions en el handler.

**Revisitar**: cuando el agente tenga >1000 mensajes/día, considerar `zod` para validación dura.

## D6: Validar `from` y `wamid` no-vacíos antes de procesar

**Decisión**: en `processWebhook`, después de extraer `from` y `wamid`, verificar que ambos sean strings no vacíos. Si alguno es vacío → log warn + return sin procesar.

**Razón**: Meta puede entregar payloads donde `value.messages` existe pero el primer elemento es un status update con `from` o `id` ausentes/vacíos. Sin este guard, `handleIncomingMessage` se llamaría con `from=""`, creando un lead con número vacío y rompiendo la clave de dedup de wamid.

**Trazabilidad**: bug #9 del code-review audit 2026-05-30. Implementado en `src/index.ts` función `processWebhook`.
