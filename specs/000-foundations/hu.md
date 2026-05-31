# Historias de usuario — Feature 000: foundations

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |
| v1.1.0 | 2026-05-30 | Claude Code | implemented |

## HU-000-01: Creación atómica de lead

**Como** sistema que recibe webhooks concurrentes de Meta  
**Quiero** que `getOrCreateLead` sea atómica  
**Para** que dos webhooks simultáneos del mismo número no creen duplicados ni tiren excepción

```gherkin
Scenario: Primer mensaje de un número nuevo
  Given el número "+51987654321" no existe en la tabla leads
  When se llama a getOrCreateLead("+51987654321")
  Then se crea una fila en leads con status="new"
  And se retorna el lead recién creado

Scenario: Número ya existente
  Given el número "+51987654321" ya existe en leads con status="qualified"
  When se llama a getOrCreateLead("+51987654321")
  Then NO se crea fila nueva
  And se retorna el lead existente con sus datos actuales

Scenario: Dos llamadas concurrentes para el mismo número nuevo
  Given el número "+51987654321" no existe en leads
  When dos instancias llaman a getOrCreateLead("+51987654321") simultáneamente
  Then exactamente una fila existe en leads al final
  And ambas llamadas retornan el mismo lead (sin excepción)
```

## HU-000-02: Persistencia de mensajes con error propagado

**Como** loop de Claude que necesita saber si el mensaje fue guardado  
**Quiero** que `saveMessage` lance excepción si el insert falla  
**Para** que el caller pueda abortar el procesamiento en vez de responder sin contexto

```gherkin
Scenario: Insert exitoso
  Given Supabase está disponible
  When se llama a saveMessage({ leadId, wamid, role: "user", content: "hola" })
  Then el mensaje aparece en la tabla messages
  And la función retorna void sin excepción

Scenario: Insert falla (Supabase error)
  Given Supabase retorna un error en el insert
  When se llama a saveMessage(...)
  Then la función lanza una excepción con el error de Supabase
  And el caller puede capturarla y manejarla

Scenario: wamid duplicado
  Given un mensaje con wamid "wamid.ABC123" ya existe en messages
  When se llama a saveMessage({ wamid: "wamid.ABC123", ... })
  Then la función lanza excepción con código de unique violation
  And el caller (spec 005) la interpreta como "ya procesado"
```

## HU-000-03: Validación de env vars en startup

**Como** operador que despliega en Railway  
**Quiero** que el proceso falle inmediatamente con mensaje claro si falta una env var  
**Para** no descubrir el problema cuando el primer usuario escriba

```gherkin
Scenario: Todas las env vars presentes
  Given todas las vars requeridas están en el entorno
  When se ejecuta "node dist/index.js"
  Then el servidor arranca y loggea "Escuchando en :PORT"

Scenario: Falta ANTHROPIC_API_KEY
  Given ANTHROPIC_API_KEY no está en el entorno
  When se ejecuta "node dist/index.js"
  Then el proceso termina con exit code 1
  And loggea fatal: "Falta ANTHROPIC_API_KEY"
  And NO arranca el servidor HTTP

Scenario: Falta MP_ACCESS_TOKEN
  Given MP_ACCESS_TOKEN no está en el entorno
  When se ejecuta "node dist/index.js"
  Then el proceso termina con exit code 1
  And loggea fatal: "Falta MP_ACCESS_TOKEN"
```
