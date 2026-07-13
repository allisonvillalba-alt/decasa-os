import { db } from "../lib/db";

/**
 * BASE DE CONHECIMENTO TÉCNICA (RAG)
 * ===================================
 * Busca full-text nos artigos técnicos (vidros, perfis, ferragens, normas,
 * instalação, manutenção). Qualquer agente que vá responder um cliente sobre
 * algo técnico consulta isso ANTES de gerar a resposta — nunca "inventa"
 * uma especificação técnica.
 *
 * Implementação atual: busca textual no Postgres (ILIKE + ranking simples).
 * Caminho de evolução natural: trocar por busca vetorial (pgvector) quando o
 * volume de artigos crescer — a assinatura da função não muda, só o "motor"
 * por trás, então nada que consome isso precisa ser reescrito depois.
 */

export type ArtigoRelevante = {
  titulo: string;
  categoria: string;
  trecho: string;
};

export async function buscarBaseTecnica(pergunta: string, limite = 3): Promise<ArtigoRelevante[]> {
  const termos = extrairTermosChave(pergunta);
  if (termos.length === 0) return [];

  const artigos = await db.artigoTecnico.findMany({
    where: {
      OR: termos.map((termo) => ({
        OR: [
          { titulo: { contains: termo, mode: "insensitive" as const } },
          { conteudo: { contains: termo, mode: "insensitive" as const } },
        ],
      })),
    },
    take: limite * 3, // pega mais candidatos para depois ranquear
  });

  const ranqueados = artigos
    .map((a) => ({
      artigo: a,
      pontuacao: termos.reduce(
        (soma, termo) =>
          soma + (a.conteudo.toLowerCase().split(termo.toLowerCase()).length - 1),
        0
      ),
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, limite);

  return ranqueados.map(({ artigo }) => ({
    titulo: artigo.titulo,
    categoria: artigo.categoria,
    trecho: artigo.conteudo.slice(0, 600),
  }));
}

function extrairTermosChave(pergunta: string): string[] {
  const stopwords = new Set([
    "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "para", "com",
    "que", "qual", "quais", "como", "e", "ou", "um", "uma", "meu", "minha",
    "preciso", "gostaria", "queria", "pode", "voces", "vocês",
  ]);
  return pergunta
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter((palavra) => palavra.length > 2 && !stopwords.has(palavra));
}
