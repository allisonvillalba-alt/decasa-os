import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../../lib/db";
import { calcularFilaDoDia } from "../followUpEngine";
import { gerarMensagemFollowUp } from "../followUpMessageAgent";

/**
 * JOB DIÁRIO DE FOLLOW-UP
 * =======================
 * Roda automaticamente todo dia às 05:00 (antes do expediente).
 *
 * O que faz:
 * 1. Calcula a fila de prioridade do dia (followUpEngine)
 * 2. Para os TOP 15 itens, já gera a mensagem sugerida por IA
 * 3. Cria os registros de FollowUp no banco
 *
 * Resultado: quando o vendedor abre o sistema às 8h, a fila do dia já está
 * pronta — com quem falar, em que ordem, por qual canal, por quê, e com a
 * mensagem já escrita esperando só revisão e envio.
 *
 * Para iniciar o worker: `npx tsx src/server/jobs/dailyFollowUpJob.ts`
 * (em produção roda como processo separado no Railway/Render)
 */

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const filaFollowUp = new Queue("fila-follow-up-diaria", { connection });

// Agenda recorrente: todo dia às 05:00
export async function agendarJobDiario() {
  await filaFollowUp.add(
    "montar-fila-do-dia",
    {},
    {
      repeat: { pattern: "0 5 * * *" }, // cron: 05:00 todos os dias
      removeOnComplete: 30,
      removeOnFail: 30,
    }
  );
  console.log("Job diário de follow-up agendado para 05:00.");
}

const QUANTOS_GERAR_MENSAGEM = 15;

export const worker = new Worker(
  "fila-follow-up-diaria",
  async () => {
    console.log("Montando fila de follow-up do dia...");

    const fila = await calcularFilaDoDia();
    const responsavel = await db.usuario.findFirstOrThrow({ where: { ativo: true } });

    // Cancela follow-ups pendentes de dias anteriores que não foram feitos —
    // eles serão recalculados hoje com prioridade atualizada (viram ATRASADO
    // no histórico, nunca somem silenciosamente).
    await db.followUp.updateMany({
      where: { status: "PENDENTE", dataAgendada: { lt: new Date() } },
      data: { status: "ATRASADO" },
    });

    for (const [indice, item] of fila.entries()) {
      let mensagemSugerida: string | null = null;

      // Gera mensagem por IA apenas para o topo da fila (controle de custo).
      // Os demais itens geram mensagem sob demanda quando o vendedor clicar.
      if (indice < QUANTOS_GERAR_MENSAGEM) {
        try {
          const resultado = await gerarMensagemFollowUp(item.negociacaoId);
          mensagemSugerida = resultado.mensagem;
        } catch (erro) {
          console.error(`Falha ao gerar mensagem para ${item.titulo}:`, erro);
        }
      }

      await db.followUp.create({
        data: {
          negociacaoId: item.negociacaoId,
          responsavelId: responsavel.id,
          canal: item.canalSugerido,
          dataAgendada: new Date(),
          prioridade: item.score,
          motivoPrioridade: item.motivoPrioridade,
          mensagemSugerida,
        },
      });
    }

    console.log(`Fila do dia montada: ${fila.length} follow-ups criados.`);
    return { total: fila.length };
  },
  { connection }
);

// Execução direta (dev): agenda e mantém o worker vivo
if (require.main === module) {
  agendarJobDiario().catch(console.error);
}
