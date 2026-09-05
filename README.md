# Game & Cell — site e painel

Site institucional/vitrine da Game & Cell (Rua Coronel Mendonça, 275 — centro de Iguatu/CE),
construído a partir do `BriefingGameeCell.pdf`.

A decisão que define tudo, e que veio do briefing: **não é uma loja virtual, é uma vitrine que
termina no WhatsApp.** Não há checkout, frete nem gestão de estoque online. Cada botão abre a
conversa já dizendo qual produto ou serviço interessa.

---

## Como rodar

```bash
npm install
```

Crie um PostgreSQL (local ou Supabase), copie `.env.example` para `.env` e preencha
`DATABASE_URL`, `JWT_SECRET` e as credenciais do Cloudinary. Para gerar o segredo da sessão:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crie as tabelas e importe o conteúdo inicial:

```bash
npm run db:migrate
```

Crie o administrador do painel:

```bash
npm run seed
```

O comando pergunta nome, e-mail e senha no terminal (a senha aparece como asteriscos). Em
ambiente sem terminal — deploy, CI, script — passe por variável de ambiente:

```bash
ADMIN_EMAIL=voce@loja.com ADMIN_SENHA=suaSenhaForte npm run seed
```

Outras operações:

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | aplica migrações pendentes e cria o conteúdo inicial se o banco estiver vazio |
| `npm run db:import -- caminho/db.json` | importa um `db.json` antigo e envia uploads locais existentes ao Cloudinary |
| `npm run seed -- --listar` | mostra quem tem acesso ao painel |
| `npm run seed -- --senha email@loja.com` | troca a senha de quem já existe |
| `npm run seed -- --remover email@loja.com` | tira o acesso de alguém |

Remover o último administrador é bloqueado — sem isso dá para se trancar do lado de fora.

Suba o servidor:

```bash
npm start
```

- Site: `http://localhost:3000`
- Painel: `http://localhost:3000/admin`

Para desenvolvimento com recarga automática: `npm run dev`.

---

## Rodar localmente, sem Supabase nem Cloudinary

Para desenvolver e demonstrar sem depender de serviço externo:

```bash
npm run dev:local
```

Sobe o site inteiro em `http://localhost:3000` usando um PostgreSQL em memória
(`pg-mem`) com o mesmo schema de produção. As imagens enviadas pelo painel vão
para `public/uploads` em vez do Cloudinary.

**Os dados persistem.** Ao encerrar com `Ctrl+C` — e automaticamente a cada 30
segundos — o banco é gravado em `data/dev-local.json` e recarregado no próximo
início. Dá para cadastrar produtos, receber pedidos e continuar de onde parou.

O login do painel sai de `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env`. Sem eles,
usa `admin@local` / `gamecell-local`. Para recomeçar do conteúdo inicial,
apague `data/dev-local.json`.

### No VS Code

| Atalho | O que faz |
|---|---|
| `Ctrl+Shift+B` | Inicia o site (tarefa padrão) |
| `F5` | Inicia com o depurador, com pontos de parada |
| `Ctrl+Shift+P` → *Run Task* | Rodar os testes, ou recomeçar do zero |

Encerre com `Ctrl+C` no terminal integrado para o banco ser salvo.

> Os ids são reatribuídos a cada restauração — o conteúdo é o mesmo, mas a
> numeração muda. Não afeta o site, que usa slug nas URLs públicas.

---

## Páginas

| Rota | O que resolve | Prioridade no briefing |
|---|---|---|
| `/` | Em 5 segundos: o que vende, onde fica, como falar | Máxima |
| `/vitrine` | Catálogo com filtro por categoria e marca, preço à vista e parcelado | Máxima |
| `/assistencia-tecnica` | Serviços, prazo, garantia e orçamento sem compromisso | Máxima |
| `/pagamento` | Formas de pagamento e simulador de parcelas | Alta |
| `/garantia` | Prazo por categoria, como acionar, política de troca | Alta |
| `/entrega` | Bairros, cidades vizinhas e retirada na loja | Alta |
| `/torneios` | Agenda, regulamento, premiação e inscrição | Alta |
| `/a-loja` | Ambiente, equipe com nome e função, prova social | Média |
| `/admin` | Painel do administrador (sem indexação) | — |

Também servidos: `/robots.txt` e `/sitemap.xml`.

---

## Painel do administrador

Uma página só, protegida por sessão (bcrypt + JWT em cookie `httpOnly`). Sete abas:

- **Painel** — produtos no ar, pedidos sem resposta, produtos sem foto, e a lista das 8
  pendências que o briefing manda confirmar com a loja antes do primeiro layout.
- **Produtos** — CRUD com foto, preço à vista, preço antigo (vira selo de desconto),
  parcelas, disponibilidade, ficha técnica e marcação de destaque.
- **Assistência** — serviços com prazo, garantia e faixa de preço.
- **Torneios** — data, regulamento, premiação, vagas e contagem de inscritos.
- **Equipe e prova** — pessoas do balcão e depoimentos (publicação individual).
- **Pedidos** — orçamentos e inscrições recebidos, com botão que já abre a resposta no
  WhatsApp do cliente e controle de status (novo / atendido / perdido).
- **Textos e ajustes** — contato, endereço, horário, pagamento, garantia e entrega.

O que muda no painel aparece no site na mesma hora, sem rebuild.

### Regras de conteúdo aplicadas na API

O painel recusa salvar coisas que o briefing marca como erro:

- produto sem preço — *"consulte valores" é o maior ponto de abandono do varejo local*;
- serviço sem prazo, garantia ou faixa de preço;
- torneio com inscrição aberta sem o valor da inscrição.

### Imagens

Antes de enviar, o navegador reduz para 1200px no maior lado e converte para **WebP** via
canvas. O servidor aceita apenas JPG/PNG/WebP/AVIF, no máximo 3MB, mantém o arquivo apenas em
memória durante a requisição e o envia ao Cloudinary. A URL HTTPS retornada fica no PostgreSQL;
nada depende do disco efêmero do Render.

> `sharp` foi testado e descartado: nesta máquina o Controlo de Aplicações do Windows bloqueia
> o binário nativo (`ERR_DLOPEN_FAILED`). O canvas do navegador resolve sem dependência nativa.

---

## Decisões de arquitetura

**Renderização no servidor, HTML e CSS puros.** O briefing marca "mobile primeiro, de verdade"
e "velocidade" como CRÍTICOS, e SEO local como ALTO. Uma SPA React entregaria um bundle grande
e um HTML vazio para o Google. Aqui produto, preço e endereço já vêm no HTML. O JavaScript do
site público é um arquivo só, com menu, simulador, animações e os dois formulários.

**PostgreSQL com tabelas relacionais nas entidades principais.** Administradores, categorias,
marcas, produtos, serviços, torneios, equipe, depoimentos e leads têm tabelas próprias. Blocos
editoriais de formato variável (pagamento, garantia, entrega e textos institucionais) usam
JSONB na tabela `settings`. Isso preserva a simplicidade do MVP e permite evoluir o catálogo
para várias lojas sem depender do sistema de arquivos.

**Dados estruturados** de `ElectronicsStore` em todas as páginas, `ItemList`/`Product` na
vitrine, `Service` na assistência e `Event` nos torneios.

---

## Sistema de design

Extraído da identidade que a loja já tem: o verde não vive só no logo, está no letreiro, na
parede e na iluminação da loja física.

| Token | Valor | Uso |
|---|---|---|
| `--logo-topo` | `#E2F5A8` | Topo do gradiente (16:1) |
| `--logo-meio` | `#A8D93B` | Meio do gradiente (11,3:1) |
| `--logo-base` | `#6FAF32` | Base do gradiente (7:1) |
| `--verde-folha` | `#4E9E2F` | Bordas e superfícies |
| `--neon` | `#C6F03C` | CTA, preço, destaque |
| `--preto` | `#101210` | Fundo |
| `--branco` | `#F2F4F0` | Texto |

As paradas do gradiente foram **amostradas pixel a pixel do PNG oficial do logo**
(`GC sem contorno.png`), varrendo o arquivo em 12 faixas horizontais. O gradiente real vai de
`#B6D182` no topo das letras a `#1E5C1F` na base.

**A base foi clareada de propósito.** O verde escuro original do logo (`#2E7D32`) mede apenas
**3,67:1** sobre o preto — reprova em texto normal no WCAG AA. Em texto ele foi substituído por
`#6FAF32`, que preserva a leitura do gradiente e mede **7,04:1**. O valor fiel continua
disponível em `--gradiente-logo-fiel`, só para preenchimento decorativo.

**Regra de contraste que define os botões:** verde-folha com texto branco dá 3,4:1 e
reprovaria. Por isso todo CTA é **fundo verde-limão com texto preto** (14,8:1) — que é o que
as artes da marca já fazem. Verde-folha nunca carrega texto.

**Tipografia:** Barlow Condensed nos títulos e Barlow no corpo e nas fichas técnicas.

### Elementos da marca

Os arquivos oficiais foram recortados na área útil, redimensionados e convertidos para WebP:

| Arquivo | Antes | Depois |
|---|---|---|
| `logo.webp` | 4,2 MB | 100 KB |
| `logo-pequeno.webp` | — | 29 KB |
| `controle.webp` | 5,5 MB | 44 KB |
| `celular.webp` | 6,9 MB | 41 KB |

O controle e o celular aparecem soltos no fundo do hero, com paralaxe e flutuação. O hero usa
`srcset` para servir a versão de 360px em telas de baixa densidade. Caminho crítico da home:
**~200 KB** sem contar a compressão do servidor.

---

## Animações

Sem biblioteca. IntersectionObserver + CSS entregam o mesmo resultado que GSAP + ScrollTrigger
neste caso, sem os ~50 KB de CDN — e velocidade em 4G é requisito crítico. Só `transform` e
`opacity` são animados, nunca propriedades que disparam layout.

| Efeito | Como | Onde |
|---|---|---|
| Entrada da primeira tela | `@keyframes` com `fill-mode: backwards` | Hero: logo, título, provas, CTAs |
| Revelação na rolagem | IntersectionObserver + transição | Seções e cards |
| Cascata | `--i` por filho, 70ms de passo, teto de 8 | Grades de produto e serviço |
| Paralaxe | `scroll` com rAF, fatores 0,10 e −0,16 | Só controle e celular do hero |
| Flutuação | `@keyframes` de 7s e 10s | Elementos decorativos |
| Cabeçalho | classe `.rolado` acima de 8px | Barra fixa |

**A entrada é CSS puro, de propósito.** A primeira versão adicionava a classe por
`requestAnimationFrame` — e rAF não roda em aba oculta, então quem abrisse o link em segundo
plano veria o hero invisível. Com `@keyframes` + `backwards`, o estado escondido só existe
enquanto a animação está pendente; se ela nunca rodar, o elemento fica no estado final.

Três camadas garantem que o conteúdo nunca desapareça:

1. O estado escondido só é aplicado sob a classe `.anim`, que um script no `<head>` adiciona
   antes da primeira pintura. **Sem JavaScript, nada fica escondido.**
2. `prefers-reduced-motion` desliga tudo e entrega o estado final — em CSS e em JS, inclusive
   se a pessoa mudar a preferência com a página já aberta.
3. Rede de segurança: 2,5s após o carregamento, qualquer elemento ainda escondido que esteja
   dentro da janela é revelado à força.

O paralaxe fica restrito a elementos decorativos (`aria-hidden`, `alt` vazio). Texto e
controles nunca se movem com a rolagem — a base da skill de design marca isso como causa de
desconforto de leitura e enjoo.

---

## Verificações feitas

- Contraste medido no DOM: todos os pares passam WCAG AA. O menor é 6,56:1 (base do gradiente
  sobre superfície elevada). O selo "Em estoque" mede 6,71:1 com o alfa composto.
- Alvos de toque: nenhum abaixo de 44×44px.
- Animações: só `transform` e `opacity`; interpolação conferida quadro a quadro pela Web
  Animations API, terminando em `opacity: 1` e `transform: none`.
- Sem a classe `.anim`, todos os elementos computam `opacity: 1` — caminho sem JS validado.
- Imagens: todas com `alt` e com `width`/`height` declarados (sem CLS).
- Menu do celular com `aria-expanded`, fechamento por `Esc` e devolução do foco.
- Erros de formulário ao lado do campo, com `aria-invalid` e foco no primeiro problema.
- Link "pular para o conteúdo" e `:focus-visible` em toda a interface.

### O que foi evitado, por instrução do briefing

Carrossel gigante no topo; catálogo sem preço; formulário longo de contato (só há dois
formulários, ambos onde geram dado útil); texto institucional vazio; fotos de banco de imagens
— no lugar delas há molduras que dizem exatamente qual foto real está faltando.

---

## Antes de publicar

Não existe login padrão no código. Crie o primeiro administrador com `npm run seed` ou use
temporariamente `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` no primeiro `npm run db:migrate`.
Remova `ADMIN_SENHA` do ambiente depois da criação.

O conteúdo de partida veio do briefing como **exemplo**. Preços, prazos, taxas e bairros
precisam ser conferidos item por item no painel. As 8 perguntas que o briefing manda levar para
a loja estão listadas na aba **Painel**, entre elas: se a assistência é própria ou terceirizada,
se existe crediário, até onde a loja entrega e se aceita aparelho usado na troca.

Uma dessas pendências ficou resolvida: as cores oficiais foram extraídas do PNG do logo. Ainda
vale conseguir o **arquivo vetorial** — o PNG serve para a web, mas impressão e letreiro pedem
vetor.

Nenhuma foto do ambiente ou da equipe foi incluída — o briefing é explícito em que usar banco
de imagens seria "jogar fora o melhor ativo" da marca.

---

## Estrutura

```
src/
  server.js          rotas, SEO, 404
  lib/               PostgreSQL, Cloudinary, helpers, auth, seed, conteúdo inicial
  routes/            publico.js (orçamento, inscrição) e admin.js (API do painel)
  views/             templates de cada página + layout, componentes e ícones
public/
  css/site.css       sistema de design e animações
  css/admin.css      painel
  js/site.js         menu, animações, simulador, formulários
  js/admin.js        painel
  img/               logo e elementos oficiais da marca em WebP
migrations/          evolução versionada do schema PostgreSQL
scripts/             migração do schema e importação do JSON legado
render.yaml          Blueprint do Web Service gratuito
```

O passo a passo de produção, as variáveis e os limites dos planos gratuitos estão em
[`docs/DEPLOY-GRATUITO.md`](docs/DEPLOY-GRATUITO.md).
