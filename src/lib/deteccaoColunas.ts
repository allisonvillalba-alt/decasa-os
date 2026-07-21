// Reconhecimento automático de colunas de planilhas de leads (nome, telefone,
// email, etc.) a partir do texto do cabeçalho — tolerante a acentuação,
// maiúsculas/minúsculas e variações comuns de nomenclatura.

export type CampoAlvo =
  | "nome"
  | "telefone"
  | "email"
  | "empresa"
  | "cnpj"
  | "produtoInteresse"
  | "valorEstimado"
  | "observacao";

export const ROTULO_CAMPO: Record<CampoAlvo, string> = {
  nome: "Nome",
  telefone: "Telefone",
  email: "E-mail",
  empresa: "Empresa",
  cnpj: "CNPJ/CPF",
  produtoInteresse: "Produto de interesse",
  valorEstimado: "Valor estimado",
  observacao: "Observação",
};

const SINONIMOS: Record<CampoAlvo, string[]> = {
  nome: ["nome", "cliente", "contato", "nome do cliente", "nome cliente", "name"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "phone", "tel", "numero", "contato telefone"],
  email: ["email", "e mail", "mail"],
  empresa: ["empresa", "razao social", "company"],
  cnpj: ["cnpj", "cpf cnpj", "documento", "cpf"],
  produtoInteresse: ["produto", "interesse", "produto de interesse", "produto interesse"],
  valorEstimado: ["valor", "valor estimado", "orcamento", "valor do orcamento", "ticket"],
  observacao: ["observacao", "obs", "nota", "anotacao", "comentario"],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Recebe os cabeçalhos crus da planilha e devolve, pra cada campo alvo, o
// índice da coluna que melhor corresponde (ou -1 se nenhuma bater).
export function detectarMapeamento(cabecalhos: string[]): Record<CampoAlvo, number> {
  const normalizados = cabecalhos.map(normalizar);
  const mapeamento = {} as Record<CampoAlvo, number>;

  for (const campo of Object.keys(SINONIMOS) as CampoAlvo[]) {
    const sinonimos = SINONIMOS[campo];
    let indiceEncontrado = -1;

    for (const sinonimo of sinonimos) {
      const idx = normalizados.findIndex((c) => c === sinonimo);
      if (idx !== -1) {
        indiceEncontrado = idx;
        break;
      }
    }

    if (indiceEncontrado === -1) {
      for (const sinonimo of sinonimos) {
        const idx = normalizados.findIndex((c) => c.includes(sinonimo));
        if (idx !== -1) {
          indiceEncontrado = idx;
          break;
        }
      }
    }

    mapeamento[campo] = indiceEncontrado;
  }

  return mapeamento;
}

// Converte uma célula (que pode vir como número, string formatada em
// R$/pt-BR, ou vazia) num número, ou undefined se não der pra interpretar.
export function paraNumero(valor: unknown): number | undefined {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor !== "string") return undefined;

  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!limpo) return undefined;

  const normalizado =
    limpo.includes(",") && limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo.replace(/,/g, "");

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

export function paraTexto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  const texto = String(valor).trim();
  return texto || undefined;
}
