import { gerarTexto } from "../lib/ai";
import { db } from "../lib/db";

export type EtapaCadencia = {
  dia: number; // dia relativo ao início da cadência (0, 3, 7...)
  canal: "EMAIL" | "LIGACAO" | "LINKEDIN";
  assunto?: string; // para e-mail
  conteudo: string;
};

/**
 * Gera uma cadência de prospecção personalizada (3 toques: e-mail inicial,
 * ligação de reforço, e-mail de fechamento) para uma empresa específica,
 * usando o contexto real dela — nunca um script genérico copiado e colado.
 */
export async function gerarCadenciaProspeccao(empresaId: string): Promise<EtapaCadencia[]> {
  const empresa = await db.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    include: { contatos: true },
  });

  const contato = empresa.contatos[0];

  const prompt = `Você é o assistente comercial de vendas B2B da DeCasa Esquadrias, fabricante de esquadrias de alumínio de alto padrão (portas, janelas, guarda-corpos, fachadas) que atende construtoras, incorporadoras, escritórios de arquitetura e engenharias.

Crie uma cadência de prospecção de 3 toques para a empresa abaixo:

Empresa: ${empresa.nome} (${empresa.tipo})
${empresa.cidade ? `Local: ${empresa.cidade}, ${empresa.estado}` : ""}
${empresa.observacoes ? `Contexto: ${empresa.observacoes}` : ""}
${contato ? `Contato: ${contato.nome}, ${contato.cargo}` : "Sem contato nomeado — dirigir ao setor de suprimentos/engenharia"}

Gere em JSON puro (array, sem markdown) 3 etapas:
1. Dia 0 — E-mail de abertura (assunto + corpo curto, focado em valor específico para o perfil da empresa, não em "somos fornecedores de esquadrias")
2. Dia 3 — Ligação de reforço (roteiro de abertura de ligação, natural, não robotizado, prevendo a objeção mais provável)
3. Dia 7 — E-mail de fechamento (curto, oferece um próximo passo concreto: reunião técnica, catálogo, visita a obra de referência)

Formato de cada item: {"dia": 0, "canal": "EMAIL"|"LIGACAO"|"LINKEDIN", "assunto": "..." (só para email), "conteudo": "..."}

Tom: profissional B2B, direto, sem exagero comercial, reconhecendo que é o primeiro contato.`;

  try {
    const texto = await gerarTexto(prompt, 1200);
    const clean = texto.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as EtapaCadencia[];
  } catch {
    return [];
  }
}
