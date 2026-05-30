/**
 * Registry central de tools.
 *
 * executeTool aplica:
 * - Capa 2 de idempotencia (spec 005): tool_call_cache por hash de input
 * - Error handling: errores se devuelven como { error: "..." }, nunca se cachean
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";
import { makeIdempotencyKey, getCachedToolResult, cacheToolResult } from "../db";

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

  // Capa 2: tool cache (spec 005) — no cachear errores
  const key = makeIdempotencyKey(ctx.leadId, name, input);
  const cached = await getCachedToolResult(key).catch(() => null);
  if (cached !== null) {
    logger.info({ tool: name, key }, "tool cache hit");
    return cached;
  }

  try {
    const result = await handler(input, ctx);
    // Cache successful result only — errors must be retryable
    await cacheToolResult(key, name, ctx.leadId, result).catch((err) => {
      logger.warn({ err, tool: name }, "Error guardando en tool_call_cache");
    });
    return result;
  } catch (err) {
    logger.error({ err, tool: name }, "Error ejecutando tool");
    return { error: (err as Error).message };
  }
}
