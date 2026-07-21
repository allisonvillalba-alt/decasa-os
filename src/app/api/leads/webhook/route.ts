import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { interpretarLead } from "../../../../server/leadInterpreter";
import { converterLeadEmNegociacao } from "../../../../server/negociacaoService";

/**
 * Endpoint único de entrada para leads de qualquer origem.
 *
 * Cada canal (WhatsApp, landing page, Facebook Lead Ads, Google, importação
 * de planilha) aponta para esta mesma rota com um parâmetro `origem`.
 * O vendedor nunca cadastra nada manualmente — o lead entra aqui, a IA
 * interpreta, e uma Negociação já nasce pronta na primeira coluna do Kanban.
 *
 * Exemplo de uso: POST /api/leads/webhook?origem=WHATSAPP
 */

const origensValidas = [
  "WHATSAPP",
  "LANDING_PAGE",
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE",
  "EMAIL",
  "PLANILHA_IMPORTACAO",
  "PROSPECCAO_B2B",
  "INDICACAO",
  "OUTRO",
] as const;

const payloadSchema = z.object({
  nome: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  // texto cru: mensagem de WhatsApp, resposta do formulário, observação da planilha
  mensagem: z.string().min(1, "mensagem é obrigatória para a IA interpretar o lead"),
});

function segredoValido(req: NextRequest): boolean {
  const esperado = process.env.LEADS_WEBHOOK_SECRET;
  if (!esperado) return false; // nunca aceitar requisição sem segredo configurado
  const recebido = req.headers.get("x-webhook-secret");
  return recebido === esperado;
}

export async function POST(req: NextRequest) {
  if (!segredoValido(req)) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const origemParam = req.nextUrl.searchParams.get("origem")?.toUpperCase();

  if (!origemParam || !origensValidas.includes(origemParam as any)) {
    return NextResponse.json(
      { erro: `origem inválida. Use uma de: ${origensValidas.join(", ")}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload inválido", detalhes: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { nome, telefone, email, cidade, estado, mensagem } = parsed.data;

  // 1. Grava o lead cru — nada se perde, mesmo se a IA falhar depois
  const lead = await db.lead.create({
    data: {
      nome,
      telefone,
      email,
      cidade,
      estado,
      origem: origemParam as any,
      interesseBruto: mensagem,
    },
  });

  // 2. IA interpreta: produtos de interesse, urgência, valor estimado
  try {
    await interpretarLead(lead.id);
  } catch (erro) {
    // Mesmo se a IA falhar, o lead já está salvo — nunca perdemos o contato.
    // Fica marcado como não processado para reprocessamento posterior.
    console.error("Falha ao interpretar lead com IA:", erro);
  }

  // 3. Lead vira Negociação automaticamente, já no primeiro estágio do funil
  const negociacao = await converterLeadEmNegociacao(lead.id);

  return NextResponse.json(
    { leadId: lead.id, negociacaoId: negociacao.id },
    { status: 201 }
  );
}
