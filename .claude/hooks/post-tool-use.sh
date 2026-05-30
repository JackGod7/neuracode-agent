#!/usr/bin/env bash
# post-tool-use.sh — Loggea cambios y valida formato tras Edit/Write.
#
# Dispara para tool calls de tipo Edit y Write.

set -e

LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"

PAYLOAD=$(cat)
TOOL=$(echo "$PAYLOAD" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // .tool_input.path // empty')

echo "$(date -Iseconds) [POST] $TOOL: $FILE_PATH" >> "$LOG_DIR/file-changes.log"

# Si el archivo es TypeScript, verificar que compile (no falla el hook, solo advierte)
if [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx ]]; then
  if command -v tsc &> /dev/null; then
    if ! npx --no-install tsc --noEmit "$FILE_PATH" 2>/dev/null; then
      echo "⚠️  El archivo $FILE_PATH tiene errores de TypeScript. Corre 'npm run typecheck' para detalles." >&2
    fi
  fi
fi

# Si se modificó knowledge/ recordar re-ingestar
if [[ "$FILE_PATH" == knowledge/* ]]; then
  echo "💡 Modificaste knowledge/. No olvides correr 'npm run ingest' o '/ingest'." >&2
fi

# Si se modificó schema.sql recordar aplicar
if [[ "$FILE_PATH" == supabase/schema.sql ]]; then
  echo "💡 Modificaste schema.sql. Aplícalo en el SQL editor de Supabase." >&2
fi

exit 0
