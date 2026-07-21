import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigirPapel } from "../../../../lib/permissoes";
import { criarLeadManual } from "../../../../server/criarLeadManual";

const LIMITE_LINHAS = 500; // o cliente divide planilhas maiores em lotes desse tamanho

const linhaSchema = z.object({
  nome: z.string().trim().max(200).optional(),
  telefone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  produtoInteresse: z.string().trim().max(120).optional(),
  valorEstimado: z.number().nonnegative().optional(),
  observacao: z.string().trim().max(2000).optional(),
});

const importarSchema = z.object({
  linhas: z.array(linhaSchema).min(1).max(LIMITE_LINHAS),
});

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/leads/importar-lote — recebe linhas já extraídas de uma
// planilha (Excel/CSV) no navegador e cria um Lead + Negociação por linha
// válida. O parsing do arquivo em si acontece no cliente (src/app/leads/importar);
// esta rota só valida e persiste dados já estruturados.
export async function POST(req: NextRequest) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR", "VENDEDOR"]);
  if (sessao instanceof Response) return sessao;

  const body = await req.json().catch(() => null);
  const parsed = importarSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let criados = 0;
  const erros: { linha: number; motivo: string }[] = [];

  for (const [indice, linha] of parsed.data.linhas.entries()) {
    const email = linha.email && EMAIL_VALIDO.test(linha.email) ? linha.email : undefined;

    try {
      await criarLeadManual(
        { ...linha, email },
        sessao.user.id,
        "PLANILHA_IMPORTACAO"
      );
      criados++;
    } catch (e) {
      erros.push({
        linha: indice + 1,
        motivo: e instanceof Error ? e.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({ criados, ignorados: erros.length, erros });
}
