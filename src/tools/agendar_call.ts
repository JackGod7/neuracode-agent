import Anthropic from "@anthropic-ai/sdk";
import { updateLead } from "../db";
import type { ToolContext } from "./index";

export const agendarCallSchema: Anthropic.Tool = {
  name: "agendar_call",
  description:
    "Devuelve link de Cal.com para que el lead agende un 1:1 con Jack. Úsala cuando: (a) el lead pide hablar con Jack directamente, (b) tiene preguntas complejas que el agente no puede resolver, (c) es lead Enterprise potencial, (d) pide descuento o condiciones especiales.",
  input_schema: {
    type: "object",
    properties: {
      motivo: {
        type: "string",
        description: "Razón de la llamada en una frase. Ej: 'consultoría para banco', 'duda técnica sobre harness'.",
      },
      urgencia: {
        type: "string",
        enum: ["baja", "media", "alta"],
        description: "Qué tan urgente es. 'alta' = lead caliente, ya quiere comprar.",
      },
    },
    required: ["motivo"],
  },
};

export async function agendarCall(
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ link: string; message: string }> {
  const motivo = input.motivo as string;
  const urgencia = (input.urgencia as string) ?? "media";

  const calLink = process.env.CAL_LINK ?? "https://cal.com/jack-aguilar";

  await updateLead(ctx.leadId, {
    status: urgencia === "alta" ? "qualified" : "qualified",
    // TODO Claude Code: meter motivo en metadata jsonb
  });

  return {
    link: calLink,
    message: `Agenda directamente en ${calLink}. Jack revisa todas las solicitudes el mismo día. Motivo registrado: ${motivo}`,
  };
}
