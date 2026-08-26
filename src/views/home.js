const { e, money, whatsapp } = require('../lib/helpers');
const { icon } = require('./icons');
const { layout } = require('./layout');
const {
  cabecaSecao,
  cardProduto,
  imagemOu,
  faixaContato,
  estadoVazio
} = require('./components');

const ICONE_FRENTE = {
  'consoles-e-jogos': 'controle',
  celulares: 'celular',
  acessorios: 'caixa',
  audio: 'fone',
  colecionaveis: 'trofeu'
};

function home(db) {
  const { config, pagamento, categorias, produtos, sobreLoja, depoimentos, torneios } = db;

  const destaques = produtos.filter((p) => p.destaque).slice(0, 4);
  const proximoTorneio = torneios.find((t) => t.status === 'aberto');
  const aprovados = depoimentos.filter((d) => d.aprovado).slice(0, 3);

  // As quatro frentes do briefing: games, celulares, acessórios, assistência.
  const frentes = [
    ...categorias.filter((c) => c.destaque).map((c) => ({
      href: `/vitrine?categoria=${c.slug}`,
      nome: c.nome,
      desc: c.descricao,
      icone: ICONE_FRENTE[c.slug] || 'caixa'
    })),
    {
      href: '/assistencia-tecnica',
      nome: 'Assistência técnica',
      desc: 'Tela, bateria, conector, câmera e console. Orçamento sem compromisso.',
      icone: 'chave'
    }
  ];

  const conteudo = `
<section class="hero hero--marca">
  <!-- Elementos do logo soltos no fundo, com paralaxe. Decorativos: aria-hidden. -->
  <div class="enfeite enfeite--controle flutua" data-parallax="0.10" aria-hidden="true">
    <img src="/img/controle.webp" width="560" height="455" alt="" loading="lazy" decoding="async">
  </div>
  <div class="enfeite enfeite--celular flutua flutua--lento" data-parallax="-0.16" aria-hidden="true">
    <img src="/img/celular.webp" width="460" height="660" alt="" loading="lazy" decoding="async">
  </div>

  <div class="container hero__grade hero__grade--marca">
    <div class="hero__conteudo">
      <img class="hero__logo" src="/img/logo.webp" width="1000" height="461"
           srcset="/img/logo-pequeno.webp 360w, /img/logo.webp 1000w"
           sizes="(min-width: 1024px) 34rem, (min-width: 768px) 30rem, 22rem"
           alt="${e(config.nome)} — ${e(config.assinatura)}" fetchpriority="high" data-entrada="zoom">

      <p class="rotulo" data-entrada style="--atraso:120ms">
        ${e(config.cidade)} — ${e(config.estado)} &middot; ${e(config.assinatura)}
      </p>

      <h1 data-entrada style="--atraso:200ms">${e(config.propostaValor)}</h1>

      <p class="lead" data-entrada style="--atraso:280ms">${e(config.subtitulo)}</p>

      <ul class="hero__provas" data-entrada style="--atraso:360ms">
        <li>${icon('escudo')} Original e lacrado</li>
        <li>${icon('selo')} Nota fiscal e garantia</li>
        <li>${icon('pin')} Loja física no centro</li>
      </ul>

      <div class="hero__acoes" data-entrada style="--atraso:440ms">
        <a class="btn btn--primario" href="/vitrine">${icon('busca', 'btn__icone')} Ver produtos e preços</a>
        <a class="btn btn--wa" href="${whatsapp(
          config.whatsapp,
          `Olá, ${config.nome}! Vim pelo site e queria tirar uma dúvida.`
        )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Chamar no WhatsApp</a>
      </div>
    </div>

    <div class="hero__foto" data-entrada="direita" style="--atraso:300ms">
      ${imagemOu(
        sobreLoja.fotos && sobreLoja.fotos[0],
        `Fachada da ${config.nome} no centro de ${config.cidade}`,
        'Suba a foto da fachada verde em /admin — nunca banco de imagens',
        ' width="800" height="600"'
      )}
    </div>
  </div>
</section>

<section class="secao" aria-labelledby="frentes">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'O que a gente resolve',
      titulo: 'Quatro frentes, um balcão só',
      texto: 'Escolha por onde começar. Tudo termina numa conversa no WhatsApp ou numa visita à loja.',
      id: 'frentes'
    })}

    <div class="frentes" data-revelar-grupo>
      ${frentes
        .map(
          (f) => `<a class="frente" href="${f.href}">
        <span style="color:var(--verde-limao);width:28px;height:28px;display:block">${icon(f.icone)}</span>
        <span class="frente__nome">${e(f.nome)}</span>
        <span class="frente__desc">${e(f.desc)}</span>
        <span class="frente__seta">Ver mais &rarr;</span>
      </a>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao--escura" aria-labelledby="destaques">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Destaques da semana',
      titulo: 'Com preço na tela',
      texto: 'Sem "consulte valores". O que está aqui é o que está no balcão.',
      id: 'destaques'
    })}

    ${
      destaques.length
        ? `<div class="produtos produtos--4" data-revelar-grupo>
      ${destaques.map((p) => cardProduto(p, config, pagamento)).join('\n      ')}
    </div>
    <p style="margin-top:var(--s-8)">
      <a class="btn btn--contorno" href="/vitrine">Ver a vitrine completa ${icon('seta', 'btn__icone')}</a>
    </p>`
        : estadoVazio(
            'Nenhum destaque marcado',
            'Marque produtos como destaque no painel para eles aparecerem aqui.'
          )
    }
  </div>
</section>

${
  proximoTorneio
    ? `<section class="secao" aria-labelledby="torneio-home">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'O que ninguém copia',
      titulo: 'Torneio na loja',
      texto: 'Campeonato presencial com premiação. Ponto de venda que virou ponto de encontro.',
      id: 'torneio-home'
    })}
    <div class="cartao" style="border-color:var(--verde-limao)" data-revelar="zoom">
      <h3 class="cartao__titulo">${e(proximoTorneio.nome)} — ${e(proximoTorneio.jogo)}</h3>
      <p class="lead">${e(proximoTorneio.premiacao)}</p>
      <a class="btn btn--primario btn--sm" href="/torneios">${icon('trofeu', 'btn__icone')} Ver regulamento e se inscrever</a>
    </div>
  </div>
</section>`
    : ''
}

${
  aprovados.length
    ? `<section class="secao secao--escura" aria-labelledby="prova">
  <div class="container">
    ${cabecaSecao({ rotulo: 'Quem já comprou', titulo: 'O que dizem na cidade', id: 'prova' })}
    <div class="grid grid--3" data-revelar-grupo>
      ${aprovados
        .map(
          (d) => `<figure class="depoimento">
        <blockquote class="depoimento__texto">&ldquo;${e(d.texto)}&rdquo;</blockquote>
        <figcaption class="depoimento__autor">
          ${
            d.foto
              ? `<img class="avatar" src="${e(d.foto)}" alt="" loading="lazy" width="44" height="44">`
              : `<span class="avatar avatar--vazio" aria-hidden="true">${e(d.nome.charAt(0))}</span>`
          }
          <span><strong>${e(d.nome)}</strong><br><span class="small muted">${e(d.cidade)}</span></span>
        </figcaption>
      </figure>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`
    : ''
}

${faixaContato(config, config.horarios)}
`;

  return layout({
    titulo: `${config.nome} — Games, celulares e assistência técnica em ${config.cidade}/${config.estado}`,
    descricao: `${config.propostaValor} Loja física na ${config.endereco}, centro de ${config.cidade} — ${config.estado}. Produto original, lacrado e com garantia.`,
    conteudo,
    ativo: '/',
    config,
    horarios: config.horarios,
    canonical: '/'
  });
}

module.exports = { home };
