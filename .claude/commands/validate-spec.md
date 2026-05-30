---
description: Valida que un spec esté completo antes de implementar
argument-hint: <NNN>
---

Valida la spec `specs/$1-*/` con los siguientes checks:

## Checklist de validación

1. Existen los 5 archivos: `CLAUDE.md`, `spec.md`, `hu.md`, `decisions.md`, `acceptance.md`
2. `spec.md` tiene secciones: Objetivo, Por qué, Alcance (Incluye/NO incluye), Restricciones, No-objetivos
3. `hu.md` tiene al menos 1 historia con escenarios Gherkin (Given/When/Then)
4. `acceptance.md` tiene tests automatizados Y validación manual Y definition of done
5. Si la spec referencia otras specs (ej "ver spec NNN"), esas existen
6. Si la spec menciona variables de entorno nuevas, están en `.env.example`
7. Si la spec menciona dependencias nuevas, están en `package.json`

## Output esperado

```
✓ specs/001-webhook-meta: COMPLETO — listo para implementar
✗ specs/004-tools-individuales: INCOMPLETO
  - falta: definition of done en acceptance.md
  - falta: HU-004-02 sin escenarios Gherkin
```

NO implementes nada. Solo valida y reporta.
