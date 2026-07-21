-- CreateEnum
CREATE TYPE "PrioridadeTarefa" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- AlterEnum
ALTER TYPE "OrigemLead" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "prioridade" "PrioridadeTarefa" NOT NULL DEFAULT 'MEDIA';
