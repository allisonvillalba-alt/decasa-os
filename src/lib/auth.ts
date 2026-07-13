import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * AUTENTICAÇÃO
 * ============
 * Login por e-mail/senha. Senha nunca é armazenada em texto puro — bcrypt
 * com salt automático. Sessão em JWT (não guarda dados sensíveis, só id,
 * papel e nome — o suficiente para checar permissão em qualquer tela/rota).
 *
 * Toda tentativa de login (sucesso ou falha) é registrada em LogAtividade
 * para auditoria de segurança.
 */

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await db.usuario.findUnique({ where: { email } });

        if (!usuario || !usuario.ativo) {
          await db.logAtividade.create({
            data: { acao: "login_falhou", entidade: "Usuario", entidadeId: email },
          });
          return null;
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) {
          await db.logAtividade.create({
            data: { usuarioId: usuario.id, acao: "login_falhou_senha_incorreta" },
          });
          return null;
        }

        await db.logAtividade.create({
          data: { usuarioId: usuario.id, acao: "login" },
        });

        return { id: usuario.id, name: usuario.nome, email: usuario.email, papel: usuario.papel } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.papel = (user as any).papel;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).papel = token.papel;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
