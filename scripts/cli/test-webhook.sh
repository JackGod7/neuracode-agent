#!/usr/bin/env bash
# test-webhook.sh — Manda payload de prueba con firma HMAC válida al webhook local.
#
# Uso: bash scripts/cli/test-webhook.sh [puerto] [tipo]
#   tipo: text (default) | audio | image | status

set -e

PORT=${1:-3000}
TIPO=${2:-text}

# Cargar APP_SECRET de .env
if [ ! -f .env ]; then
  echo "❌ No existe .env. Copia desde .env.example y completa."
  exit 1
fi
export $(grep -v '^#' .env | xargs)

case "$TIPO" in
  text)
    BODY='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"51999888777","phone_number_id":"'"$PHONE_NUMBER_ID"'"},"contacts":[{"profile":{"name":"Test Lead"},"wa_id":"51999111222"}],"messages":[{"from":"51999111222","id":"wamid.TEST'"$(date +%s)"'","timestamp":"'"$(date +%s)"'","text":{"body":"Hola, cuéntame del bootcamp"},"type":"text"}]},"field":"messages"}]}]}'
    ;;
  audio)
    BODY='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"'"$PHONE_NUMBER_ID"'"},"messages":[{"from":"51999111222","id":"wamid.AUDIO'"$(date +%s)"'","timestamp":"'"$(date +%s)"'","type":"audio","audio":{"id":"media123","mime_type":"audio/ogg"}}]},"field":"messages"}]}]}'
    ;;
  status)
    BODY='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","statuses":[{"id":"wamid.STATUS'"$(date +%s)"'","status":"delivered","timestamp":"'"$(date +%s)"'","recipient_id":"51999111222"}]},"field":"messages"}]}]}'
    ;;
  *)
    echo "❌ Tipo desconocido: $TIPO. Usa: text, audio, status"
    exit 1
    ;;
esac

# Generar firma HMAC SHA256
SIGNATURE="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$APP_SECRET" | awk '{print $2}')"

echo "→ POST http://localhost:$PORT/webhook"
echo "→ Tipo: $TIPO"
echo "→ Firma: $SIGNATURE"
echo ""

curl -s -X POST "http://localhost:$PORT/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$BODY" \
  -w "\n\n← Status: %{http_code}\n← Tiempo: %{time_total}s\n"
