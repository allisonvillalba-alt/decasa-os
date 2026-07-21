import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfigEdge } from "./lib/auth.config";

/**
 * Protege todas as rotas do sistema exceto /login e os próprios endpoints
 * de autenticação. Webhooks externos (WhatsApp, leads) ficam de fora da
 * checagem de sessão de propósito — eles são autenticados de outra forma
 * (verify token da Meta / segredo de webhook), não por login de usuário.
 *
 * Usa `authConfigEdge` (sem providers/bcrypt/db/redis) porque o middleware
 * roda no Edge Runtime — só precisa LER a sessão já existente, nunca fazer
 * login. A config completa (`./lib/auth`) é usada nas rotas de API.
 */
const { auth } = NextAuth(authConfigEdge);

export default auth((req) => {
  const rotaPublica =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/api/whatsapp/webhook") ||
    req.nextUrl.pathname.startsWith("/api/leads/webhook");

  if (!req.auth && !rotaPublica) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  // Já logado tentando ver a tela de login de novo? Manda direto pro painel.
  if (req.auth && req.nextUrl.pathname.startsWith("/login")) {
    const url = new URL("/painel", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
});

export const config = {
  // Além de _next/static|_next/image|favicon.ico, exclui qualquer arquivo
  // estático servido direto de public/ (logo, imagens, etc.) — sem isso,
  // o middleware redirecionava esses arquivos para /login e o otimizador
  // de imagem do Next recebia HTML no lugar do arquivo, quebrando <Image>.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|avif)$).*)"],
};
