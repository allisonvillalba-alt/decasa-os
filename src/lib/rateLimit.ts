import IORedis from "ioredis";

/**
 * Rate limiting simples baseado em contador com expiração no Redis
 * (janela fixa). Usa o mesmo Redis já configurado para a fila de follow-up
 * — não precisa de nenhum serviço novo.
 */

let cliente: IORedis | null = null;

function obterRedis(): IORedis {
  if (!cliente) {
    cliente = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return cliente;
}

/**
 * Retorna true se a chave já excedeu o limite de tentativas na janela atual.
 * Cada chamada incrementa o contador; a primeira chamada de uma janela nova
 * define a expiração.
 */
export async function limiteExcedido(
  chave: string,
  maxTentativas: number,
  janelaSegundos: number
): Promise<boolean> {
  try {
    const redis = obterRedis();
    const contagem = await redis.incr(chave);
    if (contagem === 1) {
      await redis.expire(chave, janelaSegundos);
    }
    return contagem > maxTentativas;
  } catch (erro) {
    // Redis fora do ar não pode derrubar o sistema inteiro — nesse caso,
    // deixa passar (fail-open) e registra o problema.
    console.error("Rate limit indisponível (Redis):", erro);
    return false;
  }
}
