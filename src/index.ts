/**
 * Webhook principal de WhatsApp Cloud API.
 *
 * Responsabilidades:
 * 1. GET /webhook → handshake de verificación con Meta
 * 2. POST /webhook → recibe mensajes, valida firma, procesa async
 * 3. GET /health → healthcheck para Railway
 *
 * NO procesar el mensaje antes de responder 200.
 * Meta reintenta si tardamos >5s.
 */

import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { logger } from "./logger";
import { handleIncomingMessage } from "./claude";
import { sendWhatsAppMessage } from "./whatsapp";

// ============================================
// Validación de env vars — fail-fast con mensaje claro
// ============================================
const REQUIRED_ENV_VARS = [
  "VERIFY_TOKEN",
  "APP_SECRET",
  "WHATSAPP_TOKEN",
  "PHONE_NUMBER_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "MP_ACCESS_TOKEN",
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    logger.fatal(`Falta variable de entorno requerida: ${key}`);
    process.exit(1);
  }
}

const { PORT = "3000", VERIFY_TOKEN, APP_SECRET } = process.env;

const app = Fastify({
  logger: false,
  bodyLimit: 1024 * 1024,
});

// Capturar raw body para validar firma de Meta
app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (_req, body, done) => {
    try {
      const json = JSON.parse(body.toString("utf8"));
      (json as { __rawBody?: Buffer }).__rawBody = body as Buffer;
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

// ============================================
// GET /webhook — verificación de Meta
// ============================================
app.get("/webhook", async (req: FastifyRequest, reply: FastifyReply) => {
  const query = req.query as Record<string, string>;
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Webhook verificado por Meta");
    return reply.code(200).send(challenge);
  }
  return reply.code(403).send("forbidden");
});

// ============================================
// POST /webhook — recibe mensajes
// ============================================
app.post("/webhook", async (req: FastifyRequest, reply: FastifyReply) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const body = req.body as { __rawBody?: Buffer; [k: string]: unknown };

  if (!signature || !body.__rawBody || !verifySignature(body.__rawBody, signature)) {
    logger.warn({ signature }, "Firma inválida");
    return reply.code(403).send("forbidden");
  }

  // Responder INMEDIATAMENTE. Procesar después.
  reply.code(200).send("ok");

  // Procesamiento asíncrono (no await — corre en background)
  processWebhook(body).catch((err) => {
    logger.error({ err }, "Error procesando webhook");
  });
});

// ============================================
// GET /health
// ============================================
app.get("/health", async (_req, reply) => reply.code(200).send({ ok: true }));

// ============================================
// helpers
// ============================================
function verifySignature(rawBody: Buffer, signature: string): boolean {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET!).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function processWebhook(body: Record<string, unknown>): Promise<void> {
  const entries = (body.entry as Array<Record<string, unknown>>) ?? [];

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      const messages = (value?.messages as Array<Record<string, unknown>>) ?? [];

      for (const message of messages) {
        await processMessage(message);
      }
    }
  }
}

async function processMessage(message: Record<string, unknown>): Promise<void> {
  const from = message.from as string;
  const wamid = message.id as string;
  const type = message.type as string;

  if (!from || !wamid) {
    logger.warn({ message }, "Mensaje sin from o wamid, ignorado");
    return;
  }

  logger.info({ from, wamid, type }, "Mensaje entrante");

  if (type !== "text") {
    logger.info({ from, type }, "Tipo no soportado en Fase 0");
    // Responder al usuario en lugar de ignorar silenciosamente
    await sendWhatsAppMessage(
      from,
      "Por ahora solo proceso mensajes de texto. ¿Puedes escribirme lo que necesitas?"
    ).catch((err) => logger.error({ err, from }, "Error enviando respuesta a tipo no soportado"));
    return;
  }

  const text = (message.text as Record<string, string>).body;
  await handleIncomingMessage({ from, wamid, text });
}

// ============================================
// boot
// ============================================
app
  .listen({ port: Number(PORT), host: "0.0.0.0" })
  .then(() => logger.info(`Escuchando en :${PORT}`))
  .catch((err) => {
    logger.fatal({ err }, "No se pudo arrancar el servidor");
    process.exit(1);
  });
