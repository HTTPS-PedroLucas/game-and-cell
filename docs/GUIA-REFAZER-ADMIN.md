# Guia: reconstruir o painel administrativo da Game & Cell

> **Documento histórico.** Este guia descreve o contrato anterior baseado em `data/db.json`
> no commit `fe6ea39`. A versão atual usa PostgreSQL e Cloudinary. Para manutenção e deploy,
> consulte [`DEPLOY-GRATUITO.md`](DEPLOY-GRATUITO.md), `migrations/001_initial.sql` e
> `src/lib/store.js`. As regras de interface e validação abaixo continuam úteis; as instruções
> de persistência local não devem ser reaplicadas.

Especificação para reescrever a área `/admin` do zero sem quebrar o site público.
Extraído do código em execução (commit `fe6ea39`), não de memória.

---

## 0. Leia antes de apagar

**O painel atual não tem bug conhecido.** O sintoma que motivou esta reescrita — "entro e
volto para o login" — foi diagnosticado com registro de servidor e teve duas causas, ambas
fora do código:

1. tentativa de login com `ceogamescell@gmail.com`, e-mail nunca cadastrado;
2. página aberta com JavaScript antigo em memória (resolvido com `Ctrl+Shift+R`).

Depois disso o navegador do dono registrou `GET /me → 200` e `GET /dados → 200`, e as sete
abas renderizaram. Uma reescrita não elimina nenhuma dessas causas.

Ponto de retorno: tags `v1.0-base` e `v1.1-sessao` no GitHub; dados em `game-and-cell-backup/`.

---

## 1. O que apagar e o que não tocar

### Pode reescrever por completo

| Arquivo | Linhas | Papel |
|---|---|---|
| `src/routes/admin.js` | 408 | API do painel |
| `src/views/admin.js` | 121 | HTML da página `/admin` |
| `public/js/admin.js` | 1124 | Comportamento no navegador |
| `public/css/admin.css` | 344 | Estilos do painel |

### Não pode quebrar

| Arquivo | Por quê |
|---|---|
| `src/lib/auth.js` | Usado também por `src/lib/seed.js`. Mudar assinaturas quebra o seed. |
| `src/lib/store.js` | Leitura/escrita do `db.json`. Todas as páginas dependem. |
| `src/lib/helpers.js` | O painel usa `slugify`; as views usam o resto. |
| `src/server.js` | Monta rotas e serve `/admin`. |
| `src/views/*.js` (públicas) | Leem o `db.json` direto. Formato diferente = site quebrado. |
| `public/css/site.css` | `admin.css` herda os tokens daqui. |

**Regra que resume tudo:** o painel *escreve* no `db.json`, as páginas públicas *leem*.
Se o formato gravado mudar, o site sai do ar mesmo com o painel funcionando.

---

## 2. Modelo de dados

Arquivo único `data/db.json`, objeto raiz com 15 chaves.

| Chave | Tipo | Campos | Lida por |
|---|---|---|---|
| `config` | objeto | nome, assinatura, propostaValor, subtitulo, whatsapp, whatsappExibicao, instagram, endereco, bairro, cidade, estado, cep, mapsQuery, horarios[], pendencias[] | todas |
| `pagamento` | objeto | resumo, formas[], maxParcelas, parcelasSemJuros, jurosMes, carne{}, aceitaUsado{}, documentos[] | home, vitrine, pagamento |
| `garantia` | objeto | resumo, itens[], comoAcionar[], politicaTroca | garantia, assistência |
| `entrega` | objeto | resumo, local{prazo,taxa,bairros[]}, cidades[], cidadesTexto, retirada | entrega |
| `categorias` | lista | slug, nome, descricao, destaque | home, vitrine |
| `marcas` | lista | strings | vitrine |
| `produtos` | lista | id, nome, slug, categoria, marca, preco, precoAntigo, parcelas, disponibilidade, destaque, imagem, descricao, ficha[] | home, vitrine, pagamento |
| `servicos` | lista | id, nome, descricao, prazo, garantia, faixa | assistência |
| `assistenciaInfo` | objeto | chamada, texto, diferenciais[] | assistência |
| `torneios` | lista | id, nome, jogo, data, hora, local, inscricao, premiacao, vagas, status, campeao, imagem, regulamento[] | home, torneios |
| `equipe` | lista | id, nome, funcao, foto, bio | a-loja |
| `sobreLoja` | objeto | titulo, texto, fotos[] | home, assistência, a-loja |
| `depoimentos` | lista | id, nome, cidade, foto, aprovado, texto | home, a-loja |
| `leads` | lista | id, tipo, status, criadoEm + campos do formulário | escrita pelo site, lida pelo painel |
| `usuarios` | lista | id, email, nome, senhaHash, criadoEm | **nunca sai pela API** |

### Detalhes que o formato exige

- `id` é inteiro, sempre `maior id + 1`. Nunca reaproveitar id de item apagado.
- `categoria` de produto tem que ser um `slug` existente em `categorias`.
- `marca` tem que estar em `marcas`; qualquer outro valor vira `"Outras"`.
- `disponibilidade`: só `"estoque"` ou `"encomenda"`.
- `status` de torneio: só `"aberto"`, `"encerrado"` ou `"rascunho"`.
- `data` de torneio: sempre `AAAA-MM-DD`.
- `precoAntigo` é `null` quando não há promoção — não zero, não string vazia.
- Imagens guardam caminho relativo (`/uploads/arquivo.webp`), nunca base64.

### Como gravar

Use o `store.js` existente. Ele resolve três coisas:

- **escrita atômica** (arquivo temporário + rename), para não corromper o `db.json`;
- **cache com recarga** quando o arquivo muda fora do processo (é o que faz `npm run seed`
  funcionar com o servidor no ar);
- **criação inicial** a partir de `src/lib/defaults.js`.

---

## 3. Sessão e autenticação

| Item | Valor obrigatório |
|---|---|
| Hash | `bcryptjs`, 12 rounds |
| Token | JWT com `process.env.JWT_SECRET`, validade 12h |
| Conteúdo | `{ sub, email, nome }` |
| Cookie | `gc_sessao` |
| Atributos | `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` 12h |
| `secure` | derivado do protocolo real da requisição, **nunca** de `NODE_ENV` |

**Por que `secure` não pode vir do `NODE_ENV`:** com `NODE_ENV=production` num host sem
HTTPS, o navegador descarta o cookie sem avisar — o login responde 200 e a requisição
seguinte chega sem sessão. Derive de `req.secure` (`trust proxy` já está ligado).

### Proteções que precisam continuar

- **Comparação em tempo constante**: comparar contra hash falso quando o e-mail não existe,
  para o tempo de resposta não revelar quais e-mails estão cadastrados.
- **Mensagem genérica**: sempre "E-mail ou senha incorretos".
- **Limite**: 8 falhas por IP em 15 minutos → `429`.
- **`clearCookie` com as mesmas opções do `cookie`**, senão o logout não apaga nada.
- **Registro de autenticação**: logar login aceito, negado e sessão bloqueada. Foi esse
  registro que permitiu diagnosticar o problema real.

---

## 4. Contrato da API

Prefixo `/api/admin`. Respostas em JSON. Erros sempre `{ "erro": "mensagem" }`.

### Sessão (sem exigir login)

| Método | Rota | Contrato |
|---|---|---|
| POST | `/login` | `{email, senha}` → `200 {ok, usuario}` + cookie. Erros: `400` campo faltando, `401` credencial, `429` excesso |
| POST | `/logout` | limpa o cookie, sempre `200 {ok:true}` |
| GET | `/me` | exige sessão → `{usuario:{nome,email}}` ou `401` |

### Conteúdo (exigem sessão)

| Método | Rota | Contrato |
|---|---|---|
| GET | `/dados` | `db.json` inteiro **menos** `usuarios`. Única leitura do painel |
| GET | `/:colecao` | lista |
| POST | `/:colecao` | `201` item criado, ou `400 {erro}` |
| PUT | `/:colecao/:id` | `200` item, `400` validação, `404` id inexistente |
| DELETE | `/:colecao/:id` | `200 {ok, removido}` ou `404` |
| PUT | `/bloco/:nome` | substitui um objeto de configuração inteiro |
| GET | `/lista/leads?tipo=&status=` | filtra pedidos |
| PATCH | `/lista/leads/:id` | só troca status: `novo`, `atendido`, `perdido` |
| DELETE | `/lista/leads/:id` | remove |
| POST | `/upload` | `multipart/form-data`, campo `imagem` → `201 {url, tamanho}` |

`:colecao` aceita exatamente: `produtos`, `servicos`, `torneios`, `equipe`, `depoimentos`.

`:nome` de bloco aceita: `config`, `pagamento`, `garantia`, `entrega`, `assistenciaInfo`,
`sobreLoja`.

---

## 5. Regras de negócio que não podem sumir

Vieram do briefing de marca, não de preferência técnica.

| Coleção | Recusa salvar quando | Mensagem |
|---|---|---|
| produtos | nome < 2 caracteres | O produto precisa de um nome. |
| produtos | **preço ≤ 0** | Informe o preço. "Consulte valores" é o maior ponto de abandono do site. |
| servicos | sem faixa de preço | Informe a faixa de preço, mesmo que seja "a partir de". |
| servicos | sem prazo | Informe o prazo médio do reparo. |
| servicos | sem garantia | Informe a garantia do serviço, em dias. |
| torneios | sem data válida | Informe a data no formato dia/mês/ano. |
| torneios | `aberto` sem inscrição | Torneio com inscrição aberta precisa do valor da inscrição. |
| depoimentos | texto < 10 caracteres | O depoimento está curto demais. |

**Validação no servidor, não só no formulário.** Validar no navegador não protege nada:
requisição direta à API passa por cima.

### Saneamento obrigatório

- Texto: `trim` e corte no limite de cada campo.
- Números: converter e travar em faixa (parcelas 1–24, preço nunca negativo).
- Listas: quebrar por linha, remover vazios, limitar quantidade.
- Campos de escolha: só valores da lista permitida, com padrão seguro.
- Campo de imagem vazio numa edição **mantém** a imagem atual, não apaga.

---

## 6. Envio de imagens

Compressão acontece **no navegador**, antes do envio:

1. lê o arquivo e desenha num `canvas`;
2. redimensiona para no máximo 1200px no maior lado;
3. converte para WebP com qualidade 0,82;
4. envia como `multipart/form-data` no campo `imagem`;
5. o servidor grava em `public/uploads/` e devolve a URL relativa.

**Não trocar por processamento no servidor.** `sharp` não instala nesta máquina — o Controlo
de Aplicações do Windows bloqueia o binário nativo (`ERR_DLOPEN_FAILED`). Foi testado.

Limites do servidor: só `image/jpeg`, `image/png`, `image/webp`, `image/avif`; máximo 3 MB e
um arquivo; nome gerado pelo servidor (slug + carimbo de tempo), nunca o nome do cliente;
endpoint exige sessão.

---

## 7. Requisitos da interface

Sete abas: **Painel** (métricas + pendências do briefing), **Produtos**, **Assistência**,
**Torneios**, **Equipe e prova**, **Pedidos**, **Textos e ajustes**.

### Não negociável

- Alvos de toque de no mínimo 44 × 44 px.
- Contraste mínimo 4,5:1 — o verde escuro da marca sobre preto mede 3,67:1 e reprova.
- Erro de formulário **ao lado do campo**, com `aria-invalid` e foco no primeiro problema.
- Estado vazio explícito em toda lista.
- Confirmação antes de apagar, dizendo o nome do item.
- Retorno visível ao salvar.
- `/admin` responde com `X-Robots-Tag: noindex` e traz a meta correspondente.
- Quando a sessão cai, **dizer isso** — nunca voltar ao login em silêncio.

---

## 8. Armadilhas que já custaram tempo

**Ordem das rotas no Express.** `/dados` tem que vir *antes* de `/:colecao`, senão a rota
genérica captura "dados" como se fosse coleção. Mesmo motivo do prefixo `/lista/leads`.

**Onde entra a exigência de sessão.** `login`, `logout` e `me` vêm antes do middleware. Tudo
declarado depois fica protegido. Inverter deixa a API aberta sem erro visível.

**Cache do navegador.** Editar `admin.js` e recarregar normal pode manter a versão antiga.
Use `Ctrl+Shift+R`.

**O seed roda em outro processo.** Grava no mesmo `db.json` que o servidor tem em memória. Se
a recarga por mtime do `store.js` for removida, criar administrador com o servidor no ar não
tem efeito até reiniciar — e o login falha sem explicação.

**Formulário sem `preventDefault` recarrega a página** e manda a senha para a barra de
endereços como parâmetro de URL.

---

## 9. Testes de aceite

### Sessão
- [ ] Login correto → `200` + cookie `gc_sessao`.
- [ ] Senha errada → `401` com mensagem genérica.
- [ ] Nove tentativas erradas → `429` na nona.
- [ ] `GET /api/admin/dados` sem cookie → `401`.
- [ ] Logout devolve `Set-Cookie` que expira o cookie.
- [ ] HTTP: cookie sem `Secure`. Com `X-Forwarded-Proto: https`: com `Secure`.

### Conteúdo
- [ ] `GET /api/admin/dados` não traz a chave `usuarios`.
- [ ] Produto com preço zero → `400` com a mensagem sobre "consulte valores".
- [ ] Torneio aberto sem inscrição → `400`.
- [ ] Editar produto reflete no site público na requisição seguinte, sem reiniciar.
- [ ] Apagar item inexistente → `404`.
- [ ] Editar sem mandar imagem preserva a imagem anterior.

### Imagens
- [ ] Upload de PNG válido → `201` com URL.
- [ ] Upload de não-imagem → `400`.
- [ ] Upload sem sessão → `401`.

### Site público íntegro
- [ ] Nove páginas respondem `200`.
- [ ] Rota inexistente → `404` com página de erro.
- [ ] `POST /api/orcamento` e `POST /api/inscricao` gravam pedidos que o painel enxerga.
- [ ] `/sitemap.xml` e `/robots.txt` → `200`.
- [ ] `npm run seed -- --listar` continua funcionando.

### Comandos

```bash
npm start

for r in / /vitrine /assistencia-tecnica /pagamento /garantia \
         /entrega /a-loja /torneios /admin /robots.txt /sitemap.xml; do
  echo "$r $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$r)"
done

curl -s -c ck.txt -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"SEU_EMAIL","senha":"SUA_SENHA"}'

for e in /me /dados /produtos /servicos /torneios /equipe /depoimentos /lista/leads; do
  echo "$e $(curl -s -o /dev/null -b ck.txt -w '%{http_code}' http://localhost:3000/api/admin$e)"
done

curl -s -b ck.txt -X POST http://localhost:3000/api/admin/produtos \
     -H "Content-Type: application/json" -d '{"nome":"Teste","preco":0}'
```

---

## 10. O que só o dono pode fazer

| Item | Por quê | Quando |
|---|---|---|
| Decidir se a reescrita acontece | Não há bug conhecido; descarta código testado | Antes de tudo |
| Confirmar o e-mail de acesso | `ceogamescell@gmail.com` não está cadastrado | Antes de tudo |
| Definir a senha | Digitada no terminal (`npm run seed`), nunca no chat | Antes de testar |
| Apagar a conta de demonstração | `admin@gamecell.com.br` é de desenvolvimento | Antes de publicar |
| Conferir preços, prazos e taxas | Conteúdo atual veio do briefing como exemplo | Antes de publicar |
| Enviar fotos reais | Fachada, bancada, equipe, produtos. Briefing proíbe banco de imagens | Antes de publicar |
| Responder as 8 pendências do briefing | Listadas na aba Painel | Antes de publicar |
| Testar no navegador | Nenhum assistente enxerga a tela renderizada | Ao final |

---

**Antes de reescrever, um teste de dois minutos:** abra `localhost:3000/admin`, pressione
`Ctrl+Shift+R` e entre com `admin@gamecell.com.br`. Se o painel abrir, não há o que
reescrever — e o tempo vai melhor investido nas fotos reais e nas 8 pendências, que são o que
ainda impede o site de ir ao ar.
