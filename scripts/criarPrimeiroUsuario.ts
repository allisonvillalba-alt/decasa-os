/**
 * Cria o primeiro usuário (admin) do sistema.
 * Uso: npx tsx scripts/criarPrimeiroUsuario.ts "Seu Nome" "seu@email.com" "senha-forte"
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const [nome, email, senha] = process.argv.slice(2);

  if (!nome || !email || !senha) {
    console.error('Uso: npx tsx scripts/criarPrimeiroUsuario.ts "Nome" "email@exemplo.com" "senha"');
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await db.usuario.upsert({
    where: { email },
    update: { senhaHash, nome, papel: "ADMIN", ativo: true },
    create: { nome, email, senhaHash, papel: "ADMIN" },
  });

  console.log(`Usuário criado/atualizado: ${usuario.nome} <${usuario.email}> (${usuario.papel})`);
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
