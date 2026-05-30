# Historias de usuario — Feature 001

## HU-001-01: Verificar webhook con Meta

**Como** Meta Cloud API
**Quiero** confirmar que el webhook es controlado por la app dueña
**Para** habilitar la entrega de eventos

### Escenarios

```gherkin
Scenario: Token correcto en handshake
  Given el servidor está corriendo en el puerto 3000
    And la variable VERIFY_TOKEN = "abc123"
  When recibo GET /webhook?hub.mode=subscribe&hub.verify_token=abc123&hub.challenge=xyz
  Then respondo con status 200
    And el body es exactamente "xyz"

Scenario: Token incorrecto en handshake
  Given el servidor está corriendo
    And la variable VERIFY_TOKEN = "abc123"
  When recibo GET /webhook?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=xyz
  Then respondo con status 403

Scenario: Mode incorrecto en handshake
  When recibo GET /webhook?hub.mode=unsubscribe&hub.verify_token=abc123&hub.challenge=xyz
  Then respondo con status 403
```

---

## HU-001-02: Recibir mensaje de texto firmado

**Como** Meta Cloud API
**Quiero** entregar un mensaje entrante con prueba criptográfica de origen
**Para** que el agente pueda procesarlo con confianza

### Escenarios

```gherkin
Scenario: Mensaje válido con firma correcta
  Given el servidor está corriendo
    And APP_SECRET = "secret_xyz"
  When recibo POST /webhook
    With header x-hub-signature-256 = HMAC-SHA256(body, "secret_xyz")
    With body = mensaje de texto válido de Meta
  Then respondo con status 200 en menos de 2 segundos
    And se loggea info con campos { from, wamid, text }

Scenario: Mensaje con firma inválida
  When recibo POST /webhook
    With header x-hub-signature-256 = "sha256=invalido"
  Then respondo con status 403
    And se loggea warn con mensaje "Firma inválida"
    And NO se procesa el body

Scenario: Mensaje sin header de firma
  When recibo POST /webhook sin header x-hub-signature-256
  Then respondo con status 403
```

---

## HU-001-03: Filtrar eventos que no son mensajes de texto

**Como** desarrollador
**Quiero** ignorar status updates y tipos no soportados en Fase 0
**Para** no romper la app con payloads inesperados

### Escenarios

```gherkin
Scenario: Status update (delivered/read/sent)
  When recibo POST /webhook con value.statuses pero sin value.messages
  Then respondo 200
    And no se loggea como mensaje entrante

Scenario: Mensaje tipo audio
  When recibo POST /webhook con message.type = "audio"
  Then respondo 200
    And se loggea "Tipo no soportado en Fase 0"
    And NO se llama a Claude

Scenario: Mensaje tipo image
  When recibo POST /webhook con message.type = "image"
  Then respondo 200
    And se loggea "Tipo no soportado en Fase 0"
```

---

## HU-001-04: Healthcheck para Railway

**Como** Railway
**Quiero** verificar que el servicio está vivo
**Para** mantener el deploy estable

```gherkin
Scenario: Healthcheck responde
  When recibo GET /health
  Then respondo con status 200
    And el body es { "ok": true }
```
