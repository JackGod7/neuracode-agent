# Historias de usuario — Feature 010: embedding-router

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-06-01 | Claude Code | draft |

## HU-010-01: Fallback automático entre providers

**Como** sistema que genera embeddings  
**Quiero** que si el provider primario falla, se use el secundario automáticamente  
**Para** que el agente no deje de responder por una cuota agotada

```gherkin
Scenario: Provider primario falla por quota → fallback a secundario
  Given EMBEDDING_PROVIDER_ORDER=openai,gemini
    And OpenAI retorna 429 RateLimitError
  When searchKnowledge("precio del bootcamp") se ejecuta
  Then FallbackChain intenta OpenAI → falla
    And FallbackChain intenta Gemini → éxito
    And se retorna el resultado con embeddings de Gemini
    And se loggea warn: "provider openai falló, usando gemini"

Scenario: Todos los providers fallan → retorna []
  Given todos los providers en el chain retornan error
  When searchKnowledge("precio")
  Then retorna []
    And se loggea error con lista de providers intentados
```

## HU-010-02: Ingest con provider configurable

**Como** operador  
**Quiero** correr `npm run ingest` y que use el provider configurado en env  
**Para** poder cambiar de OpenAI a Gemini sin modificar código

```gherkin
Scenario: Ingest con Gemini como provider primario
  Given EMBEDDING_PROVIDER_ORDER=gemini,openai
    And GEMINI_API_KEY válido
  When ejecuto "npm run ingest"
  Then cada chunk se embebe con Gemini (768 dims)
    And se inserta en columna embedding_768
    And provider_used = "gemini"
    And exit 0

Scenario: Ingest con OpenAI como provider primario
  Given EMBEDDING_PROVIDER_ORDER=openai,gemini
    And OPENAI_API_KEY válido
  When ejecuto "npm run ingest"
  Then cada chunk se embebe con OpenAI (1536 dims)
    And se inserta en columna embedding_1536
    And provider_used = "openai"
```

## HU-010-03: Búsqueda usa el mismo provider que ingestó

**Como** sistema  
**Quiero** que `searchKnowledge` use el provider que generó los embeddings en la tabla  
**Para** que la similitud coseno sea válida (mismo espacio vectorial)

```gherkin
Scenario: Search con provider matching ingest
  Given knowledge fue ingestada con gemini (provider_used="gemini")
    And EMBEDDING_PROVIDER_ORDER=gemini,openai
  When searchKnowledge("precio VIP")
  Then genera query embedding con Gemini (768 dims)
    And RPC match_knowledge usa columna embedding_768
    And retorna resultados con similarity > 0

Scenario: Mismatch de provider → resultados degradados (warning)
  Given knowledge fue ingestada con openai
    And EMBEDDING_PROVIDER_ORDER=gemini,openai (Gemini es primario)
  When searchKnowledge("precio")
  Then loggea warn: "provider activo (gemini) distinto al que ingestó (openai)"
    And usa openai como fallback para mantener compatibilidad
```

## HU-010-04: Cambiar provider sin redeploy

**Como** operador  
**Quiero** cambiar `EMBEDDING_PROVIDER_ORDER` en Railway y re-ingestar  
**Para** probar Gemini vs OpenAI sin tocar código

```gherkin
Scenario: Switch de OpenAI a Gemini en producción
  Given EMBEDDING_PROVIDER_ORDER=openai en Railway
  When cambio a EMBEDDING_PROVIDER_ORDER=gemini,openai y redeploy
    And ejecuto "npm run ingest"
  Then el agente usa Gemini para nuevas búsquedas
    And embeddings anteriores de OpenAI siguen en embedding_1536 (no se borran)
```
