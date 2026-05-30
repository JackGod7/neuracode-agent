# Runbook — Deploy

## Pre-deploy checklist

- [ ] `npm run typecheck` pasa local
- [ ] Tests pasan en CI (GitHub Actions verde)
- [ ] Specs de las features nuevas tienen `acceptance.md` con definition of done
- [ ] Variables de entorno en Railway están actualizadas (verificar `.env.example`)
- [ ] Si hubo cambios en `supabase/schema.sql`, aplicado en Supabase prod

## Deploy

1. `git push origin main`
2. Railway detecta y arranca build
3. Esperar status "Active" en dashboard de Railway (~2 min)
4. Verificar healthcheck: `curl https://<dominio>/health` → `{"ok":true}`

## Verificación post-deploy

- [ ] `/health` responde 200
- [ ] Mandar WhatsApp real al número de prueba → llegó respuesta del agente
- [ ] Logs en Railway sin errores 5xx
- [ ] Si hubo cambios en knowledge: `gh workflow run ingest-knowledge.yml`

## Rollback

Si algo se rompió:

```bash
# desde local
git revert HEAD
git push origin main
```

Railway redeploya automáticamente. Tiempo total: ~3 min.

## Incidente: webhook devuelve 5xx

Ver `incident-webhook-failed.md`.
