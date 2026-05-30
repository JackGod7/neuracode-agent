---
description: Crea estructura completa para una nueva feature en specs/
argument-hint: <numero> <nombre-kebab-case>
---

Crea una nueva carpeta `specs/$1-$2/` con los 5 archivos base (CLAUDE.md, spec.md, hu.md, decisions.md, acceptance.md) usando las plantillas en `specs/_template-CLAUDE.md`.

Antes de crearla:
1. Verifica que el número $1 no esté en uso ya (otro spec con mismo prefijo)
2. Verifica que el nombre $2 sea kebab-case válido
3. Pídeme confirmación antes de crear

Después de crearla:
1. Muéstrame la estructura creada
2. Pregúntame por el `objetivo` (1 frase) y el `por qué` para llenar `spec.md` inmediatamente
3. NO implementes código aún — solo crea los specs
