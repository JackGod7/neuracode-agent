import { logger } from "../logger";
import { FallbackChain } from "./chain";
import { GeminiEmbeddingProvider } from "./gemini";
import { OpenAIEmbeddingProvider } from "./openai";
import type { EmbeddingProvider } from "./provider";

export { FallbackChain } from "./chain";
export { GeminiEmbeddingProvider } from "./gemini";
export { OpenAIEmbeddingProvider } from "./openai";
export type { EmbeddingProvider } from "./provider";

const KNOWN_PROVIDERS = ["openai", "gemini"] as const;

export function buildEmbeddingChain(): FallbackChain {
  const orderEnv = process.env.EMBEDDING_PROVIDER_ORDER ?? "openai";
  const requested = orderEnv.split(",").map((s) => s.trim().toLowerCase());

  const providers: EmbeddingProvider[] = [];

  for (const name of requested) {
    if (!KNOWN_PROVIDERS.includes(name as (typeof KNOWN_PROVIDERS)[number])) {
      logger.warn(`EMBEDDING_PROVIDER_ORDER: provider desconocido "${name}", ignorado`);
      continue;
    }
    if (name === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        logger.warn("OPENAI_API_KEY no configurado, openai excluido del chain");
        continue;
      }
      const model = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
      providers.push(new OpenAIEmbeddingProvider(key, model));
    } else if (name === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        logger.warn("GEMINI_API_KEY no configurado, gemini excluido del chain");
        continue;
      }
      providers.push(new GeminiEmbeddingProvider(key));
    }
  }

  if (providers.length === 0) {
    throw new Error(
      "No hay providers de embeddings configurados. Revisa EMBEDDING_PROVIDER_ORDER, OPENAI_API_KEY y GEMINI_API_KEY."
    );
  }

  return new FallbackChain(providers);
}
