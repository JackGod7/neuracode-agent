# Neuracode WhatsApp Agent

Agente conversacional vía WhatsApp Cloud API + Claude Sonnet 4.6 + Supabase para Neuracode SAC.

> **Status**: scaffold base. Léase `CLAUDE.md` para la constitución del proyecto.
> El resto se completa con Claude Code.

## Setup en 6 pasos

### 1. Clonar e instalar
```bash
git clone <tu-repo>
cd neuracode-agent
npm install
```

### 2. Variables de entorno
Copia `.env.example` a `.env` y completa los valores. Ver sección "Cómo obtener cada token" abajo.

### 3. Supabase
- Crear proyecto en https://supabase.com (free tier)
- En SQL Editor, correr `supabase/schema.sql`
- Copiar `URL` y `service_role key` al `.env`

### 4. Knowledge base
Llenar `knowledge/*.md` con contenido real (bootcamp, webinars, FAQs, etc).
```bash
npm run ingest
```

### 5. Desarrollo local
```bash
npm run dev
```
En otra terminal, exponer con ngrok o usar Railway preview:
```bash
ngrok http 3000
```

### 6. Deploy en Railway
- `git push` al repo conectado a Railway
- Pegar variables de entorno en Railway
- Generar dominio público
- En Meta Developers → WhatsApp → Configuration → Webhook:
  - Callback URL: `https://<tu-dominio>/webhook`
  - Verify token: el mismo `VERIFY_TOKEN` del `.env`
  - Suscribir el campo `messages`

## Cómo obtener cada token

| Variable | Dónde |
|---|---|
| `WHATSAPP_TOKEN` | Meta for Developers → tu app → WhatsApp → API Setup → Temporary access token (luego permanente con System User) |
| `PHONE_NUMBER_ID` | Misma pantalla, debajo del token |
| `APP_SECRET` | Meta for Developers → tu app → Configuración básica → App secret |
| `VERIFY_TOKEN` | Lo inventas tú, cualquier string largo random |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `OPENAI_API_KEY` | platform.openai.com → API keys (solo para embeddings) |
| `SUPABASE_URL` | Supabase → tu proyecto → Settings → API |
| `SUPABASE_SERVICE_KEY` | Misma pantalla, `service_role` (no `anon`) |
| `MP_ACCESS_TOKEN` | mercadopago.com.pe → Developers → Credenciales (production) |
| `CAL_LINK` | cal.com → tu evento → "Copy link" |
| `JACK_WHATSAPP` | Tu número personal en formato internacional, sin + (ej: `51999888777`) |

## Scripts

```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm run start    # Producción
npm run ingest   # Ingestar knowledge/ a Supabase
```

## Arquitectura

Ver `CLAUDE.md` sección "Arquitectura".

## Roadmap

- **Fase 0** (este scaffold): texto + RAG + 5 tools + Mercado Pago
- **Fase 1**: persistencia completa, perfil de lead, métricas
- **Fase 2**: audios (Whisper), imágenes (Claude vision), Cal.com API
- **Fase 3**: templates WhatsApp aprobados, follow-up automático, dashboard
# neuracode-agent
