const { e, whatsapp, dataBR, dataExtenso } = require('../lib/helpers');
const { icon } = require('./icons');
const { layout } = require('./layout');
const { cabecaSecao, imagemOu, estadoVazio } = require('./components');

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function blocoData(iso) {
  const [, mes, dia] = String(iso).split('-');
  if (!mes || !dia) return '';
  return `<span class="torneio__data" aria-hidden="true">
    <span class="dia">${dia}</span>
    <span class="mes">${MES_CURTO[Number(mes) - 1] || ''}</span>
  </span>`;
}

function torneiosPagina(db) {
  const { config, torneios } = db;

  const abertos = torneios.filter((t) => t.status === 'aberto');
  const encerrados = torneios.filter((t) => t.status !== 'aberto');
  const principal = abertos[0];

  const jsonLd = abertos.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: t.nome,
    startDate: t.data,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: config.nome,
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.endereco,
        addressLocality: config.cidade,
        addressRegion: config.estado,
        addressCountry: 'BR'
      }
    },
    organizer: { '@type': 'Organization', name: config.nome },
    description: `${t.jogo} — ${t.premiacao}`
  }));

  const conteudo = `
<section class="secao">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Torneios e comunidade',
      titulo: 'Campeonato na loja',
      texto: 'O que antes vivia só nos stories e sumia em 24h agora tem agenda, regulamento e inscrição em lugar fixo.'
    })}

    ${
      principal
        ? `<article class="torneio torneio--destaque" data-revelar="zoom">
      <div class="torneio__info">
        <div style="display:flex;gap:var(--s-4);align-items:center;flex-wrap:wrap">
          ${blocoData(principal.data)}
          <div>
            <p class="rotulo">Próxima edição &middot; inscrições abertas</p>
            <h3 style="font-size:clamp(1.5rem,4vw,2.25rem)">${e(principal.nome)}</h3>
            <p class="lead" style="margin-top:var(--s-1)">${e(principal.jogo)}</p>
          </div>
        </div>

        <dl class="servico__meta" style="margin-top:var(--s-4)">
          <div><dt>Data</dt><dd>${e(dataExtenso(principal.data))}, ${e(principal.hora)}</dd></div>
          <div><dt>Local</dt><dd>${e(principal.local)}</dd></div>
          <div><dt>Inscrição</dt><dd>${e(principal.inscricao)}</dd></div>
          <div><dt>Vagas</dt><dd>${e(principal.vagas)} jogadores</dd></div>
        </dl>

        <div class="cartao" style="margin-top:var(--s-6);background:var(--surface-2)">
          <h4>Premiação</h4>
          <p class="destaque-neon" style="font-family:var(--font-display);font-size:1.25rem">${e(principal.premiacao)}</p>
        </div>

        ${
          principal.regulamento && principal.regulamento.length
            ? `<div style="margin-top:var(--s-6)">
          <h4>Regulamento</h4>
          <ul class="lista-check" style="margin-top:var(--s-3)">
            ${principal.regulamento.map((r) => `<li>${icon('check')}<span>${e(r)}</span></li>`).join('')}
          </ul>
        </div>`
            : ''
        }
      </div>

      <div class="pilha">
        <form class="form cartao" id="formInscricao" data-torneio="${principal.id}">
          <h3 class="cartao__titulo">Garantir minha vaga</h3>
          <div class="campo">
            <label for="insNome">Seu nome</label>
            <input type="text" id="insNome" name="nome" required autocomplete="name">
            <p class="campo__erro" id="erro-insNome" role="alert"></p>
          </div>
          <div class="campo">
            <label for="insTelefone">WhatsApp</label>
            <input type="tel" id="insTelefone" name="telefone" required autocomplete="tel"
                   inputmode="numeric" placeholder="(88) 9 9999-9999">
            <p class="campo__erro" id="erro-insTelefone" role="alert"></p>
          </div>
          <div class="campo">
            <label for="insNick">Seu nick <span class="muted small">(opcional)</span></label>
            <input type="text" id="insNick" name="nick" autocomplete="off">
          </div>
          <button class="btn btn--primario btn--bloco" type="submit">
            ${icon('trofeu', 'btn__icone')} Quero jogar
          </button>
          <div id="respostaInscricao" role="status" aria-live="polite"></div>
        </form>

        <a class="btn btn--wa btn--bloco btn--sm" href="${whatsapp(
          config.whatsapp,
          `Olá! Quero me inscrever no ${principal.nome} de ${principal.jogo}.`
        )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Prefiro pelo WhatsApp</a>
      </div>
    </article>`
        : estadoVazio(
            'Nenhum torneio com inscrição aberta',
            'A próxima edição é anunciada aqui e no Instagram. Chame no WhatsApp para entrar na lista de avisos.',
            `<a class="btn btn--wa btn--sm" href="${whatsapp(
              config.whatsapp,
              'Olá! Quero entrar na lista de avisos dos torneios.'
            )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Entrar na lista de avisos</a>`
          )
    }
  </div>
</section>

${
  encerrados.length
    ? `<section class="secao secao--escura" aria-labelledby="edicoes">
  <div class="container">
    ${cabecaSecao({ rotulo: 'Memória', titulo: 'Edições anteriores', id: 'edicoes' })}
    <div class="grid grid--3" data-revelar-grupo>
      ${encerrados
        .map(
          (t) => `<article class="cartao">
        <p class="rotulo">${e(dataBR(t.data))}</p>
        <h3 class="cartao__titulo">${e(t.nome)}</h3>
        <p class="muted">${e(t.jogo)}</p>
        ${
          t.campeao
            ? `<p style="display:flex;align-items:center;gap:var(--s-2);color:var(--verde-limao);font-weight:700">
          <span style="width:22px;height:22px;display:block">${icon('trofeu')}</span> ${e(t.campeao)}
        </p>`
            : ''
        }
        ${
          t.imagem
            ? `<img src="${e(t.imagem)}" alt="Galeria do ${e(t.nome)}" loading="lazy"
                   style="border-radius:var(--r-md);aspect-ratio:4/3;object-fit:cover;width:100%">`
            : ''
        }
      </article>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`
    : ''
}
`;

  return layout({
    titulo: `Torneios de games em ${config.cidade} — ${config.estado} | ${config.nome}`,
    descricao: `Agenda, regulamento, premiação e inscrição dos torneios presenciais da ${config.nome}, na ${config.endereco}, centro de ${config.cidade} — ${config.estado}.`,
    conteudo,
    ativo: '/torneios',
    config,
    horarios: config.horarios,
    jsonLd,
    canonical: '/torneios'
  });
}

module.exports = { torneiosPagina };
