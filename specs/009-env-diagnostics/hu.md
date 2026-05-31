# Historias de usuario — 009: env-diagnostics

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## HU-009-01: Diagnóstico accionable al arrancar con vars faltantes

**Given** el servicio arranca en Railway con una o más vars requeridas sin valor
**When** el proceso de Node.js inicia
**Then** el log muestra exactamente cuáles vars faltan
**And** cada var faltante incluye un campo `hint` con la URL de dónde obtenerla
**And** el proceso termina con exit code 1

## HU-009-02: Arranque limpio cuando todas las vars están presentes

**Given** todas las vars requeridas tienen valor no vacío
**When** el proceso de Node.js inicia
**Then** el log muestra "Env vars OK" con la lista de vars verificadas
**And** el proceso continúa normalmente (no exit)

## HU-009-03: Múltiples vars faltantes reportadas juntas

**Given** faltan 3 vars requeridas
**When** el proceso inicia
**Then** el log muestra las 3 en un solo mensaje (no una por una con exit intermedio)
**And** el operador puede corregir todas de una vez antes de redesplegar
