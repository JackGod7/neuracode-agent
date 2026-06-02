import { logger } from "../logger";
import type { EmbeddingProvider } from "./provider";

export class FallbackChain implements EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;

  private providers: EmbeddingProvider[];

  constructor(providers: EmbeddingProvider[]) {
    if (providers.length === 0) throw new Error("FallbackChain requires at least one provider");
    this.providers = providers;
    // Expose the primary provider's metadata
    this.name = providers[0]!.name;
    this.dimensions = providers[0]!.dimensions;
  }

  get primaryProvider(): EmbeddingProvider {
    return this.providers[0]!;
  }

  async embed(text: string): Promise<number[]> {
    const errors: string[] = [];
    for (const provider of this.providers) {
      try {
        const result = await provider.embed(text);
        if (provider.name !== this.providers[0]!.name) {
          logger.warn(`provider ${this.providers[0]!.name} falló, usando ${provider.name}`);
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn({ err }, `provider ${provider.name} falló: ${msg}`);
        errors.push(`${provider.name}: ${msg}`);
      }
    }
    logger.error({ errors }, `todos los providers fallaron: ${errors.join("; ")}`);
    return null as unknown as number[]; // caller checks for null
  }

  /** Returns the first provider that successfully embeds, for name/dims inspection */
  async embedWithMeta(text: string): Promise<{ embedding: number[]; provider: EmbeddingProvider } | null> {
    const errors: string[] = [];
    for (const provider of this.providers) {
      try {
        const embedding = await provider.embed(text);
        return { embedding, provider };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn({ err }, `provider ${provider.name} falló: ${msg}`);
        errors.push(`${provider.name}: ${msg}`);
      }
    }
    logger.error({ errors }, `todos los providers fallaron: ${errors.join("; ")}`);
    return null;
  }
}
