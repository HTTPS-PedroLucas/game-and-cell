/** Páginas de objeção: pagamento, garantia, entrega e a loja/time. */
const { e, money, parcela, whatsapp } = require('../lib/helpers');
const { icon } = require('./icons');
const { layout } = require('./layout');
const { cabecaSecao, imagemOu, faixaContato, chamadaFinal } = require('./components');

/* ------------------------------------------------------------------ */
/* Pagamento e parcelamento                                            */
/* ------------------------------------------------------------------ */
function pagamentoPagina(db) {
  const { config, pagamento, produtos } = db;

  // O simulador abre no carro-chefe mais caro em estoque
  const referencia =
    produtos.filter((p) => p.disponibilidade === 'estoque').sort((a, b) => b.preco - a.preco)[0] || produtos[0];

  const tabela = Array.from({ length: pagamento.maxParcelas }, (_, i) => i + 1).map((n) => ({
    n,
    valor: parcela(referencia.preco, n, pagamento.jurosMes, pagamento.parcelasSemJuros)
  }));

  const conteudo = `
<section class="secao">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Pagamento',
      titulo: 'Como dá pra pagar',
      texto: e(pagamento.resumo)
    })}

    <div class="grid grid--4" data-revelar-grupo>
      ${pagamento.formas
        .map(
          (f) => `<div class="cartao">
        <span style="color:var(--verde-limao);width:26px;height:26px;display:block">${icon('cartao')}</span>
        <h3 class="cartao__titulo">${e(f.nome)}</h3>
        <p class="muted small">${e(f.detalhe)}</p>
      </div>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>

<section class="secao secao--escura" aria-labelledby="simulador">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Simulação',
      titulo: 'Quanto fica por mês',
      texto: `Até ${pagamento.parcelasSemJuros}x sem juros. Acima disso, juros de ${String(
        pagamento.jurosMes
      ).replace('.', ',')}% ao mês da operadora.`,
      id: 'simulador'
    })}

    <div class="simulador cartao"
         data-juros="${pagamento.jurosMes}"
         data-sem-juros="${pagamento.parcelasSemJuros}"
         data-max="${pagamento.maxParcelas}">
      <div class="pilha">
        <div class="campo">
          <label for="simValor">Valor da compra</label>
          <input type="number" id="simValor" min="50" step="10" value="${referencia.preco}"
                 inputmode="numeric" aria-describedby="simValorDica">
          <p class="campo__dica" id="simValorDica">Exemplo carregado: ${e(referencia.nome)}.</p>
        </div>

        <div class="campo">
          <label for="simParcelas">Parcelas: <output id="simParcelasSaida" for="simParcelas">${
            pagamento.maxParcelas
          }</output>x</label>
          <input type="range" id="simParcelas" min="1" max="${pagamento.maxParcelas}" step="1"
                 value="${pagamento.maxParcelas}">
        </div>
      </div>

      <div class="simulador__saida">
        <p class="rotulo">Fica em</p>
        <p class="simulador__valor" id="simSaida" role="status" aria-live="polite">—</p>
        <p class="small muted" id="simTotal"></p>
        <a class="btn btn--wa btn--bloco btn--sm" id="simWhats" style="margin-top:var(--s-4)"
           href="${whatsapp(config.whatsapp, 'Olá! Queria simular um parcelamento.')}" rel="noopener">
          ${icon('whatsapp', 'btn__icone')} Fechar no WhatsApp
        </a>
      </div>
    </div>

    <details style="margin-top:var(--s-8)">
      <summary class="btn btn--contorno btn--sm" style="display:inline-flex">Ver a tabela completa de ${e(
        referencia.nome
      )}</summary>
      <div class="tabela-rolagem" style="margin-top:var(--s-4)">
        <table>
          <caption class="sr-only">Parcelamento de ${e(referencia.nome)}</caption>
          <thead><tr><th scope="col">Parcelas</th><th scope="col">Valor da parcela</th><th scope="col">Total</th></tr></thead>
          <tbody>
            ${tabela
              .map(
                (l) =>
                  `<tr><td>${l.n}x</td><td><strong>${money(l.valor)}</strong></td><td class="muted">${money(
                    l.valor * l.n
                  )}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </details>
  </div>
</section>

<section class="secao">
  <div class="container grid grid--2" data-revelar-grupo>
    <div class="cartao">
      <h3 class="cartao__titulo">Aparelho usado na troca</h3>
      <p>${e(pagamento.aceitaUsado.texto)}</p>
      ${
        pagamento.aceitaUsado.disponivel
          ? `<a class="btn btn--wa btn--sm" href="${whatsapp(
              config.whatsapp,
              'Olá! Queria avaliar meu aparelho usado como parte do pagamento.'
            )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Avaliar meu aparelho</a>`
          : ''
      }
    </div>

    <div class="cartao">
      <h3 class="cartao__titulo">Crediário e carnê</h3>
      <p>${e(pagamento.carne.texto)}</p>
      <h4 style="margin-top:var(--s-4)">O que levar</h4>
      <ul class="lista-check">
        ${pagamento.documentos.map((d) => `<li>${icon('check')}<span>${e(d)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</section>

${chamadaFinal(config, {
  titulo: 'Cabe no seu bolso?',
  texto: 'Manda o produto que você quer e a gente monta a melhor forma de pagamento na hora.',
  mensagem: 'Olá! Queria saber as condições de pagamento de um produto.'
})}
`;

  return layout({
    titulo: `Pagamento e parcelamento | ${config.nome} — ${config.cidade}/${config.estado}`,
    descricao: `PIX, dinheiro, débito e crédito em até ${pagamento.maxParcelas}x na ${config.nome}, centro de ${config.cidade} — ${config.estado}. Simule a parcela do seu produto.`,
    conteudo,
    ativo: '/pagamento',
    config,
    horarios: config.horarios,
    canonical: '/pagamento'
  });
}

/* ------------------------------------------------------------------ */
/* Garantia e procedência                                              */
/* ------------------------------------------------------------------ */
function garantiaPagina(db) {
  const { config, garantia } = db;

  const conteudo = `
<section class="secao">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Garantia e procedência',
      titulo: 'Original, lacrado e com nota',
      texto: e(garantia.resumo)
    })}

    <div class="tabela-rolagem" data-revelar>
      <table>
        <caption class="sr-only">Prazos de garantia por categoria</caption>
        <thead>
          <tr><th scope="col">Categoria</th><th scope="col">Prazo</th><th scope="col">Como funciona</th></tr>
        </thead>
        <tbody>
          ${garantia.itens
            .map(
              (i) =>
                `<tr><td><strong>${e(i.categoria)}</strong></td><td><span class="selo selo--original">${e(
                  i.prazo
                )}</span></td><td class="muted">${e(i.detalhe)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="secao secao--escura">
  <div class="container grid grid--2" data-revelar-grupo>
    <div class="cartao">
      <h3 class="cartao__titulo">Como acionar a garantia</h3>
      <ol class="lista-passos">
        ${garantia.comoAcionar.map((p) => `<li><span>${e(p)}</span></li>`).join('')}
      </ol>
    </div>

    <div class="cartao">
      <h3 class="cartao__titulo">Troca e devolução</h3>
      <p>${e(garantia.politicaTroca)}</p>
      <div class="aviso">
        ${icon('escudo')}
        <span>Guarde a nota fiscal. Ela é o que garante o prazo — e a gente sempre emite.</span>
      </div>
    </div>
  </div>
</section>

${chamadaFinal(config, {
  titulo: 'Precisa acionar a garantia?',
  texto: 'Manda o modelo e a data da compra que a gente localiza a nota e resolve.',
  mensagem: 'Olá! Preciso acionar a garantia de um produto que comprei com vocês.'
})}
`;

  return layout({
    titulo: `Garantia e procedência | ${config.nome} — ${config.cidade}/${config.estado}`,
    descricao: `Produto lacrado, original e com nota fiscal. Prazos de garantia por categoria e política de troca da ${config.nome}, ${config.cidade} — ${config.estado}.`,
    conteudo,
    ativo: '/garantia',
    config,
    horarios: config.horarios,
    canonical: '/garantia'
  });
}

/* ------------------------------------------------------------------ */
/* Entrega e região                                                    */
/* ------------------------------------------------------------------ */
function entregaPagina(db) {
  const { config, entrega } = db;

  const conteudo = `
<section class="secao">
  <div class="container">
    ${cabecaSecao({ rotulo: 'Entrega e região', titulo: 'Até onde a gente vai', texto: e(entrega.resumo) })}

    <div class="grid grid--3" data-revelar-grupo>
      <div class="cartao">
        <span style="color:var(--verde-limao);width:26px;height:26px;display:block">${icon('caminhao')}</span>
        <h3 class="cartao__titulo">Entrega em ${e(config.cidade)}</h3>
        <p><strong>${e(entrega.local.prazo)}</strong></p>
        <p class="muted">${e(entrega.local.taxa)}</p>
        <h4 style="margin-top:var(--s-4)">Bairros atendidos</h4>
        <ul class="chips">
          ${entrega.local.bairros.map((b) => `<li><span class="chip">${e(b)}</span></li>`).join('')}
        </ul>
      </div>

      <div class="cartao">
        <span style="color:var(--verde-limao);width:26px;height:26px;display:block">${icon('pin')}</span>
        <h3 class="cartao__titulo">Cidades vizinhas</h3>
        <p class="muted">${e(entrega.cidadesTexto)}</p>
        <ul class="chips">
          ${entrega.cidades.map((c) => `<li><span class="chip">${e(c)}</span></li>`).join('')}
        </ul>
      </div>

      <div class="cartao" style="border-color:var(--verde-limao)">
        <span style="color:var(--verde-limao);width:26px;height:26px;display:block">${icon('loja')}</span>
        <h3 class="cartao__titulo">Retirar na loja</h3>
        <p><strong class="destaque-neon">Sempre grátis</strong></p>
        <p class="muted">${e(entrega.retirada)}</p>
        <a class="btn btn--wa btn--bloco btn--sm" href="${whatsapp(
          config.whatsapp,
          'Olá! Queria separar um produto para retirar na loja.'
        )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Separar para retirada</a>
      </div>
    </div>
  </div>
</section>

${chamadaFinal(config, {
  titulo: 'Sua cidade não está na lista?',
  texto: 'Manda mensagem com o produto e a cidade que a gente cota o envio e responde com o valor.',
  mensagem: 'Olá! Queria saber se vocês entregam na minha cidade.'
})}

${faixaContato(config, config.horarios)}
`;

  return layout({
    titulo: `Entrega e região atendida | ${config.nome} — ${config.cidade}/${config.estado}`,
    descricao: `Entrega em ${config.cidade} no mesmo dia, envio para cidades vizinhas e retirada grátis na loja. ${config.endereco}, centro de ${config.cidade} — ${config.estado}.`,
    conteudo,
    ativo: '/entrega',
    config,
    horarios: config.horarios,
    canonical: '/entrega'
  });
}

/* ------------------------------------------------------------------ */
/* A loja e o time                                                     */
/* ------------------------------------------------------------------ */
function lojaPagina(db) {
  const { config, sobreLoja, equipe, depoimentos } = db;
  const aprovados = depoimentos.filter((d) => d.aprovado);

  const conteudo = `
<section class="hero">
  <div class="container hero__grade">
    <div class="hero__conteudo">
      <p class="rotulo">A loja e o time</p>
      <h1>${e(sobreLoja.titulo)}</h1>
      <p class="lead">${e(sobreLoja.texto)}</p>
      <div class="hero__acoes">
        <a class="btn btn--primario" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          config.mapsQuery
        )}" rel="noopener">${icon('pin', 'btn__icone')} Ver no mapa</a>
        <a class="btn btn--contorno" href="https://instagram.com/${e(config.instagram)}" rel="noopener">
          ${icon('instagram', 'btn__icone')} @${e(config.instagram)}
        </a>
      </div>
    </div>
    <div class="hero__foto">
      ${imagemOu(
        sobreLoja.fotos && sobreLoja.fotos[0],
        `Interior da ${config.nome}`,
        'O verde da loja é o argumento — suba fotos reais em /admin',
        ' width="800" height="600"'
      )}
    </div>
  </div>
</section>

${
  sobreLoja.fotos && sobreLoja.fotos.length > 1
    ? `<section class="secao">
  <div class="container">
    ${cabecaSecao({ rotulo: 'Por dentro', titulo: 'O ambiente' })}
    <div class="grid grid--3" data-revelar-grupo>
      ${sobreLoja.fotos
        .slice(1)
        .map(
          (f) =>
            `<img src="${e(f)}" alt="Ambiente da ${e(config.nome)}" loading="lazy" decoding="async"
                  style="border-radius:var(--r-lg);border:1px solid var(--border);aspect-ratio:4/3;object-fit:cover;width:100%">`
        )
        .join('\n      ')}
    </div>
  </div>
</section>`
    : ''
}

<section class="secao secao--escura" aria-labelledby="time">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Gente antes de produto',
      titulo: 'Quem vai te atender',
      texto: 'O cliente já sabe o nome de quem atende. Isso é o que a concorrência não copia.',
      id: 'time'
    })}
    <div class="grid grid--4" data-revelar-grupo>
      ${equipe
        .map(
          (p) => `<div class="pessoa">
        <div class="pessoa__foto">
          ${imagemOu(p.foto, p.nome, 'Foto pendente', ' width="400" height="400"')}
        </div>
        <div>
          <p class="pessoa__nome">${e(p.nome)}</p>
          <p class="pessoa__funcao">${e(p.funcao)}</p>
        </div>
      </div>`
        )
        .join('\n      ')}
    </div>
  </div>
</section>

${
  aprovados.length
    ? `<section class="secao">
  <div class="container">
    ${cabecaSecao({ rotulo: 'Prova social', titulo: 'O que dizem os clientes' })}
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
    titulo: `A loja e o time | ${config.nome} — ${config.cidade}/${config.estado}`,
    descricao: `Conheça a ${config.nome}: loja física na ${config.endereco}, centro de ${config.cidade} — ${config.estado}, e a equipe que atende no balcão.`,
    conteudo,
    ativo: '/a-loja',
    config,
    horarios: config.horarios,
    canonical: '/a-loja'
  });
}

module.exports = { pagamentoPagina, garantiaPagina, entregaPagina, lojaPagina };
