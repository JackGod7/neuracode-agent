# CLAUDE.md — Feature 000: foundations

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## Scope

**Archivos a modificar**:
- `src/db.ts` — reescribir `getOrCreateLead` con upsert, hacer `saveMessage` que throw
- `src/index.ts` — centralizar validación de TODAS las env vars aquí con `process.exit(1)`
- `supabase/migrations/` — agregar UNIQUE constraints si no existen

**Archivos a NO tocar**:
- `src/claude.ts` (scope de spec 003)
- `src/tools/` (scope de spec 004)
- `src/whatsapp.ts` — quitar el `throw` module-level solo después de que `index.ts` haga la validación

## Contexto técnico

- `getOrCreateLead` DEBE usar `upsert` con `onConflict: 'whatsapp_number'`. El patrón SELECT+INSERT actual tiene race condition documentada en decisions.md D1.
- `saveMessage` DEBE hacer `throw error` en vez de solo `logger.error`. Ver decisions.md D2.
- Centralizar validación de env vars en `index.ts` antes de cualquier `import` que las use. Ver decisions.md D3.
- `loadRecentMessages` ya es correcto (SELECT DESC + reverse) — no cambiar.

## Trampas conocidas

- `supabase.upsert()` con `ignoreDuplicates: false` retorna los datos actualizados; con `ignoreDuplicates: true` retorna null si hubo conflicto. Usar `false` para siempre obtener el lead.
- El `UNIQUE` constraint en `messages.wamid` debe existir en Supabase ANTES de que spec 005 pueda usar el patrón de dedup por UniqueViolation.
- No mover la validación de env vars a un archivo separado — `index.ts` es el único punto de entrada y ahí debe estar la guarda.
