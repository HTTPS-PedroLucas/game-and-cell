# Deploy gratuito: Render + Supabase + Cloudinary

Esta arquitetura mantém o site e o painel como estão para o usuário. A diferença fica nos
bastidores: o Render executa o Node.js, o Supabase guarda dados no PostgreSQL e o Cloudinary
guarda as imagens.

## 1. Contas e propriedade

Crie as três contas em nome da Game & Cell, com e-mail controlado pela empresa. Convide o
desenvolvedor como colaborador quando o serviço permitir, em vez de deixar a produção presa a
uma conta pessoal.

## 2. Supabase

1. Crie um projeto gratuito e guarde a senha do banco.
2. Em **Project Settings > Database**, copie a connection string PostgreSQL. Para uma aplicação
   no Render, prefira a URL do pooler em modo de sessão quando estiver disponível.
3. Troque a senha na URL por uma versão percent-encoded caso contenha caracteres especiais.
4. Use a URL completa como `DATABASE_URL` no Render e mantenha `DATABASE_SSL=true`.
5. Não exponha a service role key: esta aplicação usa somente a conexão PostgreSQL no servidor.

O schema é aplicado de forma idempotente por `npm run db:migrate` no início do serviço. Um banco
vazio recebe o conteúdo de `src/lib/defaults.js` uma única vez.

## 3. Cloudinary

1. Crie a conta gratuita.
2. No Console, copie a variável `CLOUDINARY_URL` no formato
   `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.
3. Salve-a somente no ambiente do Render. Defina `CLOUDINARY_FOLDER=game-and-cell`.

O navegador continua comprimindo a imagem para WebP. O servidor valida tamanho e MIME, mantém
o arquivo em memória e envia diretamente ao Cloudinary.

## 4. Render

1. Envie esta versão do repositório ao GitHub.
2. No Render, crie um **Blueprint** usando `render.yaml`, ou um **Web Service** manual.
3. Se fizer manualmente, use:
   - build: `npm ci`
   - start: `npm run db:migrate && npm start`
   - health check: `/health`
4. Configure as variáveis abaixo.
5. No primeiro deploy, defina também `ADMIN_EMAIL`, `ADMIN_SENHA` e opcionalmente `ADMIN_NOME`.
   A migração cria o primeiro administrador se ainda não existir.
6. Após o primeiro login bem-sucedido, remova `ADMIN_SENHA` e `ADMIN_EMAIL` do Render e faça um
   novo deploy. O administrador já permanece no PostgreSQL.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
|---|---:|---|
| `DATABASE_URL` | sim | connection string PostgreSQL do Supabase |
| `DATABASE_SSL` | produção | deve ser `true` no Supabase |
| `DATABASE_POOL_MAX` | recomendada | `5` reduz pressão no limite de conexões |
| `JWT_SECRET` | sim | segredo aleatório de 32+ caracteres para as sessões |
| `CLOUDINARY_URL` | sim | credenciais do Cloudinary, somente no servidor |
| `CLOUDINARY_FOLDER` | não | pasta dos assets; padrão `game-and-cell` |
| `SITE_URL` | sim | URL pública sem barra final, usada no sitemap |
| `NODE_ENV` | sim | `production` no Render |
| `ADMIN_EMAIL` | primeiro deploy | cria o primeiro administrador |
| `ADMIN_SENHA` | primeiro deploy | senha inicial; remover depois |
| `ADMIN_NOME` | não | nome mostrado na sessão |

Também é possível substituir `CLOUDINARY_URL` por `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.

## Importar o `data/db.json` antigo

Faça isso em um banco novo, antes de cadastrar qualquer conteúdo:

```bash
npm run db:import -- data/db.json
```

O importador cancela se detectar conteúdo no PostgreSQL, para não sobrescrever produção. URLs
que começam por `/uploads/` são enviadas ao Cloudinary quando o arquivo correspondente existe
em `public/uploads`. Arquivos ausentes geram aviso e mantêm a URL antiga para revisão manual.

## Segurança e operação

- Toda rota de leitura ou alteração sob `/api/admin` exige JWT em cookie `httpOnly`; só login e
  logout são públicos.
- Há limite simples de tentativas de login por IP, senha com bcrypt e cookie `Secure` em HTTPS.
- Nunca coloque `.env`, `DATABASE_URL`, `JWT_SECRET` ou credenciais do Cloudinary no Git.
- Faça exportações periódicas do PostgreSQL. O plano gratuito não substitui uma política de
  backup da empresa.

## Limitações atuais dos planos gratuitos

- **Render:** o Web Service gratuito hiberna após 15 minutos sem tráfego e pode levar cerca de
  um minuto para acordar. O disco é efêmero, há 750 horas mensais por workspace e limites de
  banda/build. Por isso nenhuma informação do site é salva localmente.
- **Supabase:** o Free Plan oferece 500 MB de banco por projeto e pode pausar projetos com pouca
  atividade após cerca de uma semana. Para esta loja o volume é amplo, mas um site muito parado
  pode exigir retomada manual pelo painel.
- **Cloudinary:** o Free Plan usa uma franquia combinada de 25 créditos mensais. Um crédito
  equivale a 1 GB de armazenamento, 1 GB de banda de imagens ou 1.000 transformações; o consumo
  soma essas dimensões.
- Planos, cotas e políticas podem mudar. Verifique antes de assinar ou vender uma garantia de
  disponibilidade: https://render.com/docs/free,
  https://supabase.com/docs/guides/platform/billing-on-supabase e
  https://cloudinary.com/documentation/billing_and_plans.
