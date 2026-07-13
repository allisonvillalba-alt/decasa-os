import { gerarTexto } from "../lib/ai";
import { buscarBaseTecnica } from "./knowledgeBase";
import { db } from "../lib/db";

/**
 * AGENTE TÉCNICO
 * Responde dúvidas técnicas de clientes (tipos de vidro, perfis, ferragens,
 * normas, instalação) SEMPRE consultando a base de conhecimento primeiro.
 * Se a base não tiver artigo relevante, o agente diz isso explicitamente em
 * vez de inventar uma especificação técnica — segurança do cliente final
 * (estrutural, normas) vem antes de "parecer que sabe tudo".
 */
export async function gerarRespostaTecnica(pergunta: string): Promise<{
  resposta: string;
  baseadaEmArtigos: string[];
}> {
  const artigos = await buscarBaseTecnica(pergunta);

  if (artigos.length === 0) {
    return {
      resposta:
        "Não encontrei essa informação na base técnica cadastrada. Recomendo que um vendedor confirme com a engenharia antes de responder ao cliente — não adivinhe especificações estruturais.",
      baseadaEmArtigos: [],
    };
  }

  const contexto = artigos
    .map((a) => `[${a.titulo} — ${a.categoria}]\n${a.trecho}`)
    .join("\n\n");

  const prompt = `Você é o assistente técnico da DeCasa Esquadrias (esquadrias de alumínio). Responda a dúvida do cliente usando APENAS as informações da base técnica abaixo. Se a base não cobrir algum ponto da pergunta, diga que aquele ponto específico precisa ser confirmado pela engenharia — nunca complete com conhecimento geral não verificado, especialmente sobre limites estruturais.

Base técnica relevante:
${contexto}

Pergunta do cliente: "${pergunta}"

Responda em tom natural de WhatsApp comercial, 2-4 frases, direto ao ponto.`;

  const resposta = await gerarTexto(prompt, 400);

  await db.execucaoAgente.create({
    data: {
      agente: "tecnico",
      entradaResumo: pergunta.slice(0, 200),
      saidaResumo: resposta.slice(0, 200),
      sucesso: resposta.length > 0,
    },
  });

  return { resposta, baseadaEmArtigos: artigos.map((a) => a.titulo) };
}
