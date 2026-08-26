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
  <div class="hero__luz hero__luz--um" aria-hidden="true"></div>
  <div class="hero__luz hero__luz--dois" aria-hidden="true"></div>
  <div class="container hero__grade hero__grade--marca">
    <div class="hero__conteudo">
      <p class="hero__chapeu" data-entrada style="--atraso:80ms">
        <span></span> Loja física em ${e(config.cidade)} — ${e(config.estado)}
      </p>

      <h1 data-entrada style="--atraso:160ms">${e(config.propostaValor)}</h1>

      <p class="lead" data-entrada style="--atraso:240ms">${e(config.subtitulo)}</p>

      <div class="hero__acoes" data-entrada style="--atraso:320ms">
        <a class="btn btn--primario" href="/vitrine">${icon('busca', 'btn__icone')} Ver produtos e preços</a>
        <a class="btn btn--wa" href="${whatsapp(
          config.whatsapp,
          `Olá, ${config.nome}! Vim pelo site e queria tirar uma dúvida.`
        )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Chamar no WhatsApp</a>
      </div>

      <ul class="hero__provas" data-entrada style="--atraso:400ms">
        <li>${icon('escudo')} Original e lacrado</li>
        <li>${icon('selo')} Nota fiscal e garantia</li>
        <li>${icon('pin')} Loja física no centro</li>
      </ul>
    </div>

    <div class="hero__palco" data-entrada="direita" style="--atraso:220ms" data-palco>
      <div class="hero__orbita hero__orbita--externa" aria-hidden="true"></div>
      <div class="hero__orbita hero__orbita--interna" aria-hidden="true"></div>
      <div class="hero__marca-visual">
        <img src="/img/logo.webp" width="1000" height="461"
             srcset="/img/logo-pequeno.webp 360w, /img/logo.webp 1000w"
             sizes="(min-width: 1024px) 29rem, 20rem"
             alt="${e(config.nome)} — ${e(config.assinatura)}" fetchpriority="high">
      </div>
      <img class="hero__elemento hero__elemento--controle" src="/img/controle.webp"
           width="560" height="455" alt="" aria-hidden="true" data-parallax="0.07">
      <img class="hero__elemento hero__elemento--celular" src="/img/celular.webp"
           width="460" height="660" alt="" aria-hidden="true" data-parallax="-0.10">
      <div class="hero__selo-visual" aria-hidden="true">
        <strong>4 em 1</strong><span>games · celulares · acessórios · assistência</span>
      </div>
    </div>
  </div>

  <a class="hero__scroll" href="#frentes" aria-label="Rolar para conhecer a loja">
    <span>Explore</span><i aria-hidden="true"></i>
  </a>
</section>

<div class="faixa-movimento" aria-label="Games, celulares, acessórios e assistência técnica">
  <div class="faixa-movimento__trilho" aria-hidden="true">
    ${Array.from({ length: 2 }, () => `
      <span>Games</span><i></i><span>Celulares</span><i></i><span>Acessórios</span><i></i><span>Assistência técnica</span><i></i><span>Torneios</span><i></i>
    `).join('')}
  </div>
</div>

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
          (f, i) => `<a class="frente" href="${f.href}">
        <span class="frente__numero">0${i + 1}</span>
        <span class="frente__icone">${icon(f.icone)}</span>
        <span class="frente__nome">${e(f.nome)}</span>
        <span class="frente__desc">${e(f.desc)}</span>
        <span class="frente__seta">Explorar <b aria-hidden="true">&rarr;</b></span>
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
    <div class="evento-destaque" data-revelar="zoom">
      <div class="evento-destaque__conteudo">
        <span class="evento-destaque__status"><i></i> Inscrições abertas</span>
        <h3>${e(proximoTorneio.nome)} — ${e(proximoTorneio.jogo)}</h3>
        <p>${e(proximoTorneio.premiacao)}</p>
        <a class="btn btn--primario btn--sm" href="/torneios">${icon('trofeu', 'btn__icone')} Ver regulamento e se inscrever</a>
      </div>
      <div class="evento-destaque__visual" aria-hidden="true">
        <span>Game on</span>
        <img src="/img/controle.webp" width="560" height="455" alt="" loading="lazy">
      </div>
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

<section class="secao secao--universo" aria-labelledby="universo-home">
  <div class="container universo">
    <div class="universo__visual" data-revelar="esquerda">
      ${imagemOu(
        sobreLoja.fotos && sobreLoja.fotos[0],
        `Fachada da ${config.nome} no centro de ${config.cidade}`,
        'A fachada verde da Game & Cell entra aqui quando a foto for adicionada no painel',
        ' width="800" height="600" loading="lazy"'
      )}
      <img class="universo__celular" src="/img/celular.webp" width="460" height="660" alt="" aria-hidden="true" loading="lazy">
    </div>
    <div class="universo__conteudo" data-revelar="direita">
      <p class="rotulo">Mais que uma loja</p>
      <h2 id="universo-home">Tecnologia para comprar, cuidar e jogar.</h2>
      <p class="lead">Um só endereço para escolher seu próximo aparelho, equipar seu setup, resolver um conserto e encontrar a comunidade gamer de Iguatu.</p>
      <div class="universo__numeros">
        <div><strong>4</strong><span>frentes no mesmo balcão</span></div>
        <div><strong>1</strong><span>endereço no centro</span></div>
        <div><strong>0</strong><span>enrolação para ver preço</span></div>
      </div>
      <a class="btn btn--contorno" href="/a-loja">Conheça a Game &amp; Cell ${icon('seta', 'btn__icone')}</a>
    </div>
  </div>
</section>

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
