import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { buscarBaseTecnica } from "../../../server/knowledgeBase";
import { exigirPapel } from "../../../lib/permissoes";

const artigoSchema = z.object({
  titulo: z.string().min(3),
  categoria: z.enum(["vidros", "perfis", "ferragens", "normas", "instalacao", "manutencao"]),
  conteudo: z.string().min(10),
});

// POST /api/base-tecnica — cadastra um artigo técnico
// Restrito a ADMIN/GESTOR: conteúdo técnico usado pelo Agente Técnico para
// responder cliente precisa de curadoria, não pode ser editado por qualquer um.
export async function POST(req: NextRequest) {
  const sessao = await exigirPapel(["ADMIN", "GESTOR"]);
  if (sessao instanceof Response) return sessao;

  const body = await req.json().catch(() => null);
  const parsed = artigoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  const artigo = await db.artigoTecnico.create({ data: parsed.data });
  return NextResponse.json(artigo, { status: 201 });
}

// GET /api/base-tecnica?q=pergunta — busca artigos relevantes (usado também pelos agentes)
export async function GET(req: NextRequest) {
  const pergunta = req.nextUrl.searchParams.get("q");

  if (pergunta) {
    const resultados = await buscarBaseTecnica(pergunta);
    return NextResponse.json(resultados);
  }

  const todos = await db.artigoTecnico.findMany({ orderBy: { criadoEm: "desc" } });
  return NextResponse.json(todos);
}
