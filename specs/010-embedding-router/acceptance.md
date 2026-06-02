# Acceptance — Feature 010: embedding-router

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-06-01 | Claude Code | draft |

## Tests automatizados

Ubicación: `tests/010-embedding-router.test.ts`

```typescript
describe("010-embedding-router: EmbeddingProvider interface", () => {
  test("OpenAIEmbeddingProvider.embed retorna vector de 1536 dims");
  test("GeminiEmbeddingProvider.embed retorna vector de 768 dims");
  test("OpenAIEmbeddingProvider.name = 'openai'");
  test("GeminiEmbeddingProvider.name = 'gemini'");
});

describe("010-embedding-router: FallbackChain", () => {
  test("primer provider exitoso → retorna su resultado sin intentar el siguiente");
  test("primer provider falla → loggea warn + intenta el segundo");
  test("todos fallan → retorna null + loggea error");
  test("chain con un solo provider → comportamiento normal sin fallback");
});

describe("010-embedding-router: factory desde env", () => {
  test("EMBEDDING_PROVIDER_ORDER=gemini,openai → chain [Gemini, OpenAI]");
  test("EMBEDDING_PROVIDER_ORDER ausente → chain [OpenAI] (default)");
  test("provider desconocido en ORDER → loggea warn, se ignora");
});

describe("010-embedding-router: searchKnowledge con provider", () => {
  test("usa columna embedding_768 cuando provider activo es gemini");
  test("usa columna embedding_1536 cuando provider activo es openai");
  test("fallback a openai si gemini falla (provider mismatch warning)");
});
```

## Validación manual

- [ ] `EMBEDDING_PROVIDER_ORDER=gemini` → `npm run ingest` → Supabase: `embedding_768` no nulo, `provider_used = "gemini"`
- [ ] Agente: "¿cuánto cuesta el bootcamp?" → invoca `consultar_bootcamp` → responde con precio real (sin alucinar)
- [ ] Cambiar a `EMBEDDING_PROVIDER_ORDER=openai,gemini` → `npm run ingest` → Supabase: `embedding_1536` no nulo
- [ ] Simular fallo de Gemini (API key inválida) con `EMBEDDING_PROVIDER_ORDER=gemini,openai` → agente responde usando OpenAI como fallback, logs muestran warn

## Definition of done

- [ ] Interface `EmbeddingProvider` definida con `embed`, `dimensions`, `name`
- [ ] `OpenAIEmbeddingProvider` y `GeminiEmbeddingProvider` implementados y testeados
- [ ] `FallbackChain` implementado con logging de warn/error
- [ ] `rag.ts` refactorizado — no importa `openai` directamente
- [ ] `ingest.ts` refactorizado — usa provider del chain
- [ ] Schema: columnas `embedding_1536`, `embedding_768`, `provider_used` en `knowledge`
- [ ] RPC `match_knowledge` actualizada para aceptar `provider` param
- [ ] `GEMINI_API_KEY` y `EMBEDDING_PROVIDER_ORDER` en `.env.example`
- [ ] `@google/generative-ai` en `package.json`
- [ ] Tests pasan
- [ ] `npm run typecheck` verde
- [ ] `npm run ingest` con Gemini completa sin errores en staging
