# RUB Tarefas

App de gestão de tarefas (estilo Kanban) para uso pessoal e da **Rede Única de Baterias Bandeirantes**. Gratuito, instalável como PWA no celular.

## O que tem pronto

- Login e cadastro com e-mail/senha (protegido por um código de convite da loja)
- Quadro Kanban (A Fazer / Fazendo / Feito) com arrastar-e-soltar
- Duas áreas: **Loja** (tarefas compartilhadas entre a equipe) e **Pessoal** (só suas)
- Prioridade, prazo e responsável em cada tarefa
- Instalável na tela inicial do celular (PWA)

## Passo a passo para publicar (gratuito)

### 1. Criar o banco de dados (Neon)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita.
2. Crie um novo projeto (pode chamar de `rub-tarefas`).
3. Copie a **connection string** (algo como `postgresql://usuario:senha@ep-xxxxx.neon.tech/neondb?sslmode=require`).

### 2. Configurar o projeto localmente

Abra este projeto no Claude Code (ou terminal) e rode:

```bash
npm install
```

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o `.env` e preencha:

- `DATABASE_URL`: a connection string do Neon que você copiou
- `AUTH_SECRET`: gere uma com `openssl rand -base64 32` e cole o resultado
- `NEXTAUTH_URL`: deixe `http://localhost:3000` por enquanto

Adicione também no `.env` (não está no exemplo, mas é necessário):

```
STORE_INVITE_CODE="escolha-um-codigo-secreto-para-a-loja"
```

Esse código é o que os funcionários vão digitar na tela de cadastro para poder criar a própria conta — evita que qualquer pessoa se cadastre no sistema.

### 3. Criar as tabelas no banco

```bash
npm run db:push
```

Isso cria as tabelas `users` e `tasks` no banco Neon a partir do arquivo `prisma/schema.prisma`.

### 4. Testar localmente

```bash
npm run dev
```

Abra `http://localhost:3000`. Cadastre-se com o código de convite — **o primeiro usuário cadastrado vira automaticamente administrador**.

### 5. Publicar no Vercel

1. Suba este projeto para um repositório no GitHub (pode ser privado).
2. No [Vercel](https://vercel.com), clique em "New Project" e importe esse repositório.
3. Antes de publicar, adicione as variáveis de ambiente no painel do Vercel (Settings → Environment Variables):
   - `DATABASE_URL` (a mesma do Neon)
   - `AUTH_SECRET` (a mesma gerada antes)
   - `NEXTAUTH_URL` → coloque a URL que o Vercel vai te dar (ex: `https://rub-tarefas.vercel.app`) — pode ajustar depois do primeiro deploy
   - `STORE_INVITE_CODE` (o mesmo código escolhido)
4. Clique em Deploy.

Pronto — o app estará no ar, gratuitamente, em uma URL tipo `https://rub-tarefas.vercel.app`.

### 6. Instalar como app no celular

Abra a URL publicada no navegador do celular (Chrome no Android, Safari no iPhone) e escolha "Adicionar à tela inicial" / "Instalar app". O ícone azul "RUB" vai aparecer como um app normal.

## Observações técnicas

- **Prisma**: ao rodar `npm install` pela primeira vez (localmente ou no Vercel), o Prisma baixa automaticamente os arquivos necessários para conectar ao banco. Isso precisa de acesso à internet livre — funciona normalmente tanto localmente quanto no Vercel.
- **Papéis de usuário**: o primeiro a se cadastrar vira `ADMIN` (pode excluir qualquer tarefa da loja); os demais entram como `FUNCIONARIO` (podem criar, editar e mover tarefas da loja, mas só excluir as que criaram).
- **Custo**: tanto o Vercel quanto o Neon têm planos gratuitos que cobrem tranquilamente o uso de uma pequena equipe. Não há necessidade de cartão de crédito para começar.
- **Trocar o código de convite**: se quiser invalidar o código antigo (ex: um funcionário saiu da empresa), basta mudar `STORE_INVITE_CODE` nas variáveis de ambiente do Vercel e fazer um novo deploy.

## Estrutura do projeto

```
src/
  app/              páginas (login, cadastro, quadro principal) e rotas de API
  components/       componentes React (quadro Kanban, cartões, modal de tarefa)
  lib/              autenticação, conexão com banco, validações
prisma/
  schema.prisma     modelo do banco de dados
public/
  manifest.json     configuração do PWA
  icons/            ícones do app
  sw.js             service worker (permite instalar no celular)
```
