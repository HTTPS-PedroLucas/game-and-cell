const { e, join, whatsapp } = require('../lib/helpers');
const { icon } = require('./icons');

const MENU = [
  { href: '/', rotulo: 'Início' },
  { href: '/vitrine', rotulo: 'Vitrine' },
  { href: '/assistencia-tecnica', rotulo: 'Assistência' },
  { href: '/pagamento', rotulo: 'Pagamento' },
  { href: '/garantia', rotulo: 'Garantia' },
  { href: '/entrega', rotulo: 'Entrega' },
  { href: '/torneios', rotulo: 'Torneios' },
  { href: '/a-loja', rotulo: 'A loja' }
];

/** Dados estruturados de negócio local — requisito de SEO ALTO do briefing. */
function jsonLdNegocio(config, horarios) {
  const dias = { 'Segunda a sexta': 'Mo,Tu,We,Th,Fr', 'Sábado': 'Sa', 'Domingo': 'Su' };
  const abertura = horarios
    .filter((h) => !/fechado/i.test(h.hora) && dias[h.dia])
    .map((h) => {
      const [ini, fim] = h.hora.replace(/h/g, ':').split(/\s*às\s*/);
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dias[h.dia].split(','),
        opens: (ini || '').trim(),
        closes: (fim || '').trim()
      };
    });

  return {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: config.nome,
    description: config.propostaValor,
    telephone: `+${config.whatsapp}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.endereco,
      addressLocality: config.cidade,
      addressRegion: config.estado,
      postalCode: config.cep,
      addressCountry: 'BR'
    },
    areaServed: config.cidade,
    sameAs: [`https://instagram.com/${config.instagram}`],
    openingHoursSpecification: abertura,
    priceRange: '$$'
  };
}

/**
 * Casca do site. Todo conteúdo chega renderizado do servidor para que
 * o Google leia produto, preço e endereço sem executar JavaScript.
 */
function layout({ titulo, descricao, conteudo, ativo = '', config, horarios = [], jsonLd = [], canonical = '/' }) {
  const waHome = whatsapp(
    config.whatsapp,
    `Olá, ${config.nome}! Vim pelo site e queria falar com vocês.`
  );

  const estruturados = [jsonLdNegocio(config, horarios), ...jsonLd]
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titulo)}</title>
<meta name="description" content="${e(descricao)}">
<link rel="canonical" href="${e(canonical)}">
<meta name="theme-color" content="#0b100c">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${e(config.nome)}">
<meta property="og:title" content="${e(titulo)}">
<meta property="og:description" content="${e(descricao)}">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="/img/logo.webp">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="/img/logo-pequeno.webp" fetchpriority="high">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">
<link rel="stylesheet" href="/css/site.css">
<script>
  /* Marca que o JS está vivo antes da primeira pintura. Só com esta classe o CSS
     esconde os elementos para animá-los — sem JS, o conteúdo aparece direto. */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('anim');
  }
</script>
${estruturados}
</head>
<body class="site-publico">
<a class="pular-para-conteudo" href="#conteudo">Pular para o conteúdo</a>
<div class="progresso-scroll" aria-hidden="true"><span></span></div>
<div class="transicao-pagina" aria-hidden="true"><span>Game &amp; Cell</span></div>

<header class="cabecalho">
  <div class="container cabecalho__barra">
    <a class="logo" href="/" aria-label="${e(config.nome)} — página inicial">
      <img class="logo__img" src="/img/logo-pequeno.webp" width="360" height="166"
           alt="${e(config.nome)} — ${e(config.assinatura)}" fetchpriority="high">
      <span class="logo__contexto">Iguatu <i></i> CE</span>
    </a>

    <button class="nav-toggle" type="button" id="navToggle" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menu">
      ${icon('menu', 'btn__icone')}
    </button>

    <nav class="nav" id="navPrincipal" aria-label="Navegação principal">
      <ul class="nav__lista">
        ${MENU.map(
          (item) =>
            `<li><a class="nav__link" href="${item.href}"${
              ativo === item.href ? ' aria-current="page"' : ''
            }>${e(item.rotulo)}</a></li>`
        ).join('\n        ')}
      </ul>
    </nav>
  </div>
</header>

<main id="conteudo">
${conteudo}
</main>

<footer class="rodape">
  <img class="rodape__elemento rodape__elemento--controle" src="/img/controle.webp" width="560" height="455" alt="" aria-hidden="true" loading="lazy">
  <img class="rodape__elemento rodape__elemento--celular" src="/img/celular.webp" width="460" height="660" alt="" aria-hidden="true" loading="lazy">
  <div class="container">
    <div class="rodape__grade">
      <div data-revelar>
        <img class="logo__img" src="/img/logo-pequeno.webp" width="360" height="166"
             alt="${e(config.nome)}" loading="lazy" style="height:48px">
        <p class="muted" style="margin-top:var(--s-4);max-width:38ch">${e(config.propostaValor)}</p>
        <p class="small muted" style="margin-top:var(--s-3)">
          ${e(config.endereco)} — ${e(config.bairro)}<br>
          ${e(config.cidade)} — ${e(config.estado)}
        </p>
      </div>

      <div>
        <h3>Páginas</h3>
        <ul>
          ${MENU.map((item) => `<li><a href="${item.href}">${e(item.rotulo)}</a></li>`).join('\n          ')}
        </ul>
      </div>

      <div>
        <h3>Fale com a gente</h3>
        <ul>
          <li><a href="${waHome}" rel="noopener">WhatsApp ${e(config.whatsappExibicao)}</a></li>
          <li><a href="https://instagram.com/${e(config.instagram)}" rel="noopener">Instagram @${e(config.instagram)}</a></li>
        </ul>
        <h3 style="margin-top:var(--s-6)">Horário</h3>
        <ul>
          ${horarios
            .map((h) => `<li><span class="small muted">${e(h.dia)}: ${e(h.hora)}</span></li>`)
            .join('\n          ')}
        </ul>
      </div>
    </div>

    <div class="rodape__base">
      <span>&copy; ${new Date().getFullYear()} ${e(config.nome)} — ${e(config.cidade)}/${e(config.estado)}</span>
      <a href="/admin" class="small">Área do administrador</a>
    </div>
  </div>
</footer>

<a class="wa-flutuante" href="${waHome}" rel="noopener" aria-label="Falar com a Game &amp; Cell no WhatsApp">
  ${icon('whatsapp')}<span>WhatsApp</span>
</a>

<script src="/js/site.js" defer></script>
</body>
</html>`;
}

module.exports = { layout, MENU, jsonLdNegocio };
