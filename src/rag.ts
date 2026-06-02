/**
 * RAG: búsqueda semántica sobre la tabla knowledge.
 *
 * TODO Claude Code:
 * - Cache de queries comunes (Redis o in-memory LRU)
 * - Hybrid search (vector + full-text con ts_vector)
 * - Re-ranking con Claude Haiku si los top-k están empatados
 */

import { supabase } from "./db";
import { buildEmbeddingChain } from "./embeddings";
import { logger } from "./logger";

export type KnowledgeMatch = {
  id: string;
  source: string;
  title: string;
  content: string;
  similarity: number;
};

let _chain: ReturnType<typeof buildEmbeddingChain> | null = null;
function getChain() {
  if (!_chain) _chain = buildEmbeddingChain();
  return _chain;
}

export async function searchKnowledge(
  query: string,
  options: { matchCount?: number; source?: string } = {}
): Promise<KnowledgeMatch[]> {
  const { matchCount = 4, source } = options;

  const chain = getChain();
  const result = await chain.embedWithMeta(query);
  if (!result) {
    logger.error("Todos los providers de embedding fallaron para la query");
    return [];
  }

  const { embedding: queryEmbedding, provider } = result;

  const activeProvider = chain.primaryProvider.name;
  if (provider.name !== activeProvider) {
    logger.warn(
      `provider activo (${activeProvider}) distinto al que generó el embedding (${provider.name})`
    );
  }

  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_source: source ?? null,
    provider: provider.name,
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
