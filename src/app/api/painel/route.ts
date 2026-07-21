import { NextResponse } from "next/server";
import { calcularIndicadores } from "../../../server/kpiService";
import { gerarInsightsExecutivos } from "../../../server/executiveAgent";
import { exigirPapel } from "../../../lib/permissoes";

// GET /api/painel — KPIs + insights interpretados em linguagem natural
// Restrito a ADMIN/GESTOR: mostra faturamento e números agregados da empresa
// inteira, não só as negociações do vendedor que está olhando.
export async function GET() {
  const sessao = await exigirPapel(["ADMIN", "GESTOR"]);
  if (sessao instanceof Response) return sessao;

  const indicadores = await calcularIndicadores();
  const insights = await gerarInsightsExecutivos(indicadores, sessao.user.id);

  return NextResponse.json({ indicadores, insights });
}
