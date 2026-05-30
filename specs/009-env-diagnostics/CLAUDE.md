# CLAUDE.md — Feature 009: env-diagnostics

## Scope de archivos

**Archivos que vas a modificar**:
- `src/index.ts` — reemplazar bloque de validación de env vars con diagnóstico detallado

**Archivos que NO tocas en esta feature**:
- `src/claude.ts`, `src/whatsapp.ts`, `src/db.ts` — fuera de scope
- `supabase/schema.sql` — sin cambios de DB

## Contexto técnico

El app ya valida env vars al boot con `process.exit(1)` si falta alguna.
El problema: el log solo dice cuáles faltan, pero no de dónde obtenerlas.
Railway no muestra contexto — el operador ve "Crashed" sin saber qué hacer.

Cada var tiene una fuente canónica (Meta, Supabase, Anthropic, etc.).
El diagnóstico debe mapear `VAR_NAME → fuente → instrucción`.

## Trampas conocidas

- No loggear los valores de las vars — solo presencia/ausencia
- No agregar vars nuevas al `REQUIRED_ENV_VARS` array sin actualizar este spec
- El bloque de diagnóstico debe correr ANTES de cualquier import que lea process.env

## Lo que NO va a esta feature

- Validación de formato/valor de las vars (ej: que SUPABASE_URL sea una URL válida) → spec futura
- Health endpoint que exponga estado de vars → spec futura
