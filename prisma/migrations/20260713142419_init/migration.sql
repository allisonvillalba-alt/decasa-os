-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'VENDEDOR', 'GESTOR');

-- CreateEnum
CREATE TYPE "TipoEmpresa" AS ENUM ('CONSTRUTORA', 'INCORPORADORA', 'ESCRITORIO_ARQUITETURA', 'ENGENHARIA', 'FACHADA_RETROFIT', 'OUTRO');

-- CreateEnum
CREATE TYPE "OrigemLead" AS ENUM ('WHATSAPP', 'LANDING_PAGE', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE', 'EMAIL', 'PLANILHA_IMPORTACAO', 'PROSPECCAO_B2B', 'INDICACAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EstagioNegociacao" AS ENUM ('NOVO_LEAD', 'QUALIFICACAO', 'ORCAMENTO_ENVIADO', 'NEGOCIACAO', 'FECHADO_GANHO', 'FECHADO_PERDIDO', 'PAUSADO');

-- CreateEnum
CREATE TYPE "StatusFollowUp" AS ENUM ('PENDENTE', 'CONCLUIDO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CanalFollowUp" AS ENUM ('WHATSAPP', 'LIGACAO', 'EMAIL', 'VISITA');

-- CreateEnum
CREATE TYPE "DirecaoMensagem" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'VENDEDOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoEmpresa" NOT NULL DEFAULT 'OUTRO',
    "cidade" TEXT,
    "estado" TEXT,
    "site" TEXT,
    "linkedin" TEXT,
    "observacoes" TEXT,
    "origemProspec" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "empresaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "origem" "OrigemLead" NOT NULL,
    "interesseBruto" TEXT,
    "produtosInteresse" TEXT[],
    "urgenciaInferida" TEXT,
    "valorEstimado" DECIMAL(12,2),
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negociacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estagio" "EstagioNegociacao" NOT NULL DEFAULT 'NOVO_LEAD',
    "valorEstimado" DECIMAL(12,2),
    "probabilidade" INTEGER,
    "motivoPerdido" TEXT,
    "leadId" TEXT,
    "contatoId" TEXT,
    "empresaId" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negociacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "canal" "CanalFollowUp" NOT NULL,
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "status" "StatusFollowUp" NOT NULL DEFAULT 'PENDENTE',
    "mensagemSugerida" TEXT,
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "motivoPrioridade" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversa" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT,
    "contatoId" TEXT,
    "telefone" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "intencaoDetectada" TEXT,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2),
    "prazoEntrega" TEXT,
    "status" "StatusOrcamento" NOT NULL DEFAULT 'RASCUNHO',
    "itens" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT,
    "responsavelId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "dataLimite" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoTimeline" (
    "id" TEXT NOT NULL,
    "negociacaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtigoTecnico" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtigoTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAtividade" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT,
    "entidadeId" TEXT,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilEstiloVendas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tomDeVoz" TEXT NOT NULL,
    "argumentosFortes" TEXT NOT NULL,
    "objecoesComuns" TEXT NOT NULL,
    "fechamentosTipicos" TEXT NOT NULL,
    "amostrasAnalisadas" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilEstiloVendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecucaoAgente" (
    "id" TEXT NOT NULL,
    "agente" TEXT NOT NULL,
    "usuarioId" TEXT,
    "entradaResumo" TEXT NOT NULL,
    "saidaResumo" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecucaoAgente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Negociacao_leadId_key" ON "Negociacao"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilEstiloVendas_usuarioId_key" ON "PerfilEstiloVendas"("usuarioId");

-- AddForeignKey
ALTER TABLE "Contato" ADD CONSTRAINT "Contato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negociacao" ADD CONSTRAINT "Negociacao_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negociacao" ADD CONSTRAINT "Negociacao_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negociacao" ADD CONSTRAINT "Negociacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negociacao" ADD CONSTRAINT "Negociacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTimeline" ADD CONSTRAINT "EventoTimeline_negociacaoId_fkey" FOREIGN KEY ("negociacaoId") REFERENCES "Negociacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAtividade" ADD CONSTRAINT "LogAtividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecucaoAgente" ADD CONSTRAINT "ExecucaoAgente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
