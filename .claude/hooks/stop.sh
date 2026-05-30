#!/usr/bin/env bash
# stop.sh — Se ejecuta cuando Claude Code termina su turno.
# Corre validaciones rápidas y reporta estado.

set +e  # no fallar el hook por errores de validación

LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"

echo "$(date -Iseconds) [STOP] Sesión terminada" >> "$LOG_DIR/sessions.log"

# Typecheck rápido
if [ -f "package.json" ] && grep -q '"typecheck"' package.json; then
  echo ""
  echo "🔍 Corriendo typecheck..."
  if npm run typecheck --silent 2>&1 | tail -5; then
    echo "✓ TypeScript OK"
  else
    echo "⚠️  TypeScript tiene errores. Corre 'npm run typecheck' para detalles."
  fi
fi

# Recordar specs sin acceptance
INCOMPLETE_SPECS=$(find specs -maxdepth 2 -name "acceptance.md" -size -200c 2>/dev/null | head -5)
if [ -n "$INCOMPLETE_SPECS" ]; then
  echo ""
  echo "📝 Specs con acceptance incompleto:"
  echo "$INCOMPLETE_SPECS"
fi

exit 0
