# DeCasa OS — Sistema Operacional Comercial Inteligente

Fundação do sistema para a DeCasa Esquadrias. Este é o **Sprint 0 (Fundação)**:
modelo de dados completo + esqueleto do projeto + primeiro serviço de IA funcional
(interpretação automática de leads).

## O que já está pronto

- `prisma/schema.prisma` — modelo de dados completo (Usuários, Empresas, Contatos,
  Leads, Negociações, Follow-ups, Conversas/WhatsApp, Orçamentos, Documentos,
  Timeline, Base de Conhecimento, Auditoria de Agentes de IA).
- `src/lib/db.ts` — conexão com o banco.
- `src/server/leadInterpreter.ts` — primeiro agente de IA: recebe o texto bruto
  de um lead (ex: mensagem de WhatsApp) e preenche automaticamente produto de
  interesse, urgência e valor estimado. **Esta é a peça que elimina o cadastro manual.**

## Como rodar localmente

Pré-requisitos: Node.js 20+, PostgreSQL, Redis.

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL, ANTHROPIC_API_KEY, etc.
npm run db:migrate     # cria as tabelas no Postgres a partir do schema.prisma
npm run dev
```

> Este ambiente de chat não tem acesso à internet, então não consigo rodar
> `npm install` nem subir um banco aqui. O código está pronto para você rodar
> no seu computador (ou eu posso te guiar passo a passo se preferir).

## Sprint 1 — Central de Leads + Orçamentos (concluído)

- `POST /api/leads/webhook?origem=WHATSAPP` — endpoint único para qualquer
  canal (WhatsApp, landing page, Facebook, Google, planilha). Grava o lead
  cru, chama a IA para interpretar, e já cria a Negociação automaticamente.
- `src/server/negociacaoService.ts` — converte Lead → Negociação com título e
  probabilidade inicial calculados automaticamente.
- `GET/PATCH /api/negociacoes` — lista negociações (para o Kanban) e move o
  estágio (drag & drop).
- `POST /api/orcamentos` — cria uma nova versão de orçamento e já avança o
  card para "Orçamento enviado".
- `src/app/negociacoes/page.tsx` — tela de Kanban com drag & drop entre
  estágios.
- `src/components/GaugeProbability.tsx` — elemento de assinatura visual: um
  medidor circular (manômetro) de probabilidade de fechamento em cada card,
  em vez da barra de progresso genérica de qualquer SaaS.
- `src/app/globals.css` — paleta "blueprint industrial" (azul de planta
  técnica + âmbar de sinalização), tipografia Space Grotesk / Inter /
  JetBrains Mono.

### Testando o webhook de leads

```bash
curl -X POST "http://localhost:3000/api/leads/webhook?origem=WHATSAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Pedro",
    "telefone": "11999998888",
    "cidade": "São Paulo",
    "mensagem": "Preciso de orçamento urgente para 8 janelas de alumínio, obra entrega em 3 semanas"
  }'
```

Isso cria o Lead, a IA interpreta (produto, urgência, valor estimado) e a
Negociação já aparece no Kanban em `/negociacoes`.

## Sprint 2 — Follow-up Inteligente + WhatsApp (concluído)

O coração do sistema. Peças:

- `src/server/followUpEngine.ts` — **motor de prioridade**: pontua cada
  negociação aberta combinando tempo parado (curva quadrática — cliente parado
  3+ dias dispara alerta), valor em jogo, probabilidade de fechamento e
  estágio. Sempre gera explicação em linguagem natural ("Orçamento enviado há
  5 dias sem resposta, R$ 45.000 em jogo, cliente quente").
- `src/server/followUpMessageAgent.ts` — agente de IA que escreve a mensagem
  de follow-up personalizada com base no histórico REAL da conversa e do
  orçamento — nunca um template genérico. Respeita a regra da janela de 24h
  do WhatsApp Business API.
- `src/server/jobs/dailyFollowUpJob.ts` — job BullMQ que roda todo dia às
  05:00: monta a fila, gera as mensagens do top 15 por IA, marca pendências
  antigas como atrasadas (nada some silenciosamente).
- `POST /api/whatsapp/webhook` — toda mensagem recebida no WhatsApp:
  encontra o cliente pelo telefone OU cria Lead+Negociação sozinho, detecta a
  intenção por IA ("pedindo_orcamento", "pronto_para_fechar"...), grava tudo
  na timeline. Cliente respondeu? Follow-up pendente é concluído sozinho.
- `/fila-do-dia` — a tela da manhã: quem contatar, em que ordem, por qual
  canal, por quê, com a mensagem pronta para copiar e enviar.

### Rodando o worker de follow-up (processo separado)

```bash
npx tsx src/server/jobs/dailyFollowUpJob.ts
```

### Configurando o WhatsApp

1. Criar app na Meta for Developers com produto "WhatsApp Business".
2. Apontar o webhook para `https://SEU_DOMINIO/api/whatsapp/webhook` com o
   verify token definido em `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. Preencher `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` no `.env`.

> Regra importante da Meta: mensagens iniciadas por você fora da janela de
> 24h desde a última mensagem do cliente exigem templates pré-aprovados.
> Por isso a Fila do Dia entrega a mensagem para VOCÊ revisar e enviar — o
> sistema nunca dispara mensagem fria automaticamente sem template aprovado.

## Sprint 3 — Painel Executivo (concluído)

Inversão do dashboard tradicional: a página abre com FRASES do diretor
comercial virtual, não com gráficos. Os números ficam abaixo, como evidência.

- `src/server/kpiService.ts` — agregador de indicadores: leads/semana,
  valor em aberto, valor parado 3+ dias, perdas da semana com motivos,
  conversão por origem (Google vs Instagram vs indicação...), ticket médio
  por tipo de empresa (arquitetos vs construtoras), clientes quentes parados,
  progresso vs meta de R$ 150.000.
- `src/server/executiveAgent.ts` — Agente Executivo: transforma os KPIs em
  4-7 insights com tipo (alerta / fazer hoje / oportunidade / tendência).
  Instrução crítica no prompt: não inventar padrão sem amostra suficiente.
  Se a IA falhar, insights determinísticos garantem que o painel nunca
  fica vazio.
- `GET /api/painel` e `/painel` — a tela: insights primeiro, barra de meta
  do mês, grade de números de apoio (cards críticos ficam com borda
  vermelha), lista de clientes quentes parados.

## Sprint 4 — Prospecção B2B (concluído)

- `src/server/prospectionAgent.ts` — agente com ferramenta de busca web
  (Anthropic web_search) que pesquisa construtoras, incorporadoras,
  escritórios de arquitetura e engenharias reais por segmento/região.
  **Compliance por design:** só coleta informação pública, nunca infere
  dados não publicados, e toda empresa nasce marcada `origemProspec = true`
  para revisão humana antes de qualquer contato.
- `src/server/cadenceAgent.ts` — gera cadência de 3 toques (e-mail de
  abertura → ligação de reforço com roteiro → e-mail de fechamento) sempre
  personalizada ao perfil real da empresa encontrada, nunca script genérico.
- `POST/GET /api/prospeccao` e `POST /api/prospeccao/cadencia` — endpoints.
- `/prospeccao` — tela de busca + cadência gerada por empresa.

## Sprint 5 — Base Técnica (RAG) + Aprendizado de Estilo (concluído)

- `src/server/knowledgeBase.ts` — busca textual na base de artigos técnicos
  (vidros, perfis, ferragens, normas, instalação, manutenção). Desenhado para
  trocar depois por busca vetorial (pgvector) sem quebrar quem consome.
- `src/server/technicalAgent.ts` — **Agente Técnico**: toda dúvida técnica de
  cliente passa por aqui, que consulta a base ANTES de responder. Se a base
  não cobre o assunto, ele diz isso explicitamente em vez de inventar
  especificação estrutural — segurança do cliente final vem antes de
  "parecer que sabe tudo". Já conectado ao webhook do WhatsApp: mensagem
  classificada como `tirando_duvida_tecnica` vira automaticamente uma tarefa
  com a resposta sugerida, pronta para o vendedor revisar.
- `src/server/styleLearningAgent.ts` — **Módulo 8**: analisa as mensagens do
  vendedor SOMENTE em negociações que ele *ganhou*, e aprende tom de voz,
  argumentos fortes, como ele responde objeções e como conduz o fechamento.
  Esse perfil é injetado automaticamente no gerador de mensagens de
  follow-up — quanto mais negócios fechados, mais o sistema soa como o
  próprio vendedor. Exige amostra mínima de 10 mensagens para evitar perfil
  especulativo.
- `POST/GET /api/base-tecnica` — cadastro e consulta de artigos técnicos.

## Fase 5 — Segurança, Autenticação, Dark Mode e Deploy (concluído)

- **Autenticação real** (`src/lib/auth.ts`, NextAuth v5 + Credentials): login
  por e-mail/senha, senha sempre com hash bcrypt (nunca texto puro), sessão
  JWT carregando `papel` do usuário para checagem de permissão em qualquer
  tela ou rota.
- **`src/middleware.ts`** — protege todas as rotas do sistema; só ficam
  públicas `/login` e os webhooks externos (WhatsApp, leads — esses são
  autenticados por token de verificação da Meta / segredo de webhook, não
  por sessão de usuário).
- **`src/lib/permissoes.ts`** — `exigirPapel(["ADMIN"])` para proteger ações
  sensíveis por papel (ADMIN / GESTOR / VENDEDOR), em um único lugar.
- **`LogAtividade` no schema** — auditoria de segurança: todo login (sucesso
  ou falha) e ação sensível fica registrado com usuário, ação e timestamp.
  Separado de `ExecucaoAgente`, que audita as ações dos agentes de IA.
- **Dark/Light mode de verdade** (`src/components/ThemeToggle.tsx`) —
  alternância persistente entre sessões, com script anti-flash no `<head>`
  para nunca mostrar o tema errado por uma fração de segundo no carregamento.
- **`src/app/layout.tsx`** — layout raiz com navegação lateral entre todos
  os módulos, sessão do usuário logado e o botão de tema.
- **Backups automatizados** (`scripts/backup.sh`) — dump comprimido do
  Postgres, envio opcional para S3/R2, e limpeza automática de backups com
  mais de 30 dias. Pronto para agendar via cron.
- **`Dockerfile`** — pronto para deploy em Railway, Render, Fly.io ou
  qualquer host de containers.
- **`scripts/criarPrimeiroUsuario.ts`** — cria o admin inicial com senha já
  em hash (`npm run criar-usuario "Seu Nome" "email@exemplo.com" "senha"`).

### Colocando em produção — checklist

```bash
npm install
cp .env.example .env         # preencha todas as variáveis
npm run db:migrate           # cria as tabelas
npm run criar-usuario "André" "andre@decasa.com.br" "senha-forte-aqui"
npm run build && npm start   # ou: docker build -t decasa-os . && docker run ...
```

Depois, configure:
1. **Cron do backup**: `0 3 * * * /caminho/decasa-os/scripts/backup.sh`
2. **Worker de follow-up** como processo separado sempre ativo:
   `npx tsx src/server/jobs/dailyFollowUpJob.ts`
3. **Webhook do WhatsApp** apontando para `https://SEU_DOMINIO/api/whatsapp/webhook`

## Roadmap — 100% concluído

Fundação → Central de Leads/Orçamentos → Follow-up Inteligente/WhatsApp →
Painel Executivo → Prospecção B2B → Base Técnica/Aprendizado de Estilo →
Segurança/Deploy. Todos os 9 módulos do briefing original mapeados abaixo.

## Todos os 9 módulos do briefing original — mapa final

| Módulo do briefing | Onde foi implementado |
|---|---|
| 1. Central de Leads | `leadInterpreter.ts`, webhook de leads |
| 2. Inteligência de Follow-up | `followUpEngine.ts`, `dailyFollowUpJob.ts`, `/fila-do-dia` |
| 3. WhatsApp | `api/whatsapp/webhook`, `Conversa`/`Mensagem` no schema |
| 4. Múltiplos agentes de IA | Cada `server/*Agent.ts` é um agente especializado auditado em `ExecucaoAgente` |
| 5. Prospecção B2B | `prospectionAgent.ts`, `cadenceAgent.ts`, `/prospeccao` |
| 6. Orçamentos | `api/orcamentos`, modelo `Orcamento` |
| 7. Painel Executivo | `kpiService.ts`, `executiveAgent.ts`, `/painel` |
| 8. Inteligência de Vendas (aprendizado de estilo) | `styleLearningAgent.ts` |
| 9. Base Técnica | `knowledgeBase.ts`, `technicalAgent.ts` |

## O que fica para depois (evolução natural, não bloqueia o uso)

- **Distribuição de leads** entre múltiplos vendedores (hoje atribui ao
  primeiro usuário ativo — regra de round-robin/por região é o próximo passo
  natural quando houver mais de um vendedor usando o sistema).
- **Importação de planilhas/CSV** de leads em lote (o webhook já aceita
  `origem=PLANILHA_IMPORTACAO`, falta o parser de upload).
- **Busca vetorial (pgvector)** na Base Técnica quando o volume de artigos
  crescer — a função `buscarBaseTecnica()` foi desenhada para essa troca não
  quebrar nada que a consome.
- **2FA** para usuários ADMIN, já que eles têm acesso a dados financeiros
  agregados de toda a operação.

## Decisões de arquitetura já tomadas (ver justificativa completa na conversa)

- Web App responsivo (PWA), não Electron/Tauri — precisa rodar 24/7 recebendo
  webhooks e ser acessível do celular em campo.
- PostgreSQL + Prisma como fonte única de verdade do modelo de dados.
- WhatsApp: API oficial da Meta (Cloud API) — mensagens frias fora da janela de
  24h exigem templates pré-aprovados; isso já está considerado no design do
  Módulo de Follow-up.
