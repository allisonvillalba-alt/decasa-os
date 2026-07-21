import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { gerarTexto } from "../../../../lib/ai";
import { db } from "../../../../lib/db";
import { converterLeadEmNegociacao } from "../../../../server/negociacaoService";
import { interpretarLead } from "../../../../server/leadInterpreter";
import { gerarRespostaTecnica } from "../../../../server/technicalAgent";

/**
 * WEBHOOK DO WHATSAPP (Meta Cloud API)
 * ====================================
 * Toda mensagem recebida no número comercial passa por aqui.
 *
 * Fluxo automático — o vendedor não faz NADA:
 * 1. Mensagem chega
 * 2. Sistema procura o telefone: já é cliente? → anexa à conversa existente
 * 3. Telefone novo? → cria Lead + IA interpreta + vira Negociação no Kanban
 * 4. IA detecta a intenção da mensagem (pedindo orçamento, confirmando
 *    visita, reclamando...) e grava junto
 * 5. Tudo fica na timeline, pesquisável, nunca apagado
 *
 * Configuração na Meta: apontar o webhook do app WhatsApp Business para
 * GET/POST /api/whatsapp/webhook
 */

// GET: verificação do webhook exigida pela Meta na configuração inicial
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (modo === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Verifica a assinatura HMAC-SHA256 que a Meta envia em todo POST de webhook
 * (header X-Hub-Signature-256), calculada sobre o corpo bruto da requisição
 * usando o App Secret do app da Meta. Sem isso, qualquer um que descubra a
 * URL poderia forjar mensagens de WhatsApp que nunca existiram de verdade.
 */
function assinaturaValida(corpoBruto: string, assinaturaRecebida: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !assinaturaRecebida) return false;

  const esperada =
    "sha256=" + createHmac("sha256", appSecret).update(corpoBruto).digest("hex");

  const bufEsperado = Buffer.from(esperada);
  const bufRecebido = Buffer.from(assinaturaRecebida);
  if (bufEsperado.length !== bufRecebido.length) return false;

  return timingSafeEqual(bufEsperado, bufRecebido);
}

// POST: mensagens recebidas
export async function POST(req: NextRequest) {
  const corpoBruto = await req.text();
  const assinatura = req.headers.get("x-hub-signature-256");

  if (!assinaturaValida(corpoBruto, assinatura)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  // Estrutura padrão do payload da Meta Cloud API
  const mensagens = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  const contatos = body?.entry?.[0]?.changes?.[0]?.value?.contacts;

  if (!mensagens?.length) {
    // Pode ser evento de status (entregue/lido) — confirma recebimento e ignora
    return NextResponse.json({ ok: true });
  }

  for (const msg of mensagens) {
    if (msg.type !== "text") continue; // áudio/imagem: tratados em sprint futuro

    const telefone: string = msg.from;
    const conteudo: string = msg.text.body;
    const nomePerfil: string | undefined = contatos?.find(
      (c: any) => c.wa_id === telefone
    )?.profile?.name;

    await processarMensagemRecebida(telefone, conteudo, nomePerfil);
  }

  return NextResponse.json({ ok: true });
}

async function processarMensagemRecebida(
  telefone: string,
  conteudo: string,
  nomePerfil?: string
) {
  // 1. Já existe conversa com este telefone?
  let conversa = await db.conversa.findFirst({
    where: { telefone },
    include: { negociacao: true },
  });

  // 2. Telefone novo → nasce um Lead automaticamente
  if (!conversa) {
    const lead = await db.lead.create({
      data: {
        nome: nomePerfil,
        telefone,
        origem: "WHATSAPP",
        interesseBruto: conteudo,
      },
    });

    try {
      await interpretarLead(lead.id);
    } catch (erro) {
      console.error("IA falhou ao interpretar lead do WhatsApp:", erro);
    }

    const negociacao = await converterLeadEmNegociacao(lead.id);

    conversa = await db.conversa.create({
      data: { telefone, negociacaoId: negociacao.id },
      include: { negociacao: true },
    });
  }

  // 3. Detecta a intenção da mensagem
  const intencao = await detectarIntencao(conteudo);

  // 4. Grava a mensagem — histórico completo, nunca apagado, sempre pesquisável
  await db.mensagem.create({
    data: {
      conversaId: conversa.id,
      direcao: "ENTRADA",
      conteudo,
      intencaoDetectada: intencao,
    },
  });

  // 5. Registra na timeline da negociação
  if (conversa.negociacaoId) {
    await db.eventoTimeline.create({
      data: {
        negociacaoId: conversa.negociacaoId,
        tipo: "mensagem_recebida",
        descricao: `Cliente enviou mensagem${intencao ? ` (${intencao})` : ""}`,
      },
    });

    // 6. Follow-ups pendentes desta negociação são resolvidos: o cliente respondeu
    await db.followUp.updateMany({
      where: { negociacaoId: conversa.negociacaoId, status: { in: ["PENDENTE", "ATRASADO"] } },
      data: { status: "CONCLUIDO", concluidoEm: new Date() },
    });

    // 7. Dúvida técnica: o Agente Técnico já consulta a base e deixa a
    // resposta sugerida pronta como tarefa — o vendedor só revisa e envia.
    if (intencao === "tirando_duvida_tecnica") {
      const { resposta, baseadaEmArtigos } = await gerarRespostaTecnica(conteudo);
      const responsavel = await db.usuario.findFirstOrThrow({ where: { ativo: true } });

      await db.tarefa.create({
        data: {
          negociacaoId: conversa.negociacaoId,
          responsavelId: responsavel.id,
          titulo: `Responder dúvida técnica: "${resposta.slice(0, 80)}..."${
            baseadaEmArtigos.length ? ` (base: ${baseadaEmArtigos.join(", ")})` : " (fora da base — confirmar com engenharia)"
          }`,
        },
      });
    }
  }
}

async function detectarIntencao(conteudo: string): Promise<string | null> {
  try {
    const prompt = `Classifique a intenção desta mensagem de um cliente de esquadrias de alumínio em UMA das categorias: pedindo_orcamento, negociando_preco, confirmando_visita, tirando_duvida_tecnica, pronto_para_fechar, reclamacao, apenas_conversa.

Mensagem: "${conteudo}"

Responda apenas com a categoria, nada mais.`;

    const texto = await gerarTexto(prompt, 50);
    return texto || null;
  } catch {
    return null; // intenção é enriquecimento — nunca bloqueia o registro da mensagem
  }
}
