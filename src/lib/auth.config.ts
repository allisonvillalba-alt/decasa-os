import type { NextAuthConfig } from "next-auth";
import type { PapelUsuario } from "@prisma/client";

/**
 * Configuração "Edge-safe" do NextAuth: só o que o middleware precisa pra
 * LER uma sessão já existente (decodificar o JWT e formatar `session.user`).
 * Não inclui providers nem nada que dependa de bcrypt/Prisma/Redis, porque
 * o middleware roda no Edge Runtime, que não suporta essas dependências
 * (ex: ioredis usa `node:diagnostics_channel`, que quebra o build do Edge).
 *
 * A configuração completa (com o provider de credenciais, rate limit etc)
 * fica em `auth.ts`, que estende esta aqui e só é usada em rotas de API /
 * Server Components — nunca em `middleware.ts`.
 */
export const authConfigEdge: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Ver nota sobre o cast em auth.ts — mesmo motivo aqui.
        if (token.papel) session.user.papel = token.papel as PapelUsuario;
        if (token.sub) session.user.id = token.sub;
      }
      return session;
    },
  },
};
