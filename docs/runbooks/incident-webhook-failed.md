# Runbook — Incidente: Webhook devuelve 5xx

## Síntomas

- Meta marca el webhook como "Inactive" en el dashboard
- Logs de Railway muestran errores 500 en POST /webhook
- Leads reportan que no reciben respuesta

## Diagnóstico

### 1. Verificar healthcheck
```bash
curl https://<dominio>/health
```
- 200 → el servicio está vivo, problema en POST handler
- 502/503 → Railway no está corriendo el servicio

### 2. Logs de Railway
```bash
railway logs --tail 100
```
Buscar:
- `Firma inválida` → APP_SECRET no coincide
- `UnhandledRejection` → bug en handler
- `connect ETIMEDOUT` → Supabase o Anthropic API down

### 3. Validar firma manual
```bash
bash scripts/cli/test-webhook.sh 3000 text
# Si responde 403 → APP_SECRET local desactualizado
# Si responde 200 → problema en producción específicamente
```

## Causas comunes y fix

| Causa | Síntoma en logs | Fix |
|---|---|---|
| APP_SECRET cambió en Meta | "Firma inválida" repetido | Actualizar en Railway env vars |
| Anthropic API rate limit | `429` o `rate_limit_error` | Esperar o subir tier de Anthropic |
| Supabase down | `fetch failed` a `*.supabase.co` | Verificar status.supabase.com |
| OOM (memoria) | exit code 137 | Subir plan Railway o investigar leak |
| Cert SSL vencido | TLS handshake error | Railway maneja certs auto — abrir ticket |

## Comunicación

Si el incidente dura >15 min:

1. Avisar a Jack vía WhatsApp manual (no del agente — está caído)
2. Si hay leads activos en webinar: avisar por Discord
3. Post-mortem en `docs/runbooks/postmortems/YYYY-MM-DD-webhook-down.md`

## Prevención

- Healthcheck en Railway: ya configurado
- Alerta en Slack si /health falla 3 veces seguidas: TODO Fase 1
- Eval nightly que verifica respuesta end-to-end: ver `.github/workflows/claude-eval.yml`
