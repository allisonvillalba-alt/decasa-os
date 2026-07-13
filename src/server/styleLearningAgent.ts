import { gerarTexto } from "../lib/ai";
import { db } from "../lib/db";

/**
 * APRENDIZADO DE ESTILO DE VENDAS (Módulo 8)
 * ===========================================
 * Analisa as mensagens enviadas pelo vendedor em negociações GANHAS
 * (o que funcionou de verdade, não qualquer mensagem) e extrai um perfil de
 * estilo: tom de voz, argumentos que mais aparecem, como ele lida com
 * objeções, como conduz o fechamento.
 *
 * Esse perfil é então injetado nos prompts de geração de mensagem
 * (followUpMessageAgent) para que a IA escreva cada vez mais parecido com
 * como o próprio vendedor escreveria — sem que ele precise configurar nada,
 * o sistema aprende sozinho a cada negociação fechada.
 *
 * Recomenda-se rodar isso semanalmente (ex: job separado, mesmo padrão do
 * dailyFollowUpJob) ou sob demanda a partir de um botão "Atualizar meu
 * estilo" no perfil do vendedor.
 */
export async function atualizarPerfilEstilo(usuarioId: string) {
  const negociacoesGanhas = await db.negociacao.findMany({
    where: { responsavelId: usuarioId, estagio: "FECHADO_GANHO" },
    include: {
      conversas: {
        include: { mensagens: { where: { direcao: "SAIDA" }, orderBy: { enviadaEm: "asc" } } },
      },
    },
    take: 40, // amostra recente é suficiente e mantém o perfil atualizado com o estilo atual
    orderBy: { atualizadoEm: "desc" },
  });

  const mensagensDoVendedor = negociacoesGanhas
    .flatMap((n) => n.conversas.flatMap((c) => c.mensagens))
    .map((m) => m.conteudo);

  if (mensagensDoVendedor.length < 10) {
    // Amostra insuficiente — não gera perfil especulativo com poucos dados.
    return null;
  }

  const prompt = `Analise as mensagens abaixo, todas escritas por um vendedor de esquadrias de alumínio EM NEGOCIAÇÕES QUE ELE GANHOU. Extraia o estilo de venda dele.

Mensagens:
${mensagensDoVendedor.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Responda em JSON puro (sem markdown):
{
  "tomDeVoz": "descrição objetiva do tom (formal/informal, uso de emojis, tamanho típico de frase, gírias regionais se houver)",
  "argumentosFortes": "quais argumentos de venda aparecem com mais frequência e parecem funcionar",
  "objecoesComuns": "quais objeções aparecem e como ele costuma responder a elas",
  "fechamentosTipicos": "como ele costuma conduzir o momento de fechamento"
}`;

  try {
    const texto = await gerarTexto(prompt, 800);
    const clean = texto.replace(/```json|```/g, "").trim();
    const perfil = JSON.parse(clean) as {
      tomDeVoz: string;
      argumentosFortes: string;
      objecoesComuns: string;
      fechamentosTipicos: string;
    };

    return db.perfilEstiloVendas.upsert({
      where: { usuarioId },
      create: { usuarioId, ...perfil, amostrasAnalisadas: mensagensDoVendedor.length },
      update: { ...perfil, amostrasAnalisadas: mensagensDoVendedor.length },
    });
  } catch (erro) {
    console.error("Falha ao gerar perfil de estilo:", erro);
    return null;
  }
}

/**
 * Retorna um trecho de prompt pronto para injetar em qualquer agente que
 * gere mensagens em nome do vendedor — mantém o estilo consistente em todo
 * o sistema (follow-up, prospecção, respostas técnicas).
 */
export async function obterInstrucaoDeEstilo(usuarioId: string): Promise<string> {
  const perfil = await db.perfilEstiloVendas.findUnique({ where: { usuarioId } });
  if (!perfil) return "";

  return `\n\nEstilo de escrita do vendedor (aprendido de negociações que ele ganhou — imite este estilo):
- Tom de voz: ${perfil.tomDeVoz}
- Argumentos que costumam funcionar: ${perfil.argumentosFortes}
- Como ele lida com objeções: ${perfil.objecoesComuns}
- Como ele conduz o fechamento: ${perfil.fechamentosTipicos}`;
}
