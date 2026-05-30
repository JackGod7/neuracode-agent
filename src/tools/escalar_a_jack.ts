import Anthropic from "@anthropic-ai/sdk";
import { updateLead } from "../db";
import { sendWhatsAppMessage } from "../whatsapp";
import { logger } from "../logger";
import type { ToolContext } from "./index";

export const escalarAJackSchema: Anthropic.Tool = {
  name: "escalar_a_jack",
  description:
    "Marca la conversación para revisión humana de Jack y le manda notificación por WhatsApp. Úsala cuando: (a) el lead está molesto o agresivo, (b) pregunta algo legal/sensible, (c) pide algo fuera de scope, (d) detectas oportunidad Enterprise importante, (e) lleva 3+ mensajes sin avanzar y necesita intervención humana.",
  input_schema: {
    type: "object",
    properties: {
      razon: {
        type: "string",
        description: "Por qué escalas. Frase corta y específica.",
      },
      contexto: {
        type: "string",
        description: "Resumen breve de la conversación hasta este punto para que Jack se ponga al día.",
      },
      prioridad: {
        type: "string",
        enum: ["baja", "media", "alta", "urgente"],
        description: "Qué tan rápido debe responder Jack.",
      },
    },
    required: ["razon", "contexto"],
  },
};

export async function escalarAJack(
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ ok: boolean; message: string }> {
  const razon = input.razon as string;
  const contexto = input.contexto as string;
  const prioridad = (input.prioridad as string) ?? "media";

  await updateLead(ctx.leadId, { status: "escalated" });

  const jackNumber = process.env.JACK_WHATSAPP;
  if (jackNumber) {
    const alert = [
      `🚨 Escalamiento (${prioridad.toUpperCase()})`,
      `Lead: ${ctx.whatsappNumber}`,
      `Razón: ${razon}`,
      `Contexto: ${contexto}`,
    ].join("\n");

    try {
      await sendWhatsAppMessage(jackNumber, alert);
    } catch (err) {
      logger.error({ err }, "No se pudo notificar a Jack");
    }
  }

  return {
    ok: true,
    message:
      "Listo, ya avisé a Jack. Va a revisar este chat y te escribe en cuanto pueda. Si es urgente, también puedes agendar 1:1 directamente.",
  };
}
