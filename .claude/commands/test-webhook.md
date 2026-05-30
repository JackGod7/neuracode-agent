---
description: Manda payload de prueba al webhook local
---

Manda un POST de prueba al webhook local con firma HMAC válida.

1. Verifica que el servidor esté corriendo en `http://localhost:3000` (curl al `/health`)
2. Si no está corriendo, dime "Arranca con `npm run dev` primero"
3. Si está corriendo, ejecuta `bash scripts/cli/test-webhook.sh`
4. Reporta el código de status y el log generado en `.claude/logs/file-changes.log`

NO modifiques archivos. Solo testea.
