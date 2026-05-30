/**
 * Supabase client + queries core.
 *
 * TODO Claude Code:
 * - Generar tipos con `supabase gen types typescript`
 * - Manejar conflict en upsert de leads
 * - Soft delete vs hard delete de conversations
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// Lead
// ============================================
export type Lead = {
  id: string;
  whatsapp_number: string;
  name: string | null;
  email: string | null;
  status: string;
};

export async function getOrCreateLead(whatsappNumber: string): Promise<Lead> {
  const { data: existing } = await supabase
    .from("leads")
    .select("id, whatsapp_number, name, email, status")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  if (existing) return existing as Lead;

  const { data: created, error } = await supabase
    .from("leads")
    .insert({ whatsapp_number: whatsappNumber, status: "new" })
    .select("id, whatsapp_number, name, email, status")
    .single();

  if (error || !created) {
    logger.error({ err: error }, "Error creando lead");
    throw error ?? new Error("Error creando lead");
  }
  return created as Lead;
}

export async function updateLead(leadId: string, patch: Partial<Lead>): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", leadId);
  if (error) {
    logger.error({ err: error, leadId }, "Error actualizando lead");
    throw error;
  }
}

// ============================================
// Messages
// ============================================
type SaveMessageInput = {
  leadId: string;
  wamid: string | null;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: unknown;
  toolResults?: unknown;
};

export async function saveMessage(input: SaveMessageInput): Promise<void> {
  // TODO Claude Code: una conversación por lead. Por ahora, conversation_id = lead_id como hack.
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.leadId,
    wamid: input.wamid,
    role: input.role,
    content: input.content,
    tool_calls: input.toolCalls ?? null,
    tool_results: input.toolResults ?? null,
  });
  if (error) logger.error({ err: error }, "Error guardando mensaje");
}

export async function loadRecentMessages(
  leadId: string,
  limit = 20
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", leadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ err: error }, "Error cargando historial");
    return [];
  }

  return (data ?? []).reverse() as Array<{ role: "user" | "assistant"; content: string }>;
}
