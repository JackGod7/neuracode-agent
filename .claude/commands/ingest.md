---
description: Re-ingesta knowledge/ a Supabase pgvector
---

Re-ingesta el contenido de `knowledge/*.md` a la tabla `knowledge` en Supabase.

1. Lista los archivos en `knowledge/` y muéstrame cuántos chunks aproximados generaría cada uno (asumir 500 chars/chunk con overlap 50)
2. Pídeme confirmación antes de correr (porque borra la tabla y la repuebla)
3. Si confirmo, ejecuta `npm run ingest` y muéstrame el output
4. Al final, ejecuta una query de prueba: buscar "precio del bootcamp VIP" y mostrar los top-3 matches
