# Spec 004 — tools-individuales

| Versión | Fecha | Autor | Estado | Notas |
|---|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented | Spec inicial desde código existente. Bug #7 (agendar_call dead ternary) trazado aquí. |

## Objetivo

Implementar las 5 tools que Claude puede invocar: `consultar_bootcamp`, `inscribir_webinar`, `agendar_call`, `generar_link_pago`, `escalar_a_jack`.

## Por qué

Sin tools, Claude no puede hacer nada más que responder texto libre. Las tools son el vínculo entre la conversación y las acciones reales: DB, APIs externas, notificaciones.

## Alcance

### Incluye
- `consultar_bootcamp` — búsqueda RAG en `knowledge/`
- `inscribir_webinar` — registra lead en `webinar_signups`, valida email
- `agendar_call` — genera link Cal.com, actualiza lead status
- `generar_link_pago` — crea preference en Mercado Pago (scope compartido con spec 006)
- `escalar_a_jack` — notifica a Jack vía WhatsApp, marca lead como escalated
- `src/tools/index.ts` — registry y `executeTool` con idempotency cache (spec 005 Capa 2)

### NO incluye
- Lógica de idempotencia en cada tool — el wrapper `executeTool` en `index.ts` la aplica (spec 005)
- Webhook de confirmación de pago — spec 006
- Descarga de media — spec 007
- Lógica del loop de Claude — spec 003

## Restricciones

| Constraint | Por qué |
|---|---|
| Cada tool retorna `{ ok: boolean, ... }` o lanza excepción — nunca swallow silencioso | `executeTool` convierte excepciones en `{ error: "..." }` para Claude; si swallow, Claude no sabe que falló |
| `escalar_a_jack`: `updateLead` va ANTES de `sendWhatsAppMessage` | updateLead puede fallar; si Jack fue notificado pero el lead no marcado, genera inconsistencia peor |
| `agendar_call` urgencia="alta" → status="hot", urgencia!="alta" → status="qualified" | Diferencia de prioridad para seguimiento de Jack |
| `generar_link_pago` NO genera link para tier "enterprise" — redirige a `agendar_call` | Enterprise necesita cotización manual, no precio fijo |
| Email en `inscribir_webinar` validado con regex básico antes de llamar a DB | Evitar registros con emails inválidos que rompen envío futuro de confirmación |
| Las tools no conocen de idempotencia — el wrapper `executeTool` la maneja | Separación de responsabilidades; tools son stateless respecto a cache |

## No-objetivos

- Implementar el envío de email de confirmación de webinar — Fase 2
- Implementar sendTemplate para leads fuera de ventana 24h — Fase 3
- Procesamiento de pagos en la tool (solo genera link)

## Dependencias

- Spec 000 (DB: leads, webinar_signups, payment_links)
- Spec 002 (RAG: consultarBootcamp usa searchKnowledge)
- Spec 005 (idempotencia: executeTool usa tool_call_cache)
- Spec 006 (pagos: generar_link_pago usa MP SDK)
- `CAL_LINK` env para agendar_call (opcional, default `https://cal.com/jack-aguilar`)
- `JACK_WHATSAPP` env para escalar_a_jack (opcional, si no está → no notifica)
- `BASE_URL` env para generar_link_pago (URLs de callback de MP)
