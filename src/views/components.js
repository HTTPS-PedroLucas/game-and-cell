const { e, join, money, parcela, whatsapp } = require('../lib/helpers');
const { icon } = require('./icons');

/** Moldura para foto ainda não enviada — deixa claro o que falta, sem stock. */
function fotoVazia(texto) {
  return `<div class="foto-vazia">
    ${icon('imagem')}
    <strong>Foto real pendente</strong>
    <span class="small">${e(texto)}</span>
  </div>`;
}

function imagemOu(src, alt, texto, extra = '') {
  if (!src) return fotoVazia(texto);
  return `<img src="${e(src)}" alt="${e(alt)}" loading="lazy" decoding="async"${extra}>`;
}

function cabecaSecao({ rotulo, titulo, texto, id, marca = true }) {
  return `<div class="secao-cabeca" data-revelar>
    ${rotulo ? `<p class="rotulo">${e(rotulo)}</p>` : ''}
    <h2${id ? ` id="${e(id)}"` : ''}${marca ? ' class="titulo-marca"' : ''}>${e(titulo)}</h2>
    <span class="filete-marca" aria-hidden="true"></span>
    ${texto ? `<p class="lead">${e(texto)}</p>` : ''}
  </div>`;
}

/**
 * Card de produto no padrão de ficha técnica que a marca já usa nas artes.
 * Preço sempre visível — "consulte valores" é o maior ponto de abandono.
 */
function cardProduto(produto, config, pagamento) {
  const desconto =
    produto.precoAntigo && produto.precoAntigo > produto.preco
      ? Math.round((1 - produto.preco / produto.precoAntigo) * 100)
      : 0;

  const vezes = Math.min(produto.parcelas || 1, pagamento.maxParcelas || 12);
  const valorParcela = parcela(produto.preco, vezes, pagamento.jurosMes, pagamento.parcelasSemJuros);

  const mensagem = `Olá! Vi o ${produto.nome} no site por ${money(produto.preco)}. Ainda tem disponível?`;

  return `<article class="produto">
  <div class="produto__midia">
    ${imagemOu(produto.imagem, produto.nome, 'Envie a foto do produto no painel', ' width="600" height="600"')}
    <div class="produto__selos">
      ${
        produto.disponibilidade === 'estoque'
          ? '<span class="selo selo--estoque">Em estoque</span>'
          : '<span class="selo selo--encomenda">Sob encomenda</span>'
      }
      ${desconto ? `<span class="selo selo--desconto">-${desconto}%</span>` : ''}
    </div>
  </div>

  <div class="produto__corpo">
    <p class="produto__marca">${e(produto.marca)}</p>
    <h3 class="produto__nome">${e(produto.nome)}</h3>

    ${
      produto.ficha && produto.ficha.length
        ? `<ul class="ficha">${produto.ficha
            .slice(0, 4)
            .map((f) => `<li>${e(f)}</li>`)
            .join('')}</ul>`
        : ''
    }

    <div class="preco">
      ${produto.precoAntigo ? `<p class="preco__antigo">De ${money(produto.precoAntigo)}</p>` : ''}
      <p class="preco__valor">${money(produto.preco)}</p>
      ${
        vezes > 1
          ? `<p class="preco__parcela">ou ${vezes}x de ${money(valorParcela)} no cartão</p>`
          : '<p class="preco__parcela">à vista no PIX ou dinheiro</p>'
      }
    </div>

    <a class="btn btn--wa btn--bloco btn--sm" href="${whatsapp(config.whatsapp, mensagem)}" rel="noopener">
      ${icon('whatsapp', 'btn__icone')} Falar sobre este produto
    </a>
  </div>
</article>`;
}

function cardServico(servico, config) {
  const mensagem = `Olá! Quero um orçamento de ${servico.nome.toLowerCase()}.`;
  return `<article class="cartao cartao--servico">
    <h3 class="cartao__titulo">${e(servico.nome)}</h3>
    <p class="muted">${e(servico.descricao)}</p>
    <p class="servico__faixa">${e(servico.faixa)}</p>
    <dl class="servico__meta">
      <div><dt>Prazo médio</dt><dd>${e(servico.prazo)}</dd></div>
      <div><dt>Garantia</dt><dd>${e(servico.garantia)}</dd></div>
    </dl>
    <a class="btn btn--contorno btn--bloco btn--sm" href="${whatsapp(config.whatsapp, mensagem)}" rel="noopener">
      ${icon('whatsapp', 'btn__icone')} Pedir orçamento
    </a>
  </article>`;
}

function estadoVazio(titulo, texto, acao = '') {
  return `<div class="vazio">
    ${icon('busca')}
    <h3>${e(titulo)}</h3>
    <p>${e(texto)}</p>
    ${acao}
  </div>`;
}

/** Faixa de endereço + mapa, repetida no fim das páginas de conversão. */
function faixaContato(config, horarios) {
  const mapa = `https://www.google.com/maps?q=${encodeURIComponent(config.mapsQuery)}&output=embed`;
  const mensagem = `Olá! Queria confirmar o horário de funcionamento de vocês.`;

  return `<section class="secao secao--escura" aria-labelledby="como-chegar">
  <div class="container">
    ${cabecaSecao({
      rotulo: 'Onde a gente fica',
      titulo: 'Como chegar na loja',
      texto: 'No centro de Iguatu. É a fachada verde — não tem erro.',
      id: 'como-chegar'
    })}

    <div class="grid grid--2">
      <div class="pilha" data-revelar="esquerda">
        <div class="cartao">
          <h3 class="cartao__titulo">Endereço</h3>
          <p>${e(config.endereco)}<br>${e(config.bairro)} — ${e(config.cidade)}/${e(config.estado)}</p>
          <a class="btn btn--contorno btn--sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            config.mapsQuery
          )}" rel="noopener">${icon('pin', 'btn__icone')} Abrir no Google Maps</a>
        </div>

        <div class="cartao">
          <h3 class="cartao__titulo">Horário</h3>
          <div class="tabela-rolagem">
            <table>
              <caption class="sr-only">Horário de funcionamento</caption>
              <tbody>
                ${horarios
                  .map((h) => `<tr><td>${e(h.dia)}</td><td><strong>${e(h.hora)}</strong></td></tr>`)
                  .join('')}
              </tbody>
            </table>
          </div>
          <a class="btn btn--wa btn--sm" href="${whatsapp(config.whatsapp, mensagem)}" rel="noopener">
            ${icon('whatsapp', 'btn__icone')} ${e(config.whatsappExibicao)}
          </a>
        </div>
      </div>

      <iframe
        class="mapa" data-revelar="direita"
        src="${mapa}"
        title="Mapa com a localização da ${e(config.nome)} em ${e(config.cidade)}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen></iframe>
    </div>
  </div>
</section>`;
}

/** Bloco final de conversão — toda página termina com um caminho claro. */
function chamadaFinal(config, { titulo, texto, mensagem }) {
  return `<section class="secao">
  <div class="container">
    <div class="cartao" style="border-color:var(--verde-limao);text-align:center" data-revelar="zoom">
      <h2>${e(titulo)}</h2>
      <p class="lead" style="margin-inline:auto;max-width:52ch">${e(texto)}</p>
      <div class="hero__acoes" style="justify-content:center;margin-top:var(--s-6)">
        <a class="btn btn--wa" href="${whatsapp(config.whatsapp, mensagem)}" rel="noopener">
          ${icon('whatsapp', 'btn__icone')} Chamar no WhatsApp
        </a>
        <a class="btn btn--contorno" href="/vitrine">${icon('busca', 'btn__icone')} Ver a vitrine</a>
      </div>
    </div>
  </div>
</section>`;
}

module.exports = {
  fotoVazia,
  imagemOu,
  cabecaSecao,
  cardProduto,
  cardServico,
  estadoVazio,
  faixaContato,
  chamadaFinal
};
