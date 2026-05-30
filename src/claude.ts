/**
 * Loop de tool use con Claude.
 *
 * Patrón canónico Anthropic SDK v0.32+:
 * 1. Mandas messages + tools.
 * 2. Si stop_reason === "tool_use", ejecutas las tools y devuelves tool_result.
 * 3. Repites hasta stop_reason === "end_turn".
 *
 * TODO Claude Code:
 * - Cargar historial real desde Supabase (messages table)
 * - Persistir cada turn en Supabase
 * - Manejar rate limits con backoff
 * - Stream de respuesta si el mensaje es largo (opcional Fase 0)
 */

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./system_prompt";
import { TOOLS, executeTool } from "./tools";
import { sendWhatsAppMessage, markAsRead } from "./whatsapp";
import { logger } from "./logger";
import { getOrCreateLead, loadRecentMessages, saveMessage } from "./db";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;              // por si Claude se queda en bucle

type IncomingMessage = {
  from: string;
  wamid: string;
  text: string;
};

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  const lead = await getOrCreateLead(msg.from);

  // marcar como leído (no esperar, no es crítico)
  markAsRead(msg.wamid).catch(() => undefined);

  // guardar entrada
  await saveMessage({
    leadId: lead.id,
    wamid: msg.wamid,
    role: "user",
    content: msg.text,
  });

  // historial reciente para contexto
  const history = await loadRecentMessages(lead.id, 20);

  // construir messages para Claude
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // loop de tool use
  let iterations = 0;
  let finalText = "";

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    logger.debug({ stop_reason: response.stop_reason, iterations }, "Claude response");

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      const textBlock = response.content.find((b) => b.type === "text");
      finalText = textBlock?.type === "text" ? textBlock.text : "";
      break;
    }

    if (response.stop_reason === "tool_use") {
      // agregar respuesta del modelo al historial efímero
      messages.push({ role: "assistant", content: response.content });

      // ejecutar cada tool_use block
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        logger.info({ tool: block.name, input: block.input }, "Ejecutando tool");
        const result = await executeTool(block.name, block.input as Record<string, unknown>, {
          leadId: lead.id,
          whatsappNumber: msg.from,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // stop_reason inesperado
    logger.warn({ stop_reason: response.stop_reason }, "stop_reason no manejado");
    break;
  }

  if (!finalText) {
    finalText = "Disculpa, tuve un problema procesando tu mensaje. ¿Puedes reformularlo?";
  }

  // enviar a WhatsApp
  await sendWhatsAppMessage(msg.from, finalText);

  // persistir respuesta
  await saveMessage({
    leadId: lead.id,
    wamid: null,
    role: "assistant",
    content: finalText,
  });
}
