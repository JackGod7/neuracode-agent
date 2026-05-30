import Anthropic from "@anthropic-ai/sdk";
import { searchKnowledge, formatMatchesAsContext } from "../rag";
import type { ToolContext } from "./index";

export const consultarBootcampSchema: Anthropic.Tool = {
  name: "consultar_bootcamp",
  description:
    "Busca información sobre el bootcamp Harness Engineering, webinars de junio, examen GH-600, o cualquier producto/servicio de Neuracode. Úsala SIEMPRE antes de responder sobre precios, fechas, contenido o detalles del bootcamp. No inventes datos.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La pregunta o tema a buscar. Ej: 'precio del bootcamp VIP', 'fecha del W2', 'qué incluye Cohort'.",
      },
      source: {
        type: "string",
        enum: ["bootcamp", "webinars", "gh600", "neuracode", "faqs"],
        description: "Opcional. Filtra por fuente si sabes exactamente dónde buscar.",
      },
    },
    required: ["query"],
  },
};

export async function consultarBootcamp(
  input: Record<string, unknown>,
  _ctx: ToolContext
): Promise<{ context: string; matches: number }> {
  const query = input.query as string;
  const source = input.source as string | undefined;

  const matches = await searchKnowledge(query, { matchCount: 4, source });

  return {
    context: formatMatchesAsContext(matches),
    matches: matches.length,
  };
}
