/**
 * Registry central de tools. Cada tool exporta su schema + handler.
 *
 * El loop en claude.ts llama a executeTool(name, input, context).
 * Si una tool falla, devuelve { error: "..." } en vez de tirar excepción —
 * así Claude puede manejar el error en la siguiente iteración.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";

import { consultarBootcamp, consultarBootcampSchema } from "./consultar_bootcamp";
import { inscribirWebinar, inscribirWebinarSchema } from "./inscribir_webinar";
import { agendarCall, agendarCallSchema } from "./agendar_call";
import { generarLinkPago, generarLinkPagoSchema } from "./generar_link_pago";
import { escalarAJack, escalarAJackSchema } from "./escalar_a_jack";

export type ToolContext = {
  leadId: string;
  whatsappNumber: string;
};

export const TOOLS: Anthropic.Tool[] = [
  consultarBootcampSchema,
  inscribirWebinarSchema,
  agendarCallSchema,
  generarLinkPagoSchema,
  escalarAJackSchema,
];

type ToolHandler = (
  input: Record<string, unknown>,
  ctx: ToolContext
) => Promise<unknown>;

const HANDLERS: Record<string, ToolHandler> = {
  consultar_bootcamp: consultarBootcamp,
  inscribir_webinar: inscribirWebinar,
  agendar_call: agendarCall,
  generar_link_pago: generarLinkPago,
  escalar_a_jack: escalarAJack,
};

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) {
    logger.warn({ tool: name }, "Tool desconocida");
    return { error: `Tool '${name}' no existe` };
  }
  try {
    return await handler(input, ctx);
  } catch (err) {
    logger.error({ err, tool: name }, "Error ejecutando tool");
    return { error: (err as Error).message };
  }
}
