const { e } = require('../lib/helpers');
const { icon } = require('./icons');

const ABAS = [
  { id: 'painel', rotulo: 'Painel', icone: 'loja' },
  { id: 'produtos', rotulo: 'Produtos', icone: 'caixa' },
  { id: 'servicos', rotulo: 'Assistência', icone: 'chave' },
  { id: 'torneios', rotulo: 'Torneios', icone: 'trofeu' },
  { id: 'equipe', rotulo: 'Equipe e prova', icone: 'usuarios' },
  { id: 'leads', rotulo: 'Pedidos', icone: 'whatsapp' },
  { id: 'ajustes', rotulo: 'Textos e ajustes', icone: 'cartao' }
];

/**
 * Painel do administrador. Página única, sem indexação.
 * O conteúdo é montado no navegador porque aqui SEO não vale nada
 * e o que importa é editar rápido, do celular, atrás do balcão.
 */
function paginaAdmin(config) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Painel do administrador | ${e(config.nome)}</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin">

<!-- ---------------- Painel ---------------- -->
<div class="admin-app" id="app">
  <aside class="admin-sidebar">
    <div class="admin-sidebar__marca">
      <img src="/img/logo-pequeno.webp" width="360" height="166" alt="${e(config.nome)}">
      <div>
        <span>Administração</span>
        <small>Universo da tecnologia</small>
      </div>
    </div>

    <nav class="admin-abas" aria-label="Seções do painel">
      ${ABAS.map(
        (a, i) =>
          `<button class="admin-aba" type="button" role="tab" data-aba="${a.id}"
                   id="aba-${a.id}" aria-controls="painel-${a.id}" aria-selected="${i === 0}">
            <span class="admin-aba__icone">${icon(a.icone)}</span><span>${e(a.rotulo)}</span>
          </button>`
      ).join('\n      ')}
    </nav>

    <div class="admin-sidebar__rodape">
      <span class="admin-sidebar__status" aria-hidden="true"></span>
      <div><strong>Painel online</strong><small>Alterações publicadas na hora</small></div>
    </div>
  </aside>

  <section class="admin-workspace">
    <header class="admin-topo">
      <div class="admin-topo__titulo">
        <span>Game &amp; Cell</span>
        <strong>Painel de controle</strong>
      </div>
      <div class="admin-topo__acoes">
        <a class="btn btn--contorno btn--sm" href="/" target="_blank" rel="noopener">Ver o site</a>
      </div>
    </header>

    <main class="admin-corpo">
      ${ABAS.map(
        (a, i) =>
          `<section class="admin-painel" id="painel-${a.id}" role="tabpanel" aria-labelledby="aba-${a.id}"${
            i === 0 ? '' : ' hidden'
          }></section>`
      ).join('\n      ')}
    </main>
  </section>
</div>

<!-- Diálogo de edição, reaproveitado por todas as listas -->
<dialog class="modal" id="modal">
  <form method="dialog" class="modal__caixa" id="modalForm">
    <header class="modal__topo">
      <h2 id="modalTitulo">Editar</h2>
      <button class="modal__fechar" type="button" id="modalFechar" aria-label="Fechar">${icon('fechar')}</button>
    </header>
    <div class="modal__corpo" id="modalCorpo"></div>
    <footer class="modal__base">
      <div id="modalAviso" role="alert" aria-live="assertive"></div>
      <div class="modal__botoes">
        <button class="btn btn--contorno btn--sm" type="button" id="modalCancelar">Cancelar</button>
        <button class="btn btn--primario btn--sm" type="submit" id="modalSalvar">Salvar</button>
      </div>
    </footer>
  </form>
</dialog>

<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>

<script src="/js/admin.js" defer></script>
</body>
</html>`;
}

module.exports = { paginaAdmin, ABAS };
