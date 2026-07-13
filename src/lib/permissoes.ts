import { auth } from "./auth";

type Papel = "ADMIN" | "VENDEDOR" | "GESTOR";

/**
 * Uso em qualquer rota de API que exija um papel mínimo:
 *
 *   const sessao = await exigirPapel(["ADMIN", "GESTOR"]);
 *   if (sessao instanceof Response) return sessao; // 401/403 já pronto
 *
 * Mantém a checagem de permissão em um único lugar — nenhuma rota
 * reimplementa a própria lógica de autorização.
 */
export async function exigirPapel(papeisPermitidos: Papel[]) {
  const sessao = await auth();

  if (!sessao?.user) {
    return new Response(JSON.stringify({ erro: "não autenticado" }), { status: 401 });
  }

  const papel = (sessao.user as any).papel as Papel;
  if (!papeisPermitidos.includes(papel)) {
    return new Response(JSON.stringify({ erro: "sem permissão para esta ação" }), {
      status: 403,
    });
  }

  return sessao;
}
