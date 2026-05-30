#!/usr/bin/env bash
# pre-tool-use.sh — Guardrail antes de cada tool call de Claude Code.
#
# Claude Code envía un JSON por stdin con la estructura:
# { "session_id": "...", "tool_name": "Bash", "tool_input": { "command": "..." } }
#
# Exit code 0 → permite ejecución
# Exit code 2 → bloquea y muestra mensaje al usuario

set -e

LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"

# Leer payload de stdin
PAYLOAD=$(cat)
COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // empty')
TOOL=$(echo "$PAYLOAD" | jq -r '.tool_name // empty')

# Log para auditoría
echo "$(date -Iseconds) [PRE] $TOOL: $COMMAND" >> "$LOG_DIR/tool-calls.log"

# Blacklist
BLOCKED_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
  ":(){ :|:& };:"     # fork bomb
  "dd if=/dev/zero"
  "mkfs"
  "> /dev/sda"
  "curl.*\\| *sh"      # curl | sh patterns
  "wget.*\\| *bash"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "❌ BLOQUEADO por pre-tool-use hook: comando coincide con patrón peligroso '$pattern'" >&2
    echo "Si el comando es legítimo, edítalo manualmente en .claude/hooks/pre-tool-use.sh" >&2
    exit 2
  fi
done

# Validar que escritura sea dentro del repo
if echo "$COMMAND" | grep -qE "^(rm|mv|cp).*(\.\./|/etc/|/usr/|/var/|~/\\.ssh)"; then
  echo "❌ BLOQUEADO: intento de modificar archivos fuera del repo" >&2
  exit 2
fi

# Alerta (no bloqueo) sobre comandos sensibles
if echo "$COMMAND" | grep -qE "(git push.*--force|git reset --hard|DROP TABLE|TRUNCATE)"; then
  echo "⚠️  Comando potencialmente destructivo detectado: $COMMAND" >&2
  echo "⚠️  Loggeado en $LOG_DIR/tool-calls.log" >&2
  # No bloqueamos, solo advertimos
fi

exit 0
