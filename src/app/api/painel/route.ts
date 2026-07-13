import { NextResponse } from "next/server";
import { calcularIndicadores } from "../../../server/kpiService";
import { gerarInsightsExecutivos } from "../../../server/executiveAgent";

// GET /api/painel — KPIs + insights interpretados em linguagem natural
export async function GET() {
  const indicadores = await calcularIndicadores();
  const insights = await gerarInsightsExecutivos(indicadores);

  return NextResponse.json({ indicadores, insights });
}
