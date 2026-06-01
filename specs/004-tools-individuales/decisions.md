# Decisiones locales — Feature 004: tools-individuales

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## D1: Tools no conocen de idempotencia — el wrapper `executeTool` la maneja

**Decisión**: cada tool es una función pura que ejecuta su lógica sin saber de cache ni dedup. `executeTool` en `tools/index.ts` aplica tool_call_cache (spec 005 Capa 2) antes de invocar cualquier tool.

**Trade-off**: todas las tools heredan idempotencia sin modificarse. Si una nueva tool necesita comportamiento distinto (e.g., nunca cachear), se pasa `noCache: true` al wrapper — pero en Fase 0 todas cachean igual.

## D2: `agendar_call` urgencia="alta" → status="hot"

**Decisión**: `urgencia === "alta" ? "hot" : "qualified"`.

**Bug corregido**: el código original tenía `"qualified" : "qualified"` (ternario muerto). El ternario muerto significaba que urgencia nunca diferenciaba el status del lead. Corregido en code-review audit 2026-05-30 (bug #8).

**Razón del status "hot"**: Jack filtra en Supabase por `status = 'hot'` para saber qué leads priorizar. Sin diferenciación, todos los leads que agendaron call se veían igual.

## D3: `escalar_a_jack` — `updateLead` va antes de `sendWhatsAppMessage`

**Decisión**: primero marcar el lead como "escalated" en DB, luego notificar a Jack por WhatsApp.

**Razón**: si Jack fue notificado pero el lead no quedó marcado en DB, el agente podría volver a tratar el lead normalmente en el siguiente mensaje → confusión. Si el DB update falla (excepción), `executeTool` retorna `{ error: "..." }` a Claude sin notificar a Jack — peor UX pero más consistente.

**Mitigación del bug**: si `updateLead` lanza, la excepción sube a `executeTool` que la convierte en error. Claude recibe error y puede re-intentar o decirle al usuario que hubo un problema. Jack NO es notificado cuando esto ocurre — gap conocido, aceptado en Fase 0.

## D4: `generar_link_pago` no genera link para "enterprise"

**Decisión**: si `producto === "enterprise"`, retornar `{ ok: false, message: "...usa agendar_call..." }` sin llamar a MP.

**Razón**: Enterprise se cotiza caso por caso (USD 6500 base). El lead necesita una llamada con Jack para definir alcance, número de asientos, soporte, etc. Un link de pago directo a USD 6500 es demasiado blunt para una venta compleja.

## D5: Validación de email en `inscribir_webinar` con regex básico

**Decisión**: `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` → retornar `{ ok: false }` sin tocar DB.

**Alternativa rechazada**: sin validación (dejar que Supabase o el email provider fallen). Problema: registros inválidos quedan en DB y el envío de confirmación futuro falla silenciosamente.

**Trade-off**: regex básico no cubre todos los casos edge de RFC 5321, pero es suficiente para detectar errores comunes ("noesunEmail", "falta@", "@sindominio").
