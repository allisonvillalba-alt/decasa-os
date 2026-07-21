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
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
