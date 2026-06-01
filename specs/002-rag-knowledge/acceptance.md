# Acceptance — Feature 002: rag-knowledge

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## Tests automatizados

Ubicación: `tests/002-rag-knowledge.test.ts`

```typescript
describe("002-rag-knowledge: searchKnowledge", () => {
  test("retorna matches con similarity cuando knowledge tiene datos");
  test("retorna [] sin lanzar cuando OpenAI falla (stub)");
  test("retorna [] sin lanzar cuando Supabase RPC falla (stub)");
  test("filtro por source solo retorna chunks de esa fuente");
  test("matchCount=2 retorna máximo 2 resultados");
});

describe("002-rag-knowledge: formatMatchesAsContext", () => {
  test("[] → '(sin información en la base de conocimiento)'");
  test("matches con source y title → '[Fuente N: source — title]\\ncontent'");
  test("match sin title → '[Fuente N: source]\\ncontent'");
  test("múltiples matches separados por doble newline");
});

describe("002-rag-knowledge: ingest", () => {
  test("archivos vacíos se saltan sin error");
  test("source del chunk = nombre del archivo sin extensión");
});
```

## Validación manual

- [ ] `npm run ingest` termina con "✓ Ingesta completa" sin errores
- [ ] Supabase dashboard: tabla `knowledge` tiene filas con `embedding` no nulo
- [ ] Supabase dashboard: `source` de cada fila es uno de `{bootcamp, webinars, gh600, neuracode, faqs}`
- [ ] Agente: "¿cuánto cuesta el bootcamp VIP?" → responde USD 1497 (de knowledge, no inventado)
- [ ] Agente: "¿cuándo es el W3?" → responde 18 de junio de 2026
- [ ] Agente: "¿qué es el GH-600?" → responde con descripción de certificación GitHub

## Definition of done

- [ ] `npm run ingest` corre sin errores con los 5 archivos de `knowledge/`
- [ ] RPC `match_knowledge` deployada y funcional en Supabase
- [ ] Extension `vector` habilitada en Supabase
- [ ] `searchKnowledge` retorna resultados relevantes para queries en español
- [ ] GitHub Actions `ingest-knowledge.yml` activo en main
- [ ] Tests pasan
- [ ] `npm run typecheck` verde
