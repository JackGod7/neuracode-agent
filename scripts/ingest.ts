/**
 * Script de ingesta. Lee knowledge/*.md, chunkea, embebe con el provider configurado,
 * y carga a la tabla knowledge en Supabase.
 *
 * Uso: npm run ingest
 *
 * TODO Claude Code:
 * - Diff-based ingest (solo re-embeber lo que cambió, usando hash)
 * - Chunking inteligente que respete headers markdown
 * - Validación de longitud máxima por chunk
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { buildEmbeddingChain } from "../src/embeddings";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const KNOWLEDGE_DIR = path.join(__dirname, "..", "knowledge");

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function ingest(): Promise<void> {
  const chain = buildEmbeddingChain();
  console.log(`Provider chain: ${chain.name} (dims: ${chain.dimensions})`);

  const files = await fs.readdir(KNOWLEDGE_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  console.log(`Encontrados ${mdFiles.length} archivos en knowledge/`);

  console.log("Limpiando knowledge existente...");
  await supabase.from("knowledge").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const file of mdFiles) {
    const source = path.basename(file, ".md");
    const fullPath = path.join(KNOWLEDGE_DIR, file);
    const content = await fs.readFile(fullPath, "utf-8");

    if (!content.trim()) {
      console.log(`⚠  ${file} está vacío, skip.`);
      continue;
    }

    const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`📄 ${file}: ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      const result = await chain.embedWithMeta(chunk);
      if (!result) {
        console.error(`\n✗ Chunk ${i + 1} de ${file}: todos los providers fallaron. Abortando.`);
        process.exit(1);
      }

      const { embedding, provider } = result;
      const embeddingColumn = provider.dimensions === 768 ? "embedding_768" : "embedding_1536";

      const { error: insertError } = await supabase.from("knowledge").insert({
        source,
        title: `${source} #${i + 1}`,
        content: chunk,
        [embeddingColumn]: embedding,
        provider_used: provider.name,
      });

      if (insertError) {
        console.error(`\n✗ Insert chunk ${i + 1} de ${file}:`, insertError.message, insertError.details);
        process.exit(1);
      }

      process.stdout.write(".");
    }
    process.stdout.write("\n");
  }

  console.log("✓ Ingesta completa");
}

ingest().catch((err) => {
  console.error(err);
  process.exit(1);
});
