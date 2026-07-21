import type { PapelUsuario } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Estende os tipos padrão do NextAuth para incluir o campo `papel`
 * (ADMIN/GESTOR/VENDEDOR) em toda sessão, usuário e token JWT — elimina a
 * necessidade de `as any` sempre que o código precisa checar permissão.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      papel: PapelUsuario;
    } & DefaultSession["user"];
  }

  interface User {
    papel: PapelUsuario;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    papel?: PapelUsuario;
  }
}
