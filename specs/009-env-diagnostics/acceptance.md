# Acceptance criteria — 009: env-diagnostics

## AC-1: Log accionable por var faltante
- [ ] Cuando falta `SUPABASE_URL`, el log incluye campo `hint` con URL de Supabase dashboard
- [ ] Cuando falta `ANTHROPIC_API_KEY`, el log incluye campo `hint` con URL de console.anthropic.com
- [ ] Cuando falta `APP_SECRET`, el log incluye campo `hint` con URL de Meta for Developers

## AC-2: Todas las vars faltantes en un solo log
- [ ] Si faltan 3 vars, aparecen en UN solo mensaje de log (no 3 mensajes separados con exit)
- [ ] El campo `missing` es un array con todos los diagnósticos

## AC-3: Sin fugas de valores
- [ ] Los valores de las vars NO aparecen en ningún log (ni truncados)
- [ ] Solo aparece el nombre y si está seteada o no (`set: true/false`)

## AC-4: Arranque limpio
- [ ] Con todas las vars presentes, el log imprime "Env vars OK" y el proceso continúa
- [ ] `exit(1)` solo ocurre cuando hay al menos una var faltante

## AC-5: Typecheck pasa
- [ ] `npm run typecheck` sin errores después del cambio
