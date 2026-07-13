import { gerarTextoComBusca } from "../lib/ai";
import { db } from "../lib/db";

/**
 * AGENTE DE PROSPECÇÃO B2B
 * ========================
 * Objetivo: encontrar construtoras, incorporadoras, escritórios de
 * arquitetura e engenharias que são clientes em potencial de alto ticket.
 *
 * REGRA DE COMPLIANCE (LGPD):
 * - Usa exclusivamente a ferramenta de busca web (informação pública).
 * - Nunca tenta localizar dados pessoais sensíveis, nunca faz scraping de
 *   perfis privados, nunca infere dados não publicados.
 * - Coleta apenas: nome da empresa, site institucional, e-mail/telefone
 *   corporativo PUBLICADO no próprio site da empresa, cargo público (ex: em
 *   página "Nossa equipe" ou LinkedIn público da empresa).
 * - Toda empresa/contato gerado fica marcado com `origemProspec = true` e
 *   deve ser revisado por um humano antes de qualquer contato — o agente
 *   organiza e sugere, nunca envia nada sozinho.
 */

export type EmpresaProspectada = {
  nome: string;
  tipo: "CONSTRUTORA" | "INCORPORADORA" | "ESCRITORIO_ARQUITETURA" | "ENGENHARIA" | "FACHADA_RETROFIT" | "OUTRO";
  cidade?: string;
  estado?: string;
  site?: string;
  justificativaPrioridade: string; // por que essa empresa é uma boa oportunidade
  contatoSugerido?: {
    nome: string;
    cargo: string;
    fonte: string; // onde a informação pública foi encontrada
  };
};

export async function pesquisarEmpresasProspeccao(criterio: {
  segmento: string; // ex: "construtoras de médio/alto padrão"
  regiao: string; // ex: "São Paulo, SP"
  quantidade?: number;
}): Promise<EmpresaProspectada[]> {
  const prompt = `Você é um pesquisador de prospecção B2B para a DeCasa Esquadrias, fabricante de esquadrias de alumínio de alto padrão (portas, janelas, guarda-corpos, fachadas). Você atende construtoras, incorporadoras, escritórios de arquitetura e engenharias.

Pesquise na web ${criterio.quantidade ?? 8} empresas reais do segmento "${criterio.segmento}" na região "${criterio.regiao}" que sejam boas oportunidades comerciais para fornecimento de esquadrias de alumínio.

REGRAS OBRIGATÓRIAS (compliance/LGPD):
- Use apenas informação PÚBLICA (site institucional da empresa, páginas "Contato"/"Equipe" publicadas, perfis corporativos públicos).
- NUNCA inclua dados pessoais que não estejam explicitamente publicados pela própria empresa como contato profissional.
- Se não encontrar um contato público específico, deixe o campo de contato vazio — não invente.

Para cada empresa, retorne em JSON puro (array, sem markdown):
{
  "nome": "...",
  "tipo": "CONSTRUTORA" | "INCORPORADORA" | "ESCRITORIO_ARQUITETURA" | "ENGENHARIA" | "FACHADA_RETROFIT" | "OUTRO",
  "cidade": "...",
  "estado": "...",
  "site": "...",
  "justificativaPrioridade": "por que vale a pena prospectar esta empresa (porte, tipo de obra, perfil)",
  "contatoSugerido": { "nome": "...", "cargo": "...", "fonte": "onde essa informação pública foi encontrada" } // omitir se não encontrado
}`;

  const textoCompleto = await gerarTextoComBusca(prompt, 3000);

  let empresas: EmpresaProspectada[] = [];
  try {
    const clean = textoCompleto.replace(/```json|```/g, "").trim();
    // Extrai o array JSON mesmo que a IA tenha adicionado texto ao redor
    const match = clean.match(/\[[\s\S]*\]/);
    empresas = JSON.parse(match ? match[0] : clean);
  } catch (erro) {
    console.error("Falha ao parsear resultado de prospecção:", erro);
  }

  await db.execucaoAgente.create({
    data: {
      agente: "prospeccao",
      entradaResumo: `${criterio.segmento} em ${criterio.regiao}`,
      saidaResumo: `${empresas.length} empresas encontradas`,
      sucesso: empresas.length > 0,
    },
  });

  return empresas;
}

/**
 * Salva os resultados da prospecção no banco, marcados como origemProspec.
 * Não cria automaticamente uma Negociação — prospecção é um estágio ANTES
 * do lead; a Negociação só nasce quando o vendedor decide iniciar a cadência.
 */
export async function salvarEmpresasProspectadas(empresas: EmpresaProspectada[]) {
  const salvas = [];
  for (const e of empresas) {
    const empresa = await db.empresa.create({
      data: {
        nome: e.nome,
        tipo: e.tipo,
        cidade: e.cidade,
        estado: e.estado,
        site: e.site,
        origemProspec: true,
        observacoes: e.justificativaPrioridade,
        contatos: e.contatoSugerido
          ? {
              create: {
                nome: e.contatoSugerido.nome,
                cargo: e.contatoSugerido.cargo,
              },
            }
          : undefined,
      },
      include: { contatos: true },
    });
    salvas.push(empresa);
  }
  return salvas;
}
