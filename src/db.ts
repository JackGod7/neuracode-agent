import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

// Env vars validated in index.ts before server starts.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

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
  // Atomic: try INSERT first. On 23505 (unique_violation) the lead already exists — fetch it.
  // This eliminates the SELECT+INSERT race condition where two concurrent webhooks both
  // see null and both attempt INSERT, causing the second to throw.
  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert({ whatsapp_number: whatsappNumber, status: "new" })
    .select("id, whatsapp_number, name, email, status")
    .single();

  if (!insertError && inserted) return inserted as Lead;

  if (insertError?.code === "23505") {
    const { data: existing, error: fetchError } = await supabase
      .from("leads")
      .select("id, whatsapp_number, name, email, status")
      .eq("whatsapp_number", whatsappNumber)
      .single();

    if (!fetchError && existing) return existing as Lead;
    logger.error({ err: fetchError }, "Error fetching lead after unique conflict");
    throw fetchError ?? new Error("Lead not found after unique conflict");
  }

  logger.error({ err: insertError }, "Error creando lead");
  throw insertError ?? new Error("Error creando lead");
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
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.leadId,
    wamid: input.wamid,
    role: input.role,
    content: input.content,
    tool_calls: input.toolCalls ?? null,
    tool_results: input.toolResults ?? null,
  });
  if (error) {
    logger.error({ err: error }, "Error guardando mensaje");
    throw error; // caller handles: 23505 = wamid dedup (spec 005), else = real error
  }
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

// ============================================
// Tool call cache — spec 005 Capa 2
// ============================================
const TOOL_CACHE_TTL_MS = 60_000;

export function makeIdempotencyKey(
  leadId: string,
  toolName: string,
  input: object
): string {
  // Sort keys before stringifying to ensure {a:1,b:2} and {b:2,a:1} produce the same hash.
  const sortedInput = Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => a.localeCompare(b))
  );
  return crypto
    .createHash("sha256")
    .update(`${leadId}:${toolName}:${JSON.stringify(sortedInput)}`)
    .digest("hex");
}

export async function getCachedToolResult(key: string): Promise<unknown | null> {
  const ttlCutoff = new Date(Date.now() - TOOL_CACHE_TTL_MS).toISOString();
  const { data } = await supabase
    .from("tool_call_cache")
    .select("result")
    .eq("idempotency_key", key)
    .gt("created_at", ttlCutoff)
    .maybeSingle();
  return data?.result ?? null;
}

export async function cacheToolResult(
  key: string,
  toolName: string,
  leadId: string,
  result: unknown
): Promise<void> {
  const { error } = await supabase
    .from("tool_call_cache")
    .upsert(
      { idempotency_key: key, tool_name: toolName, lead_id: leadId, result },
      { onConflict: "idempotency_key" }
    );
  if (error) {
    logger.warn({ err: error, key, toolName }, "Error guardando en tool_call_cache");
  }
}
