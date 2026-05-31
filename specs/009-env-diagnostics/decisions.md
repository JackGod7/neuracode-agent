# Decisiones técnicas — 009: env-diagnostics

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## Estructura del diagnóstico

**Elegido**: array de objetos `{ name, set, hint }` loggeado como campo pino
**Alternativa descartada**: múltiples `logger.fatal` separados — pierde la visión global

## Dónde vive el mapa de hints

**Elegido**: constante inline en `src/index.ts` junto al array `REQUIRED_ENV_VARS`
**Alternativa descartada**: archivo separado `src/env-config.ts` — over-engineering para 8 vars

## Sin dependencias nuevas

El diagnóstico usa solo `logger` (pino) ya existente. Sin librerías extra.
