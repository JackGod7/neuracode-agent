# Historias de usuario — Feature 002: rag-knowledge

| Versión | Fecha | Autor | Estado |
|---|---|---|---|
| v1.0.0 | 2026-05-30 | Claude Code | implemented |

## HU-002-01: Ingesta del knowledge base

**Como** operador (Jack o CI)  
**Quiero** que `npm run ingest` cargue todos los archivos `knowledge/*.md` a Supabase  
**Para** que el agente tenga acceso a datos actualizados del bootcamp

```gherkin
Scenario: Ingest exitoso desde cero
  Given la tabla knowledge está vacía
    And existen 5 archivos .md en knowledge/
  When ejecuto "npm run ingest"
  Then se insertan N chunks en la tabla knowledge
    And cada chunk tiene embedding vector(1536) no nulo
    And source corresponde al nombre del archivo sin extensión

Scenario: Re-ingest con contenido actualizado
  Given knowledge/ ya tiene datos de corrida anterior
  When ejecuto "npm run ingest" con bootcamp.md actualizado
  Then se borra todo el contenido anterior
    And se re-insertan todos los chunks con embeddings frescos

Scenario: Archivo vacío se salta sin error
  Given knowledge/draft.md existe pero está vacío
  When ejecuto "npm run ingest"
  Then draft.md se salta sin error
    And los demás archivos se procesan normalmente
    And el proceso termina con exit 0
```

## HU-002-02: Búsqueda semántica por el agente

**Como** agente ejecutando `consultar_bootcamp`  
**Quiero** obtener los chunks de knowledge más relevantes a la query del lead  
**Para** responder con datos reales en vez de alucinar

```gherkin
Scenario: Query con resultados relevantes
  Given knowledge tiene chunks embebidos del bootcamp
  When searchKnowledge("precio del bootcamp VIP", { matchCount: 4 })
  Then retorna hasta 4 KnowledgeMatch ordenados por similitud descendente
    And cada match tiene { id, source, title, content, similarity }

Scenario: Query con filtro por source
  When searchKnowledge("fecha del W2", { source: "webinars" })
  Then solo retorna chunks con source = "webinars"

Scenario: OpenAI falla generando embedding
  Given OpenAI retorna error en embeddings.create
  When searchKnowledge("cualquier query")
  Then retorna [] sin lanzar excepción
    And se loggea level=error con el error de OpenAI

Scenario: knowledge vacío (ingest no corrió)
  Given la tabla knowledge no tiene filas
  When searchKnowledge("precio")
  Then retorna []
    And formatMatchesAsContext([]) retorna "(sin información en la base de conocimiento)"
```

## HU-002-03: Trigger de ingest automático en CI

**Como** operador  
**Quiero** que GitHub Actions corra ingest al pushear cambios en `knowledge/` a main  
**Para** no tener que ejecutar `npm run ingest` manualmente

```gherkin
Scenario: Push a main con cambios en knowledge/
  Given el diff incluye knowledge/bootcamp.md
  When GitHub Actions evalúa ingest-knowledge.yml
  Then corre "npm run ingest" contra Supabase prod
    And el workflow termina con exit 0

Scenario: Push a main sin cambios en knowledge/
  Given el diff no toca knowledge/
  When se evalúa ingest-knowledge.yml
  Then el workflow no corre (paths filter no coincide)
```
