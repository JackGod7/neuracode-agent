# Historias de usuario — Feature 003: tool-use-loop

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## HU-003-01: Respuesta simple sin tools

**Como** lead que envía un mensaje de WhatsApp  
**Quiero** recibir una respuesta coherente del agente  
**Para** obtener información sobre el bootcamp o webinars

```gherkin
Scenario: Mensaje simple, Claude responde directo
  Given el lead "+51987654321" envía "¿cuánto cuesta el bootcamp?"
  When handleIncomingMessage procesa el mensaje
  Then Claude invoca consultar_bootcamp (stop_reason="tool_use")
  And luego retorna stop_reason="end_turn" con texto de respuesta
  And el texto se envía por WhatsApp al lead
  And el mensaje del usuario y la respuesta del asistente quedan en messages
```

## HU-003-02: Loop con múltiples tools

**Como** sistema  
**Quiero** que el loop maneje varias tool calls consecutivas  
**Para** que Claude pueda consultar e inscribir en una sola conversación

```gherkin
Scenario: Claude llama dos tools en secuencia
  Given lead confirma nombre, email y webinar W1
  When Claude llama consultar_bootcamp, luego inscribir_webinar
  Then el loop ejecuta ambas tools
  And Claude recibe ambos tool_results
  And responde con confirmación de inscripción
  And iterations <= MAX_TOOL_ITERATIONS al terminar
```

## HU-003-03: max_tokens agotado

**Como** operador  
**Quiero** que el loop maneje max_tokens explícitamente  
**Para** que el usuario reciba un mensaje útil y yo vea un error en logs

```gherkin
Scenario: Claude alcanza el límite de tokens
  Given Claude retorna stop_reason="max_tokens"
  When el loop detecta ese stop_reason
  Then se loggea con level="error" y stop_reason="max_tokens"
  And se envía al lead: "Mi respuesta fue muy larga. ¿Puedes ser más específico?"
  And la respuesta de fallback se persiste en messages
  And el loop NO reintenta con más tokens
```

## HU-003-04: Tool loop agotado (MAX_TOOL_ITERATIONS)

**Como** operador  
**Quiero** saber cuando Claude se queda atascado llamando tools  
**Para** poder detectar loops infinitos y mejorar el system prompt

```gherkin
Scenario: Claude llama tools 5 veces sin end_turn
  Given Claude retorna stop_reason="tool_use" en 5 iteraciones consecutivas
  When el while-loop llega a iterations === MAX_TOOL_ITERATIONS
  Then se loggea con level="error": "tool loop agotado tras N iteraciones"
  And se envía fallback amigable al lead
  And el loop termina sin lanzar excepción al webhook handler
```

## HU-003-05: Historial con alternación correcta

**Como** sistema  
**Quiero** que el array messages enviado a Claude siempre alterne user/assistant  
**Para** evitar errores HTTP 400 de la API de Anthropic

```gherkin
Scenario: Historial limpio (alternación correcta)
  Given la DB tiene: [user, assistant, user, assistant]
  When se construye el messages array
  Then el array tiene exactamente esa secuencia
  And Claude API acepta la llamada

Scenario: Historial con mensajes consecutivos del mismo rol
  Given la DB tiene: [user, user, assistant] (ráfaga de mensajes)
  When se construye el messages array
  Then el array es reparado para alternar correctamente
  And Claude API NO retorna 400
```
