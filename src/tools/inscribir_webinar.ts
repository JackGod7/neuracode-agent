import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../db";
import { updateLead } from "../db";
import type { ToolContext } from "./index";

export const inscribirWebinarSchema: Anthropic.Tool = {
  name: "inscribir_webinar",
  description:
    "Inscribe al lead en uno de los 4 webinars gratuitos de junio 2026 (W1, W2, W3, W4). Requiere nombre y email. Si no los tienes, pídelos primero. NO inventes el email.",
  input_schema: {
    type: "object",
    properties: {
      nombre: { type: "string", description: "Nombre completo del lead." },
      email: { type: "string", description: "Email válido del lead." },
      webinar_code: {
        type: "string",
        enum: ["W1", "W2", "W3", "W4"],
        description: "Código del webinar. W1=4jun, W2=11jun, W3=18jun, W4=25jun.",
      },
    },
    required: ["nombre", "email", "webinar_code"],
  },
};

export async function inscribirWebinar(
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ ok: boolean; message: string }> {
  const nombre = input.nombre as string;
  const email = input.email as string;
  const webinarCode = input.webinar_code as string;

  // Validación básica de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "El email no parece válido. Pide al lead que lo confirme." };
  }

  // Actualizar lead con datos
  await updateLead(ctx.leadId, {
    name: nombre,
    email,
    status: "qualified",
  });

  // Registrar inscripción (unique por lead+webinar evita duplicados)
  const { error } = await supabase
    .from("webinar_signups")
    .upsert(
      { lead_id: ctx.leadId, webinar_code: webinarCode },
      { onConflict: "lead_id,webinar_code" }
    );

  if (error) {
    return { ok: false, message: `Error registrando: ${error.message}` };
  }

  // TODO Claude Code: enviar email de confirmación + link Zoom (Fase 2)
  return {
    ok: true,
    message: `Inscripción confirmada para ${webinarCode}. Jack te confirmará el link de Zoom por este mismo WhatsApp 24h antes.`,
  };
}
