const { e, money, whatsapp } = require('../lib/helpers');
const { icon } = require('./icons');
const { layout } = require('./layout');
const { cabecaSecao, cardProduto, estadoVazio, chamadaFinal } = require('./components');

/** Monta a URL preservando o outro filtro — filtros são estado de URL, compartilhável. */
function urlFiltro(base, atual, chave, valor) {
  const params = new URLSearchParams();
  const proximo = { ...atual, [chave]: valor };
  if (proximo.categoria) params.set('categoria', proximo.categoria);
  if (proximo.marca) params.set('marca', proximo.marca);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function vitrine(db, filtros) {
  const { config, pagamento, categorias, marcas, produtos } = db;

  const lista = produtos.filter(
    (p) =>
      (!filtros.categoria || p.categoria === filtros.categoria) &&
      (!filtros.marca || p.marca === filtros.marca)
  );

  const categoriaAtual = categorias.find((c) => c.slug === filtros.categoria);
  const marcasDisponiveis = marcas.filter((m) => produtos.some((p) => p.marca === m));

  const titulo = categoriaAtual
    ? `${categoriaAtual.nome} em ${config.cidade}/${config.estado}`
    : `Vitrine — produtos e preços em ${config.cidade}/${config.estado}`;

  const jsonLd = lista.length
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: lista.slice(0, 24).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              name: p.nome,
              brand: p.marca,
              description: p.descricao,
              offers: {
                '@type': 'Offer',
                price: p.preco,
                priceCurrency: 'BRL',
                availability:
                  p.disponibilidade === 'estoque'
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/PreOrder'
              }
            }
          }))
        }
      ]
    : [];

  const conteudo = `
<section class="secao">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Vitrine',
      titulo: categoriaAtual ? categoriaAtual.nome : 'Tudo que tem na loja',
      texto: categoriaAtual
        ? categoriaAtual.descricao
        : 'Preço à vista, preço parcelado e disponibilidade. Gostou de algum, o botão já abre a conversa dizendo qual é.'
    })}

    <div class="filtros">
      <div class="filtros__grupo">
        <span class="rotulo" id="rot-categoria">Categoria</span>
        <ul class="chips" aria-labelledby="rot-categoria">
          <li><a class="chip" href="${urlFiltro('/vitrine', filtros, 'categoria', '')}" aria-current="${!filtros.categoria}">Todas</a></li>
          ${categorias
            .map(
              (c) =>
                `<li><a class="chip" href="${urlFiltro('/vitrine', filtros, 'categoria', c.slug)}" aria-current="${
                  filtros.categoria === c.slug
                }">${e(c.nome)}</a></li>`
            )
            .join('\n          ')}
        </ul>
      </div>

      <div class="filtros__grupo">
        <span class="rotulo" id="rot-marca">Marca</span>
        <ul class="chips" aria-labelledby="rot-marca">
          <li><a class="chip" href="${urlFiltro('/vitrine', filtros, 'marca', '')}" aria-current="${!filtros.marca}">Todas</a></li>
          ${marcasDisponiveis
            .map(
              (m) =>
                `<li><a class="chip" href="${urlFiltro('/vitrine', filtros, 'marca', m)}" aria-current="${
                  filtros.marca === m
                }">${e(m)}</a></li>`
            )
            .join('\n          ')}
        </ul>
      </div>
    </div>

    <p class="small muted" role="status" style="margin-bottom:var(--s-4)">
      ${lista.length === 1 ? '1 produto encontrado' : `${lista.length} produtos encontrados`}
    </p>

    ${
      lista.length
        ? `<div class="produtos" data-revelar-grupo>
      ${lista.map((p) => cardProduto(p, config, pagamento)).join('\n      ')}
    </div>`
        : estadoVazio(
            'Nada com esse filtro',
            'Tente outra categoria ou marca — ou chame no WhatsApp que a gente procura pra você.',
            `<a class="btn btn--wa btn--sm" href="${whatsapp(
              config.whatsapp,
              'Olá! Procurei no site e não achei o que eu queria. Podem me ajudar?'
            )}" rel="noopener">${icon('whatsapp', 'btn__icone')} Perguntar no WhatsApp</a>`
          )
    }
  </div>
</section>

${chamadaFinal(config, {
  titulo: 'Não achou o que procurava?',
  texto: 'O estoque gira rápido e nem tudo entra no site no mesmo dia. Manda mensagem que a gente confere na hora.',
  mensagem: 'Olá! Vi a vitrine no site e queria saber se vocês têm um produto específico.'
})}
`;

  return layout({
    titulo: `${titulo} | ${config.nome}`,
    descricao: `${
      categoriaAtual ? categoriaAtual.descricao : 'Consoles, celulares, acessórios, áudio e colecionáveis'
    } com preço e disponibilidade na ${config.nome}, ${config.endereco}, centro de ${config.cidade} — ${config.estado}.`,
    conteudo,
    ativo: '/vitrine',
    config,
    horarios: config.horarios,
    jsonLd,
    canonical: filtros.categoria ? `/vitrine?categoria=${filtros.categoria}` : '/vitrine'
  });
}

module.exports = { vitrine };
