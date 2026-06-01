/**
 * WhatsApp Cloud API client.
 * Solo lo mínimo para Fase 0: enviar texto, markAsRead.
 *
 * TODO Claude Code:
 * - downloadMedia(mediaId) para Fase 2 (audios/imágenes)
 * - sendTemplate(to, templateName, params) para Fase 3 (fuera de ventana 24h)
 */

import axios, { AxiosError } from "axios";
import { logger } from "./logger";

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  GRAPH_API_VERSION = "v22.0",
} = process.env;

if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  throw new Error("Faltan WHATSAPP_TOKEN o PHONE_NUMBER_ID");
}

const BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}`;
const HEADERS = {
  Authorization: `Bearer ${WHATSAPP_TOKEN}`,
  "Content-Type": "application/json",
};

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  try {
    await axios.post(
      `${BASE}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: false },
      },
      { headers: HEADERS, timeout: 10000 }
    );
    logger.info({ to, length: body.length }, "Mensaje enviado");
  } catch (err) {
    const axiosErr = err as AxiosError;
    logger.error(
      { to, status: axiosErr.response?.status, data: axiosErr.response?.data },
      "Error enviando mensaje"
    );
    throw err;
  }
}

export async function markAsRead(messageId: string): Promise<void> {
  try {
    await axios.post(
      `${BASE}/messages`,
      { messaging_product: "whatsapp", status: "read", message_id: messageId },
      { headers: HEADERS, timeout: 5000 }
    );
  } catch (err) {
    // no crítico
    logger.debug({ messageId, err }, "markAsRead falló");
  }
}

// TODO Claude Code (Fase 2):
// export async function downloadMedia(mediaId: string): Promise<Buffer> { ... }
