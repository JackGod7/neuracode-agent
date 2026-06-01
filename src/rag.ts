/**
 * RAG: búsqueda semántica sobre la tabla knowledge.
 *
 * TODO Claude Code:
 * - Cache de queries comunes (Redis o in-memory LRU)
 * - Hybrid search (vector + full-text con ts_vector)
 * - Re-ranking con Claude Haiku si los top-k están empatados
 */

import OpenAI from "openai";
import { supabase } from "./db";
import { logger } from "./logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

export type KnowledgeMatch = {
  id: string;
  source: string;
  title: string;
  content: string;
  similarity: number;
};

export async function searchKnowledge(
  query: string,
  options: { matchCount?: number; source?: string } = {}
): Promise<KnowledgeMatch[]> {
  const { matchCount = 4, source } = options;

  let queryEmbedding: number[] | undefined;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    queryEmbedding = embeddingResponse.data[0]?.embedding;
  } catch (err) {
    logger.error({ err }, "Error generando embedding para query");
    return [];
  }

  if (!queryEmbedding) {
    logger.error("OpenAI retornó embedding vacío");
    return [];
  }

  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_source: source ?? null,
  });

  if (error) {
    logger.error({ err: error }, "Error en match_knowledge");
    return [];
  }

  return (data ?? []) as KnowledgeMatch[];
}

/**
 * Helper para formatear los matches como contexto para Claude.
 */
export function formatMatchesAsContext(matches: KnowledgeMatch[]): string {
  if (matches.length === 0) return "(sin información en la base de conocimiento)";
  return matches
    .map(
      (m, i) =>
        `[Fuente ${i + 1}: ${m.source}${m.title ? ` — ${m.title}` : ""}]\n${m.content}`
    )
    .join("\n\n");
}
