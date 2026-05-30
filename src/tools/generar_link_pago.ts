import Anthropic from "@anthropic-ai/sdk";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { supabase } from "../db";
import { logger } from "../logger";
import type { ToolContext } from "./index";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? "",
});

// Precios canónicos. Si cambian, actualizar también knowledge/bootcamp.md
const PRECIOS: Record<string, { usd: number; descripcion: string }> = {
  cohort: { usd: 597, descripcion: "Bootcamp Harness Engineering — Cohort (6 semanas)" },
  vip: { usd: 1497, descripcion: "Bootcamp Harness Engineering — VIP (6 semanas + 1:1 mensuales)" },
  enterprise: { usd: 6500, descripcion: "Bootcamp Harness Engineering — Enterprise (in-company)" },
};

export const generarLinkPagoSchema: Anthropic.Tool = {
  name: "generar_link_pago",
  description:
    "Genera un link de pago de Mercado Pago para el bootcamp. SOLO úsala cuando el lead YA confirmó qué tier quiere (Cohort/VIP/Enterprise) y aceptó el precio. NO la uses para enviar precios — para eso usa consultar_bootcamp. Antes de invocar, asegúrate de tener nombre del lead.",
  input_schema: {
    type: "object",
    properties: {
      producto: {
        type: "string",
        enum: ["cohort", "vip", "enterprise"],
        description: "Tier confirmado por el lead.",
      },
      nombre: {
        type: "string",
        description: "Nombre del lead (para registro y comprobante).",
      },
    },
    required: ["producto", "nombre"],
  },
};

export async function generarLinkPago(
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ link?: string; message: string; ok: boolean }> {
  const producto = input.producto as string;
  const nombre = input.nombre as string;

  const config = PRECIOS[producto];
  if (!config) {
    return { ok: false, message: `Producto '${producto}' no existe.` };
  }

  // Enterprise va por agendar_call, no por link directo
  if (producto === "enterprise") {
    return {
      ok: false,
      message:
        "Enterprise se cotiza caso por caso. Mejor usa la tool agendar_call para que Jack revise el alcance.",
    };
  }

  try {
    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: `bootcamp-${producto}`,
            title: config.descripcion,
            quantity: 1,
            unit_price: config.usd,
            currency_id: "USD",
          },
        ],
        external_reference: ctx.leadId,
        notification_url: `${process.env.BASE_URL}/payments/webhook`,
        back_urls: {
          success: `${process.env.BASE_URL}/pago/ok`,
          failure: `${process.env.BASE_URL}/pago/error`,
        },
        metadata: { lead_id: ctx.leadId, nombre, producto },
      },
    });

    const link = result.init_point;
    if (!link) throw new Error("Mercado Pago no devolvió init_point");

    await supabase.from("payment_links").insert({
      lead_id: ctx.leadId,
      product: producto,
      amount_usd: config.usd,
      mp_preference_id: result.id,
      init_point: link,
      status: "pending",
    });

    return {
      ok: true,
      link,
      message: `Link generado: ${link}. Es link directo a Mercado Pago, válido por 30 días.`,
    };
  } catch (err) {
    logger.error({ err, producto, leadId: ctx.leadId }, "Error generando link MP");
    return {
      ok: false,
      message: "Error generando el link de pago. Usa escalar_a_jack para que él lo envíe manualmente.",
    };
  }
}
