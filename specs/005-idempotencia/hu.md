# Historias de usuario — Feature 005: Idempotencia

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | draft |

## HU-005-01: Deduplicación de webhook por wamid (Capa 1)

**Como** sistema que recibe retries de Meta  
**Quiero** que el mismo wamid solo se procese una vez  
**Para** que un usuario no reciba respuestas duplicadas ni se generen dos links de pago

```gherkin
Scenario: Primer webhook con wamid nuevo
  Given el wamid "wamid.HBgLNTE5ABC123" no existe en messages
  When Meta entrega POST /webhook con ese wamid
  Then el mensaje se procesa normalmente
  And se inserta en messages con ese wamid
  And el lead recibe respuesta del agente

Scenario: Segundo webhook con el mismo wamid (Meta retry)
  Given el wamid "wamid.HBgLNTE5ABC123" ya existe en messages
  When Meta entrega el mismo POST /webhook por segunda vez
  Then el sistema retorna 200 inmediatamente
  And NO se invoca handleIncomingMessage
  And NO se genera respuesta adicional al lead
  And en logs aparece: "wamid duplicado, ignorado" con el wamid

Scenario: UniqueViolation no se propaga como 500
  Given Meta entrega dos POSTs con el mismo wamid casi simultáneamente
  When ambos pasan la validación de firma
  Then ambos retornan 200
  And solo uno procesa el mensaje (el que llegó primero al INSERT)
  And el segundo detecta UniqueViolation y lo trata como "ya procesado"
```

## HU-005-02: Cache de tool calls por hash de input (Capa 2)

**Como** sistema que ejecuta tools en el loop de Claude  
**Quiero** que la misma tool con el mismo input dentro de 60s devuelva resultado cacheado  
**Para** que un retry de Claude no vuelva a llamar a OpenAI ni a Supabase innecesariamente

```gherkin
Scenario: Primera llamada a tool — no hay cache
  Given no existe entry en tool_call_cache para (leadId, "consultar_bootcamp", {query:"precio"})
  When Claude llama consultar_bootcamp con query="precio"
  Then se ejecuta la tool normalmente (llama a OpenAI + Supabase)
  And se inserta el resultado en tool_call_cache
  And se retorna el resultado a Claude

Scenario: Segunda llamada a misma tool dentro de 60s
  Given existe entry en tool_call_cache creado hace 30s para mismo (leadId, tool, input)
  When Claude llama la misma tool con mismo input
  Then NO se ejecuta la tool (no llama a OpenAI ni Supabase)
  And se retorna el resultado cacheado
  And en logs aparece: "tool cache hit" con tool_name e idempotency_key

Scenario: Input con keys en distinto orden → mismo cache
  Given existe cache para { query: "precio", source: "bootcamp" }
  When Claude llama con { source: "bootcamp", query: "precio" }
  Then es cache hit (mismo hash por normalización de keys)

Scenario: Tool que lanza excepción no se cachea
  Given la tool falla con un error
  When executeTool captura la excepción
  Then NO se inserta en tool_call_cache
  And Claude puede reintentar la tool en la siguiente iteración

Scenario: TTL expirado — re-ejecuta
  Given existe entry en tool_call_cache creado hace 61+ segundos
  When Claude llama la misma tool con mismo input
  Then se ejecuta la tool normalmente (TTL expirado)
  And se actualiza tool_call_cache con el nuevo resultado
```

## HU-005-03: Idempotencia de external_reference en Mercado Pago (Capa 3)

**Como** sistema que genera links de pago  
**Quiero** que el mismo lead no pueda tener dos preferences activas para el mismo producto  
**Para** evitar el doble cobro si Claude llama generar_link_pago dos veces

```gherkin
Scenario: Primer link de pago — preference creada
  Given el lead "lead-uuid-123" no tiene preference activa para "cohort"
  When Claude llama generar_link_pago({ producto: "cohort", nombre: "Ana" })
  Then se crea preference en Mercado Pago con external_reference="lead-uuid-123:cohort"
  And se retorna init_point al lead

Scenario: Segundo link de pago para mismo lead+producto (tool retry de Claude)
  Given ya existe entry en tool_call_cache para (leadId, "generar_link_pago", {producto:"cohort",...})
  When Claude llama generar_link_pago por segunda vez
  Then se retorna el init_point cacheado (Capa 2 actúa primero)
  And NO se crea segunda preference en Mercado Pago
```
