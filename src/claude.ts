/**
 * Loop de tool use con Claude.
 *
 * Patrón canónico Anthropic SDK v0.32+:
 * 1. Mandas messages + tools.
 * 2. Si stop_reason === "tool_use", ejecutas las tools y devuelves tool_result.
 * 3. Repites hasta stop_reason === "end_turn".
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
const MAX_TOOL_ITERATIONS = 5;

type IncomingMessage = {
  from: string;
  wamid: string;
  text: string;
};

// Repara alternación user/assistant fusionando mensajes consecutivos del mismo rol.
// Claude API rechaza arrays donde dos roles iguales aparecen seguidos.
function repairAlternation(
  messages: Anthropic.MessageParam[]
): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const repaired: Anthropic.MessageParam[] = [messages[0]];
  for (let i = 1; i < messages.length; i++) {
    const prev = repaired[repaired.length - 1];
    const curr = messages[i];
    if (curr.role === prev.role && typeof prev.content === "string" && typeof curr.content === "string") {
      repaired[repaired.length - 1] = {
        role: prev.role,
        content: prev.content + "\n\n" + curr.content,
      };
    } else {
      repaired.push(curr);
    }
  }
  return repaired;
}

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  const lead = await getOrCreateLead(msg.from);

  markAsRead(msg.wamid).catch(() => undefined);

  // Capa 1 de idempotencia (spec 005): saveMessage lanza 23505 si wamid ya existe.
  // En ese caso, el mensaje fue procesado antes (Meta retry) — salir sin responder.
  try {
    await saveMessage({
      leadId: lead.id,
      wamid: msg.wamid,
      role: "user",
      content: msg.text,
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === "23505") {
      logger.info({ wamid: msg.wamid }, "wamid duplicado, ignorado");
      return;
    }
    throw err;
  }

  const history = await loadRecentMessages(lead.id, 20);

  const rawMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // Reparar alternación antes de llamar a Claude — previene HTTP 400
  const messages = repairAlternation(rawMessages);

  let iterations = 0;
  let finalText = "";
  let stopReason = "";

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
      stopReason = "end_turn";
      break;
    }

    if (response.stop_reason === "max_tokens") {
      logger.error(
        { iterations, leadId: lead.id, wamid: msg.wamid },
        "Claude hit max_tokens — aumentar MAX_TOKENS si ocurre frecuentemente"
      );
      finalText = "Mi respuesta fue muy larga. ¿Puedes ser más específico con tu pregunta?";
      stopReason = "max_tokens";
      break;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        logger.info({ tool: block.name, input: block.input }, "Ejecutando tool");
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          { leadId: lead.id, whatsappNumber: msg.from }
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    logger.warn({ stop_reason: response.stop_reason, iterations }, "stop_reason no manejado");
    stopReason = response.stop_reason ?? "unknown";
    break;
  }

  if (!stopReason) {
    logger.error(
      { iterations, leadId: lead.id, wamid: msg.wamid },
      "tool loop agotado sin end_turn"
    );
  }

  if (!finalText) {
    finalText = "Disculpa, tuve un problema procesando tu mensaje. ¿Puedes reformularlo?";
  }

  await sendWhatsAppMessage(msg.from, finalText);

  // Si falla la persistencia de la respuesta, loggeamos pero no fallamos —
  // el usuario ya recibió el mensaje por WhatsApp.
  await saveMessage({
    leadId: lead.id,
    wamid: null,
    role: "assistant",
    content: finalText,
  }).catch((err) => {
    logger.error({ err, leadId: lead.id }, "Error persistiendo respuesta del asistente");
  });
}
