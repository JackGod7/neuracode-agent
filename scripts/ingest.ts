/**
 * Script de ingesta. Lee knowledge/*.md, chunkea, embebe con OpenAI,
 * y carga a la tabla knowledge en Supabase.
 *
 * Uso: npm run ingest
 *
 * TODO Claude Code:
 * - Diff-based ingest (solo re-embeber lo que cambió, usando hash)
 * - Chunking inteligente que respete headers markdown
 * - Validación de longitud máxima por chunk
 */

import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 500;                     // caracteres
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
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  console.log(`Encontrados ${mdFiles.length} archivos en knowledge/`);

  // Limpiar tabla (TODO Claude Code: ingesta diferencial)
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
      const embedding = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
      });

      await supabase.from("knowledge").insert({
        source,
        title: `${source} #${i + 1}`,
        content: chunk,
        embedding: embedding.data[0]?.embedding,
      });

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
