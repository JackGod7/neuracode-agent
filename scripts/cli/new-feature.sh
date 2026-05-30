#!/usr/bin/env bash
# new-feature.sh — bootstrapea specs/NNN-nombre/ con los 5 archivos.
#
# Uso: bash scripts/cli/new-feature.sh 009 nombre-en-kebab

set -e

NUM=$1
NAME=$2

if [ -z "$NUM" ] || [ -z "$NAME" ]; then
  echo "Uso: $0 <NNN> <nombre-kebab-case>"
  exit 1
fi

DIR="specs/$NUM-$NAME"

if [ -d "$DIR" ]; then
  echo "❌ $DIR ya existe"
  exit 1
fi

mkdir -p "$DIR"

cat > "$DIR/CLAUDE.md" <<EOF
# CLAUDE.md — Feature $NUM: $NAME

## Scope
**Archivos a modificar**: [...]
**Archivos a NO tocar**: [...]

## Contexto técnico
[Qué debe saber Claude Code]

## Trampas conocidas
- [...]
EOF

cat > "$DIR/spec.md" <<EOF
# Spec $NUM — $NAME

## Objetivo
[Una frase]

## Por qué
[...]

## Alcance
### Incluye
- [...]

### NO incluye
- [...]

## Restricciones
| Constraint | Por qué |
|---|---|
| [...] | [...] |

## No-objetivos
- [...]

## Dependencias
- Specs previas: [...]
EOF

cat > "$DIR/hu.md" <<EOF
# Historias de usuario — Feature $NUM

## HU-$NUM-01: [Título]

**Como** [rol]
**Quiero** [acción]
**Para** [valor]

\`\`\`gherkin
Scenario: [happy path]
  Given [...]
  When [...]
  Then [...]
\`\`\`
EOF

cat > "$DIR/decisions.md" <<EOF
# Decisiones locales — Feature $NUM

## D1: [Título]

**Decisión**: [...]
**Alternativa rechazada**: [...]
**Trade-off**: [...]
EOF

cat > "$DIR/acceptance.md" <<EOF
# Acceptance — Feature $NUM

## Tests
\`\`\`typescript
describe("Feature $NUM", () => {
  test("[criterio]");
});
\`\`\`

## Validación manual
- [ ] [...]

## Definition of done
- [ ] Tests pasan
- [ ] Deploy verde
EOF

echo "✓ Creado $DIR con 5 archivos"
ls -la "$DIR"
