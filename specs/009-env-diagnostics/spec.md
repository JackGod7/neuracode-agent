# Spec 009: env-diagnostics

## Qué se construye

Al arrancar, si falta alguna variable de entorno requerida, el app imprime un diagnóstico
accionable por variable: nombre, estado, y URL exacta de dónde obtenerla.
El proceso termina con `exit(1)` solo después de mostrar TODAS las vars faltantes juntas.

## Por qué

Cuando Railway muestra "Crashed", el operador no sabe qué falta.
El log actual dice `["SUPABASE_URL"]` pero no dice dónde conseguirla.
Esto genera fricción en onboarding y en cada nuevo deploy a producción.

## Variables cubiertas y sus fuentes

| Variable | Fuente | URL de documentación |
|---|---|---|
| `VERIFY_TOKEN` | Inventado por el operador | — string aleatorio, mínimo 16 chars |
| `APP_SECRET` | Meta for Developers | https://developers.facebook.com → App → Configuración básica → App secret |
| `WHATSAPP_TOKEN` | Meta for Developers | https://developers.facebook.com → App → WhatsApp → API Setup → Token de acceso |
| `PHONE_NUMBER_ID` | Meta for Developers | https://developers.facebook.com → App → WhatsApp → API Setup → Phone number ID |
| `SUPABASE_URL` | Supabase dashboard | https://supabase.com/dashboard/project/<ref>/settings/api → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard | https://supabase.com/dashboard/project/<ref>/settings/api → service_role key |
| `ANTHROPIC_API_KEY` | Anthropic Console | https://console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | OpenAI Platform | https://platform.openai.com/api-keys |

## Restricciones

- Solo stdout/stderr — sin side effects externos al arrancar
- No exponer valores de vars en logs
- Formato de log: JSON estructurado (pino) con campo `hint` por var faltante
