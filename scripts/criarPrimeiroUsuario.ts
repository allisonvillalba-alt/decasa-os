/**
 * Cria o primeiro usuário (admin) do sistema.
 * Uso: npx tsx scripts/criarPrimeiroUsuario.ts "Seu Nome" "seu@email.com" "senha-forte"
 * Para redefinir a senha de um usuário que já existe, adicione --force no final.
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const forcar = args.includes("--force");
  const [nome, email, senha] = args.filter((a) => a !== "--force");

  if (!nome || !email || !senha) {
    console.error('Uso: npx tsx scripts/criarPrimeiroUsuario.ts "Nome" "email@exemplo.com" "senha" [--force]');
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente && !forcar) {
    console.error(
      `Já existe um usuário com o e-mail ${email} (${existente.nome}, ${existente.papel}).\n` +
        `Se a intenção é redefinir a senha dele, rode de novo com --force no final do comando.`
    );
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await db.usuario.upsert({
    where: { email },
    update: { senhaHash, nome, papel: "ADMIN", ativo: true },
    create: { nome, email, senhaHash, papel: "ADMIN" },
  });

  console.log(
    `Usuário ${existente ? "atualizado" : "criado"}: ${usuario.nome} <${usuario.email}> (${usuario.papel})`
  );
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
