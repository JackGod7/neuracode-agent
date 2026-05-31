# Acceptance criteria — 009: env-diagnostics

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## AC-1: Log accionable por var faltante
- [x] Cuando falta `SUPABASE_URL`, el log incluye campo `hint` con URL de Supabase dashboard
- [x] Cuando falta `ANTHROPIC_API_KEY`, el log incluye campo `hint` con URL de console.anthropic.com
- [x] Cuando falta `APP_SECRET`, el log incluye campo `hint` con URL de Meta for Developers

## AC-2: Todas las vars faltantes en un solo log
- [x] Si faltan 3 vars, aparecen en UN solo mensaje de log (no 3 mensajes separados con exit)
- [x] El campo `missing` es un array con todos los diagnósticos

## AC-3: Sin fugas de valores
- [x] Los valores de las vars NO aparecen en ningún log (ni truncados)
- [x] Solo aparece el nombre y si está seteada o no (`set: true/false`)

## AC-4: Arranque limpio
- [x] Con todas las vars presentes, el log imprime "Env vars OK" y el proceso continúa
- [x] `exit(1)` solo ocurre cuando hay al menos una var faltante

## AC-5: Typecheck pasa
- [x] `npm run typecheck` sin errores después del cambio
