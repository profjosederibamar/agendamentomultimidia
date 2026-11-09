# Como Publicar / Integrar no Vercel

Este projeto já está **100% configurado para o Vercel** com:
- `vercel.json` pronto (roteamento das funções serverless `/api/*` e SPA Vite).
- `api/index.ts` como função Serverless do Vercel para todas as rotas de banco de dados.
- Build automático via `npm run build` gerando a pasta `dist`.

---

## Opção 1: Publicação com GitHub + Vercel (Recomendada)

1. **Suba o código para o seu GitHub**:
   - Crie um repositório no GitHub (ex: `agendamento-escolar`).
   - Faça o commit e push dos arquivos.

2. **Acesse o Vercel**:
   - Acesse [vercel.com](https://vercel.com) e faça login.
   - Clique em **"Add New..."** > **"Project"**.
   - Selecione o seu repositório do GitHub e clique em **"Import"**.

3. **Configurações no Vercel**:
   - **Framework Preset**: O Vercel detectará automaticamente **Vite**.
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `dist` (padrão)

4. **Variáveis de Ambiente (Environment Variables)**:
   Em **Environment Variables**, adicione as credenciais do seu banco de dados PostgreSQL / Supabase:
   - `SQL_HOST`: Endereço do host do banco (ex: `aws-0-us-west-1.pooler.supabase.com` ou IP do servidor).
   - `SQL_DB_NAME`: Nome do banco de dados (ex: `postgres`).
   - `SQL_USER`: Usuário do banco (ex: `postgres`).
   - `SQL_PASSWORD`: Senha do banco de dados.

5. **Clique em "Deploy"**:
   - O Vercel fará a compilação do frontend e criará a API serverless automaticamente!

---

## Opção 2: Publicação Direta via Vercel CLI

Se preferir publicar pelo terminal:

```bash
# 1. Instale o Vercel CLI globalmente
npm i -g vercel

# 2. Faça login
vercel login

# 3. Publique o projeto
vercel
```
