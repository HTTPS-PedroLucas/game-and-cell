/* Painel do administrador da Game & Cell.
   Sem framework: o painel é pequeno, precisa abrir rápido no 4G do balcão
   e ficar fácil de manter por quem mexer nisso depois. */
(() => {
  'use strict';

  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICONE = {
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    apagar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    imagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
  };

  let dados = null;

  /* ================================================================
     Rede
     ================================================================ */
  async function api(caminho, opcoes = {}) {
    const resp = await fetch(`/api/admin${caminho}`, {
      headers: opcoes.body ? { 'Content-Type': 'application/json' } : {},
      ...opcoes
    });

    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(corpo.erro || 'Não deu certo. Tente de novo.');
    return corpo;
  }

  function toast(texto, tipo = 'ok') {
    const el = $('#toast');
    el.textContent = texto;
    el.className = `toast toast--${tipo}`;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.hidden = true;
    }, 3600);
  }

  /* ================================================================
     Abas
     ================================================================ */
  $$('.admin-aba').forEach((aba) => {
    aba.addEventListener('click', () => {
      $$('.admin-aba').forEach((a) => a.setAttribute('aria-selected', String(a === aba)));
      $$('.admin-painel').forEach((p) => {
        p.hidden = p.id !== `painel-${aba.dataset.aba}`;
      });
      desenhar(aba.dataset.aba);
    });
  });

  function abaAtiva() {
    return $('.admin-aba[aria-selected="true"]')?.dataset.aba || 'painel';
  }

  /* ================================================================
     Compressão de imagem no navegador
     O briefing marca "velocidade e imagem comprimida" como CRÍTICO —
     resolver aqui evita dependência nativa no servidor.
     ================================================================ */
  function comprimir(arquivo, ladoMax = 1200, qualidade = 0.82) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Não consegui processar a imagem.'));
            resolve(new File([blob], 'foto.webp', { type: 'image/webp' }));
          },
          'image/webp',
          qualidade
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Arquivo de imagem inválido.'));
      };
      img.src = url;
    });
  }

  async function subirImagem(arquivo, aoAndamento) {
    aoAndamento('Comprimindo...');
    const comprimido = await comprimir(arquivo);
    aoAndamento(`Enviando (${Math.round(comprimido.size / 1024)} KB)...`);

    const form = new FormData();
    form.append('imagem', comprimido);
    const resp = await fetch('/api/admin/upload', { method: 'POST', body: form });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(corpo.erro || 'Falha ao enviar a imagem.');

    const kb = Math.round(corpo.tamanho / 1024);
    aoAndamento(`Enviada — ${kb} KB, convertida para WebP.`);
    return corpo.url;
  }

  /* ================================================================
     Campos do formulário
     ================================================================ */
  function campo(def, valor) {
    const id = `c_${def.nome}`;
    const req = def.obrigatorio ? ' required' : '';
    const dica = def.dica ? `<p class="campo__dica">${esc(def.dica)}</p>` : '';
    const rotulo = `<label for="${id}">${esc(def.rotulo)}${
      def.obrigatorio ? ' <span class="muted small">(obrigatório)</span>' : ''
    }</label>`;

    if (def.tipo === 'interruptor') {
      return `<label class="interruptor">
        <input type="checkbox" id="${id}" data-campo="${def.nome}" ${valor ? 'checked' : ''}>
        <span>${esc(def.rotulo)}</span>
      </label>${dica}`;
    }

    if (def.tipo === 'selecao') {
      return `<div class="campo">${rotulo}
        <select id="${id}" data-campo="${def.nome}"${req}>
          ${def.opcoes
            .map(
              (o) =>
                `<option value="${esc(o.valor)}"${String(o.valor) === String(valor) ? ' selected' : ''}>${esc(
                  o.rotulo
                )}</option>`
            )
            .join('')}
        </select>${dica}</div>`;
    }

    if (def.tipo === 'texto-longo' || def.tipo === 'linhas') {
      const conteudo = def.tipo === 'linhas' ? (valor || []).join('\n') : valor || '';
      return `<div class="campo">${rotulo}
        <textarea id="${id}" data-campo="${def.nome}" data-lista="${def.tipo === 'linhas'}"${req}
                  rows="${def.linhas || 4}">${esc(conteudo)}</textarea>${dica}</div>`;
    }

    if (def.tipo === 'imagem') {
      const previa = valor
        ? `<img class="envio-imagem__previa" id="${id}_previa" src="${esc(valor)}" alt="Pré-visualização">`
        : `<div class="envio-imagem__previa envio-imagem__previa--vazia" id="${id}_previa">${ICONE.imagem}</div>`;
      return `<div class="campo">${rotulo}
        <div class="envio-imagem">
          ${previa}
          <input type="file" id="${id}_arquivo" accept="image/*" data-imagem-para="${def.nome}">
          <input type="hidden" id="${id}" data-campo="${def.nome}" value="${esc(valor || '')}">
          <p class="envio-imagem__status" id="${id}_status">${
            valor ? 'Imagem atual. Escolha outra para substituir.' : 'Nenhuma imagem ainda.'
          }</p>
        </div>${dica}</div>`;
    }

    const tipo = def.tipo || 'text';
    const extras =
      tipo === 'number' ? ` step="${def.passo || 1}" min="${def.min ?? 0}" inputmode="numeric"` : '';
    return `<div class="campo">${rotulo}
      <input type="${tipo}" id="${id}" data-campo="${def.nome}" value="${esc(valor ?? '')}"${req}${extras}>${dica}</div>`;
  }

  function coletar(raiz) {
    const saida = {};
    $$('[data-campo]', raiz).forEach((el) => {
      const nome = el.dataset.campo;
      if (el.type === 'checkbox') saida[nome] = el.checked;
      else if (el.dataset.lista === 'true') {
        saida[nome] = el.value.split('\n').map((l) => l.trim()).filter(Boolean);
      } else if (el.type === 'number') saida[nome] = el.value === '' ? null : Number(el.value);
      else saida[nome] = el.value;
    });
    return saida;
  }

  /* ================================================================
     Modal
     ================================================================ */
  const modal = $('#modal');
  let aoSalvar = null;

  function fecharModal() {
    modal.close();
    aoSalvar = null;
  }

  $('#modalFechar').addEventListener('click', fecharModal);
  $('#modalCancelar').addEventListener('click', fecharModal);

  $('#modalForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!aoSalvar) return;

    const botao = $('#modalSalvar');
    const caixa = $('#modalAviso');
    botao.disabled = true;
    botao.textContent = 'Salvando...';
    caixa.innerHTML = '';

    try {
      await aoSalvar(coletar($('#modalCorpo')));
      fecharModal();
      toast('Salvo. O site já está mostrando a versão nova.');
      await carregar();
    } catch (err) {
      if (err.message !== 'sessao') {
        caixa.innerHTML = `<div class="aviso aviso--erro">${ICONE.alerta}<span>${esc(err.message)}</span></div>`;
      }
    } finally {
      botao.disabled = false;
      botao.textContent = 'Salvar';
    }
  });

  function abrirModal(titulo, campos, valores, salvar) {
    $('#modalTitulo').textContent = titulo;
    $('#modalAviso').innerHTML = '';
    $('#modalCorpo').innerHTML = campos
      .map((linha) =>
        Array.isArray(linha)
          ? `<div class="linha-campos linha-campos--${linha.length}">${linha
              .map((d) => campo(d, valores[d.nome]))
              .join('')}</div>`
          : campo(linha, valores[linha.nome])
      )
      .join('');

    // Envio de imagem dentro do modal
    $$('[data-imagem-para]', $('#modalCorpo')).forEach((input) => {
      input.addEventListener('change', async () => {
        const arquivo = input.files[0];
        if (!arquivo) return;
        const base = `c_${input.dataset.imagemPara}`;
        const status = $(`#${base}_status`);
        const hidden = $(`#${base}`);

        try {
          const url = await subirImagem(arquivo, (t) => {
            status.textContent = t;
          });
          hidden.value = url;
          const previa = $(`#${base}_previa`);
          const nova = document.createElement('img');
          nova.className = 'envio-imagem__previa';
          nova.id = `${base}_previa`;
          nova.src = url;
          nova.alt = 'Pré-visualização';
          previa.replaceWith(nova);
        } catch (err) {
          status.textContent = err.message;
        }
      });
    });

    aoSalvar = salvar;
    modal.showModal();
    $('#modalCorpo input, #modalCorpo select, #modalCorpo textarea')?.focus();
  }

  async function confirmarRemocao(nome, remover) {
    if (!window.confirm(`Apagar "${nome}"? Isso some do site na hora e não dá para desfazer.`)) return;
    try {
      await remover();
      toast('Removido do site.');
      await carregar();
    } catch (err) {
      if (err.message !== 'sessao') toast(err.message, 'erro');
    }
  }

  /* ================================================================
     Definições de formulário por coleção
     ================================================================ */
  function camposProduto() {
    return [
      { nome: 'nome', rotulo: 'Nome do produto', obrigatorio: true },
      [
        {
          nome: 'categoria',
          rotulo: 'Categoria',
          tipo: 'selecao',
          opcoes: dados.categorias.map((c) => ({ valor: c.slug, rotulo: c.nome }))
        },
        {
          nome: 'marca',
          rotulo: 'Marca',
          tipo: 'selecao',
          opcoes: dados.marcas.map((m) => ({ valor: m, rotulo: m }))
        },
        {
          nome: 'disponibilidade',
          rotulo: 'Disponibilidade',
          tipo: 'selecao',
          opcoes: [
            { valor: 'estoque', rotulo: 'Em estoque' },
            { valor: 'encomenda', rotulo: 'Sob encomenda' }
          ]
        }
      ],
      [
        { nome: 'preco', rotulo: 'Preço à vista', tipo: 'number', passo: 0.01, obrigatorio: true, dica: 'Sem preço o produto não entra no site.' },
        { nome: 'precoAntigo', rotulo: 'Preço antigo', tipo: 'number', passo: 0.01, dica: 'Vira o selo de desconto. Deixe vazio se não houver.' },
        { nome: 'parcelas', rotulo: 'Máx. de parcelas', tipo: 'number', min: 1 }
      ],
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto-longo', linhas: 3 },
      {
        nome: 'ficha',
        rotulo: 'Ficha técnica',
        tipo: 'linhas',
        linhas: 5,
        dica: 'Um atributo por linha. As 4 primeiras aparecem no card.'
      },
      { nome: 'imagem', rotulo: 'Foto do produto', tipo: 'imagem', dica: 'Fundo neutro. A imagem é comprimida automaticamente.' },
      { nome: 'destaque', rotulo: 'Mostrar nos destaques da home', tipo: 'interruptor' }
    ];
  }

  const CAMPOS = {
    produtos: camposProduto,
    servicos: () => [
      { nome: 'nome', rotulo: 'Nome do serviço', obrigatorio: true },
      { nome: 'descricao', rotulo: 'O que resolve', tipo: 'texto-longo', linhas: 3 },
      [
        { nome: 'faixa', rotulo: 'Faixa de preço', obrigatorio: true, dica: 'Ex.: A partir de R$ 180,00' },
        { nome: 'prazo', rotulo: 'Prazo médio', obrigatorio: true, dica: 'Ex.: 24h a 48h' },
        { nome: 'garantia', rotulo: 'Garantia', obrigatorio: true, dica: 'Ex.: 90 dias' }
      ]
    ],
    torneios: () => [
      [
        { nome: 'nome', rotulo: 'Nome do torneio', obrigatorio: true },
        { nome: 'jogo', rotulo: 'Jogo' }
      ],
      [
        { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true },
        { nome: 'hora', rotulo: 'Hora', dica: 'Ex.: 14h00' },
        { nome: 'vagas', rotulo: 'Vagas', tipo: 'number', min: 0 }
      ],
      { nome: 'local', rotulo: 'Local' },
      [
        { nome: 'inscricao', rotulo: 'Valor da inscrição' },
        {
          nome: 'status',
          rotulo: 'Situação',
          tipo: 'selecao',
          opcoes: [
            { valor: 'rascunho', rotulo: 'Rascunho (não aparece)' },
            { valor: 'aberto', rotulo: 'Inscrições abertas' },
            { valor: 'encerrado', rotulo: 'Encerrado' }
          ]
        }
      ],
      { nome: 'premiacao', rotulo: 'Premiação', tipo: 'texto-longo', linhas: 2 },
      { nome: 'regulamento', rotulo: 'Regulamento', tipo: 'linhas', linhas: 6, dica: 'Uma regra por linha.' },
      { nome: 'campeao', rotulo: 'Campeão', dica: 'Preencha depois que o torneio acabar.' },
      { nome: 'imagem', rotulo: 'Foto da edição', tipo: 'imagem' }
    ],
    equipe: () => [
      [
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
        { nome: 'funcao', rotulo: 'Função' }
      ],
      { nome: 'bio', rotulo: 'Uma linha sobre a pessoa', tipo: 'texto-longo', linhas: 2 },
      { nome: 'foto', rotulo: 'Foto', tipo: 'imagem' }
    ],
    depoimentos: () => [
      [
        { nome: 'nome', rotulo: 'Nome do cliente', obrigatorio: true },
        { nome: 'cidade', rotulo: 'Cidade' }
      ],
      { nome: 'texto', rotulo: 'Depoimento', tipo: 'texto-longo', linhas: 4, obrigatorio: true },
      { nome: 'foto', rotulo: 'Foto', tipo: 'imagem' },
      {
        nome: 'aprovado',
        rotulo: 'Publicar no site',
        tipo: 'interruptor',
        dica: 'Só publique com autorização da pessoa.'
      }
    ]
  };

  const SINGULAR = {
    produtos: 'produto',
    servicos: 'serviço',
    torneios: 'torneio',
    equipe: 'pessoa',
    depoimentos: 'depoimento'
  };

  const VAZIO = {
    produtos: { categoria: 'consoles-e-jogos', marca: 'Outras', disponibilidade: 'estoque', parcelas: 10, ficha: [] },
    servicos: {},
    torneios: { status: 'rascunho', vagas: 32, regulamento: [] },
    equipe: {},
    depoimentos: { aprovado: false, cidade: 'Iguatu — CE' }
  };

  function novoItem(colecao) {
    abrirModal(
      `Novo ${SINGULAR[colecao]}`,
      CAMPOS[colecao](),
      { ...VAZIO[colecao] },
      (corpo) => api(`/${colecao}`, { method: 'POST', body: JSON.stringify(corpo) })
    );
  }

  function editarItem(colecao, item) {
    abrirModal(
      `Editar ${SINGULAR[colecao]}`,
      CAMPOS[colecao](),
      item,
      (corpo) => api(`/${colecao}/${item.id}`, { method: 'PUT', body: JSON.stringify(corpo) })
    );
  }

  /* ================================================================
     Blocos de listagem
     ================================================================ */
  function registro({ id, thumb, nome, metas, acoes }) {
    return `<article class="registro" data-id="${id}">
      ${
        thumb
          ? `<img class="registro__thumb" src="${esc(thumb)}" alt="" loading="lazy">`
          : `<div class="registro__thumb registro__thumb--vazio">${ICONE.imagem}</div>`
      }
      <div class="registro__info">
        <p class="registro__nome">${esc(nome)}</p>
        <div class="registro__meta">${metas.filter(Boolean).join('')}</div>
      </div>
      <div class="registro__acoes">${acoes}</div>
    </article>`;
  }

  const botoesItem = (colecao, id) => `
    <button class="btn-icone" type="button" data-acao="editar" data-colecao="${colecao}" data-id="${id}"
            aria-label="Editar">${ICONE.editar}</button>
    <button class="btn-icone btn-icone--perigo" type="button" data-acao="apagar" data-colecao="${colecao}" data-id="${id}"
            aria-label="Apagar">${ICONE.apagar}</button>`;

  function topoSecao(titulo, texto, colecao) {
    return `<div class="admin-secao__topo">
      <div><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></div>
      ${
        colecao
          ? `<button class="btn btn--primario btn--sm" type="button" data-acao="novo" data-colecao="${colecao}">
               + Adicionar
             </button>`
          : ''
      }
    </div>`;
  }

  function listaVazia(texto) {
    return `<div class="vazio"><h3>Nada aqui ainda</h3><p>${esc(texto)}</p></div>`;
  }

  /* ================================================================
     Painéis
     ================================================================ */
  const PAINEIS = {
    painel() {
      const novos = dados.leads.filter((l) => l.status === 'novo');
      const semFoto = dados.produtos.filter((p) => !p.imagem).length;
      const semPreco = dados.produtos.filter((p) => !p.preco).length;
      const destaques = dados.produtos.filter((p) => p.destaque).length;

      return `
      ${topoSecao('Como está o site hoje', 'Um olhar rápido antes de abrir a loja.', null)}

      <div class="faixa-exemplo">
        ${ICONE.alerta}
        <span><strong>Conteúdo de partida.</strong> Preços, prazos e fotos vieram do briefing como exemplo.
        Confira item por item antes de divulgar o endereço do site.</span>
      </div>

      <div class="metricas">
        <div class="metrica">
          <p class="metrica__valor">${dados.produtos.length}</p>
          <p class="metrica__rotulo">Produtos no ar</p>
        </div>
        <div class="metrica${novos.length ? ' metrica--alerta' : ''}">
          <p class="metrica__valor">${novos.length}</p>
          <p class="metrica__rotulo">Pedidos sem resposta</p>
        </div>
        <div class="metrica${semFoto ? ' metrica--alerta' : ''}">
          <p class="metrica__valor">${semFoto}</p>
          <p class="metrica__rotulo">Produtos sem foto</p>
        </div>
        <div class="metrica">
          <p class="metrica__valor">${destaques}</p>
          <p class="metrica__rotulo">Nos destaques da home</p>
        </div>
      </div>

      ${
        semPreco || semFoto
          ? `<div class="aviso aviso--erro">${ICONE.alerta}<span>
             ${semPreco ? `${semPreco} produto(s) sem preço. ` : ''}
             ${semFoto ? `${semFoto} sem foto. ` : ''}
             Catálogo sem preço vira galeria bonita que não gera conversa.
           </span></div>`
          : ''
      }

      <div>
        <h2 style="margin-bottom:var(--s-3)">Últimos pedidos</h2>
        ${
          dados.leads.length
            ? `<div class="registros">${dados.leads.slice(0, 5).map(cartaoLeadResumo).join('')}</div>`
            : listaVazia('Quando alguém pedir orçamento ou se inscrever num torneio, aparece aqui.')
        }
      </div>

      <div>
        <h2 style="margin-bottom:var(--s-3)">Pendências do briefing</h2>
        <p class="muted small" style="margin-bottom:var(--s-3)">
          Pontos que o briefing marcou como "confirmar com a loja". Enquanto não forem resolvidos,
          o site está no ar com informação provisória.
        </p>
        <div class="pendencias">
          ${dados.config.pendencias.map((p) => `<div class="pendencia"><span>${esc(p)}</span></div>`).join('')}
        </div>
      </div>`;
    },

    produtos() {
      return `
      ${topoSecao('Produtos', 'Preço visível é requisito crítico. Sem preço, o cliente desiste antes de perguntar.', 'produtos')}
      ${
        dados.produtos.length
          ? `<div class="registros">${dados.produtos
              .map((p) =>
                registro({
                  id: p.id,
                  thumb: p.imagem,
                  nome: p.nome,
                  metas: [
                    `<span>${esc(dados.categorias.find((c) => c.slug === p.categoria)?.nome || p.categoria)}</span>`,
                    `<strong style="color:var(--accent)">${reais.format(p.preco)}</strong>`,
                    p.disponibilidade === 'estoque'
                      ? '<span class="selo selo--estoque">Em estoque</span>'
                      : '<span class="selo selo--encomenda">Encomenda</span>',
                    p.destaque ? '<span class="selo selo--desconto">Destaque</span>' : '',
                    p.imagem ? '' : '<span style="color:var(--warn)">Sem foto</span>'
                  ],
                  acoes: botoesItem('produtos', p.id)
                })
              )
              .join('')}</div>`
          : listaVazia('Adicione o primeiro produto para a vitrine sair do zero.')
      }`;
    },

    servicos() {
      return `
      ${topoSecao(
        'Assistência técnica',
        'A frente com maior busca no Google. Prazo e garantia escritos aqui viram argumento de venda.',
        'servicos'
      )}
      ${
        dados.servicos.length
          ? `<div class="registros">${dados.servicos
              .map((s) =>
                registro({
                  id: s.id,
                  thumb: '',
                  nome: s.nome,
                  metas: [
                    `<strong style="color:var(--accent)">${esc(s.faixa)}</strong>`,
                    `<span>Prazo: ${esc(s.prazo)}</span>`,
                    `<span>Garantia: ${esc(s.garantia)}</span>`
                  ],
                  acoes: botoesItem('servicos', s.id)
                })
              )
              .join('')}</div>`
          : listaVazia('Cadastre os serviços que a bancada atende.')
      }

      <div>
        <h2 style="margin-bottom:var(--s-3)">Texto da página</h2>
        <button class="btn btn--contorno btn--sm" type="button" data-acao="bloco" data-bloco="assistenciaInfo">
          Editar chamada e diferenciais
        </button>
      </div>`;
    },

    torneios() {
      return `
      ${topoSecao(
        'Torneios',
        'O diferencial que nenhum concorrente copia. Tire da efemeridade dos stories: aqui ele tem data, regulamento e inscrição.',
        'torneios'
      )}
      ${
        dados.torneios.length
          ? `<div class="registros">${dados.torneios
              .map((t) => {
                const inscritos = dados.leads.filter(
                  (l) => l.tipo === 'inscricao' && l.torneioId === t.id
                ).length;
                return registro({
                  id: t.id,
                  thumb: t.imagem,
                  nome: `${t.nome} — ${t.jogo}`,
                  metas: [
                    `<span>${esc(t.data.split('-').reverse().join('/'))}</span>`,
                    t.status === 'aberto'
                      ? '<span class="selo selo--estoque">Inscrições abertas</span>'
                      : t.status === 'encerrado'
                      ? '<span class="selo selo--encomenda">Encerrado</span>'
                      : '<span class="selo">Rascunho</span>',
                    `<strong>${inscritos}/${t.vagas} inscritos</strong>`
                  ],
                  acoes: botoesItem('torneios', t.id)
                });
              })
              .join('')}</div>`
          : listaVazia('Cadastre a próxima edição para a página sair do vazio.')
      }`;
    },

    equipe() {
      return `
      ${topoSecao('Equipe', 'O time já é conhecido do público. Nome, função e foto real — nunca banco de imagens.', 'equipe')}
      ${
        dados.equipe.length
          ? `<div class="registros">${dados.equipe
              .map((p) =>
                registro({
                  id: p.id,
                  thumb: p.foto,
                  nome: p.nome,
                  metas: [`<span>${esc(p.funcao)}</span>`, p.foto ? '' : '<span style="color:var(--warn)">Sem foto</span>'],
                  acoes: botoesItem('equipe', p.id)
                })
              )
              .join('')}</div>`
          : listaVazia('Cadastre quem atende no balcão.')
      }

      ${topoSecao('Depoimentos', 'Só publique com autorização da pessoa, como pede o briefing.', 'depoimentos')}
      ${
        dados.depoimentos.length
          ? `<div class="registros">${dados.depoimentos
              .map((d) =>
                registro({
                  id: d.id,
                  thumb: d.foto,
                  nome: d.nome,
                  metas: [
                    `<span>${esc(d.texto.slice(0, 70))}${d.texto.length > 70 ? '…' : ''}</span>`,
                    d.aprovado
                      ? '<span class="selo selo--estoque">Publicado</span>'
                      : '<span class="selo selo--encomenda">Rascunho</span>'
                  ],
                  acoes: botoesItem('depoimentos', d.id)
                })
              )
              .join('')}</div>`
          : listaVazia('Você já tem fotos de clientes com a sacola — vire isso em depoimento.')
      }

      <div>
        <h2 style="margin-bottom:var(--s-3)">Texto e fotos da loja</h2>
        <button class="btn btn--contorno btn--sm" type="button" data-acao="bloco" data-bloco="sobreLoja">
          Editar "A loja e o time"
        </button>
      </div>`;
    },

    leads() {
      const filtro = PAINEIS._filtroLead || 'todos';
      const lista =
        filtro === 'todos' ? dados.leads : dados.leads.filter((l) => l.status === filtro || l.tipo === filtro);

      return `
      ${topoSecao('Pedidos recebidos', 'Orçamentos de conserto e inscrições em torneio que chegaram pelo site.', null)}

      <ul class="chips">
        ${[
          { v: 'todos', r: `Todos (${dados.leads.length})` },
          { v: 'novo', r: `Sem resposta (${dados.leads.filter((l) => l.status === 'novo').length})` },
          { v: 'orcamento', r: 'Orçamentos' },
          { v: 'inscricao', r: 'Inscrições' },
          { v: 'atendido', r: 'Atendidos' }
        ]
          .map(
            (f) =>
              `<li><button class="chip" type="button" data-acao="filtro-lead" data-valor="${f.v}"
                        aria-current="${filtro === f.v}">${f.r}</button></li>`
          )
          .join('')}
      </ul>

      ${
        lista.length
          ? `<div class="registros">${lista.map(cartaoLead).join('')}</div>`
          : listaVazia('Nada com esse filtro.')
      }`;
    },

    ajustes() {
      const blocos = [
        { id: 'config', titulo: 'Contato, endereço e horário', texto: 'WhatsApp, endereço e horário aparecem no rodapé, no mapa e nos dados estruturados do Google.' },
        { id: 'pagamento', titulo: 'Pagamento e parcelamento', texto: 'A dúvida número um do varejo de interior. Também alimenta o simulador de parcelas.' },
        { id: 'garantia', titulo: 'Garantia e procedência', texto: 'Transforma o selo das artes em argumento verificável.' },
        { id: 'entrega', titulo: 'Entrega e região', texto: 'Define até onde a loja alcança e abre venda fora de Iguatu.' }
      ];

      return `
      ${topoSecao('Textos e ajustes', 'O que muda aqui reflete no site na hora, sem precisar mexer em código.', null)}
      <div class="registros">
        ${blocos
          .map(
            (b) => `<article class="registro">
          <div class="registro__thumb registro__thumb--vazio">${ICONE.editar}</div>
          <div class="registro__info">
            <p class="registro__nome">${esc(b.titulo)}</p>
            <div class="registro__meta"><span>${esc(b.texto)}</span></div>
          </div>
          <div class="registro__acoes">
            <button class="btn btn--contorno btn--sm" type="button" data-acao="bloco" data-bloco="${b.id}">Editar</button>
          </div>
        </article>`
          )
          .join('')}
      </div>`;
    }
  };

  /* ---------------- Leads ---------------- */
  const TIPO_LEAD = { orcamento: 'Orçamento', inscricao: 'Inscrição' };

  function linkWhats(lead) {
    const numero = String(lead.telefone).replace(/\D/g, '');
    const completo = numero.length <= 11 ? `55${numero}` : numero;
    const msg =
      lead.tipo === 'orcamento'
        ? `Olá, ${lead.nome}! Aqui é da ${dados.config.nome}. Sobre o ${lead.aparelho} que você mandou pelo site:`
        : `Olá, ${lead.nome}! Aqui é da ${dados.config.nome}. Confirmando sua inscrição no ${lead.torneioNome}:`;
    return `https://wa.me/${completo}?text=${encodeURIComponent(msg)}`;
  }

  function cartaoLeadResumo(lead) {
    return registro({
      id: lead.id,
      thumb: '',
      nome: `${lead.nome} — ${TIPO_LEAD[lead.tipo] || lead.tipo}`,
      metas: [
        `<span>${esc(lead.telefone)}</span>`,
        `<span>${new Date(lead.criadoEm).toLocaleString('pt-BR')}</span>`,
        lead.status === 'novo' ? '<span class="selo selo--desconto">Novo</span>' : ''
      ],
      acoes: `<a class="btn btn--wa btn--sm" href="${linkWhats(lead)}" target="_blank" rel="noopener">Responder</a>`
    });
  }

  function cartaoLead(lead) {
    return `<article class="lead lead--${lead.status}">
      <div class="lead__topo">
        <div>
          <strong>${esc(lead.nome)}</strong>
          <span class="muted small"> · ${TIPO_LEAD[lead.tipo] || lead.tipo}</span>
        </div>
        <span class="muted small">${new Date(lead.criadoEm).toLocaleString('pt-BR')}</span>
      </div>

      <dl class="lead__corpo">
        <dt>WhatsApp</dt><dd>${esc(lead.telefone)}</dd>
        ${lead.aparelho ? `<dt>Aparelho</dt><dd>${esc(lead.aparelho)}</dd>` : ''}
        ${lead.problema ? `<dt>Problema</dt><dd>${esc(lead.problema)}</dd>` : ''}
        ${lead.torneioNome ? `<dt>Torneio</dt><dd>${esc(lead.torneioNome)}</dd>` : ''}
        ${lead.nick ? `<dt>Nick</dt><dd>${esc(lead.nick)}</dd>` : ''}
      </dl>

      <div class="lead__acoes">
        <a class="btn btn--wa btn--sm" href="${linkWhats(lead)}" target="_blank" rel="noopener">Responder no WhatsApp</a>
        ${
          lead.status !== 'atendido'
            ? `<button class="btn btn--contorno btn--sm" type="button" data-acao="lead-status" data-id="${lead.id}" data-status="atendido">Marcar como atendido</button>`
            : ''
        }
        ${
          lead.status !== 'perdido'
            ? `<button class="btn btn--contorno btn--sm" type="button" data-acao="lead-status" data-id="${lead.id}" data-status="perdido">Perdido</button>`
            : ''
        }
        <button class="btn-icone btn-icone--perigo" type="button" data-acao="lead-apagar" data-id="${lead.id}"
                aria-label="Apagar pedido">${ICONE.apagar}</button>
      </div>
    </article>`;
  }

  /* ================================================================
     Blocos de configuração
     ================================================================ */
  const CAMPOS_BLOCO = {
    config: (v) => [
      { nome: 'propostaValor', rotulo: 'Frase principal da home', tipo: 'texto-longo', linhas: 2, obrigatorio: true },
      { nome: 'subtitulo', rotulo: 'Linha de apoio', tipo: 'texto-longo', linhas: 2 },
      [
        { nome: 'whatsapp', rotulo: 'WhatsApp (só números, com 55)', obrigatorio: true, dica: 'Ex.: 5588993696758' },
        { nome: 'whatsappExibicao', rotulo: 'Como exibir', dica: 'Ex.: (88) 99369-6758' },
        { nome: 'instagram', rotulo: 'Instagram (sem @)' }
      ],
      [
        { nome: 'endereco', rotulo: 'Endereço', obrigatorio: true },
        { nome: 'bairro', rotulo: 'Bairro' }
      ],
      [
        { nome: 'cidade', rotulo: 'Cidade', obrigatorio: true },
        { nome: 'estado', rotulo: 'UF' },
        { nome: 'cep', rotulo: 'CEP' }
      ],
      { nome: 'mapsQuery', rotulo: 'Busca do Google Maps', dica: 'O que o mapa procura. Confira se cai no ponto certo.' },
      {
        nome: '_horarios',
        rotulo: 'Horário de funcionamento',
        tipo: 'linhas',
        linhas: 4,
        dica: 'Um por linha, no formato: Dia | Horário. Ex.: Sábado | 08h00 às 12h00'
      }
    ],
    pagamento: () => [
      { nome: 'resumo', rotulo: 'Resumo', tipo: 'texto-longo', linhas: 2 },
      [
        { nome: 'maxParcelas', rotulo: 'Máx. de parcelas', tipo: 'number', min: 1 },
        { nome: 'parcelasSemJuros', rotulo: 'Parcelas sem juros', tipo: 'number', min: 0 },
        { nome: 'jurosMes', rotulo: 'Juros ao mês (%)', tipo: 'number', passo: 0.01, min: 0 }
      ],
      { nome: '_formas', rotulo: 'Formas de pagamento', tipo: 'linhas', linhas: 5, dica: 'Uma por linha: Nome | Detalhe' },
      { nome: 'documentos', rotulo: 'Documentos para crediário', tipo: 'linhas', linhas: 4 },
      { nome: '_carneDisponivel', rotulo: 'Tem crediário próprio / carnê', tipo: 'interruptor' },
      { nome: '_carneTexto', rotulo: 'Texto do crediário', tipo: 'texto-longo', linhas: 2 },
      { nome: '_usadoDisponivel', rotulo: 'Aceita aparelho usado na troca', tipo: 'interruptor' },
      { nome: '_usadoTexto', rotulo: 'Texto sobre aparelho usado', tipo: 'texto-longo', linhas: 2 }
    ],
    garantia: () => [
      { nome: 'resumo', rotulo: 'Resumo', tipo: 'texto-longo', linhas: 2 },
      { nome: '_itens', rotulo: 'Garantia por categoria', tipo: 'linhas', linhas: 6, dica: 'Uma por linha: Categoria | Prazo | Como funciona' },
      { nome: 'comoAcionar', rotulo: 'Como acionar', tipo: 'linhas', linhas: 4 },
      { nome: 'politicaTroca', rotulo: 'Política de troca', tipo: 'texto-longo', linhas: 4 }
    ],
    entrega: () => [
      { nome: 'resumo', rotulo: 'Resumo', tipo: 'texto-longo', linhas: 2 },
      [
        { nome: '_localPrazo', rotulo: 'Prazo em Iguatu' },
        { nome: '_localTaxa', rotulo: 'Taxa de entrega' }
      ],
      { nome: '_bairros', rotulo: 'Bairros atendidos', tipo: 'linhas', linhas: 5, dica: 'Um por linha.' },
      { nome: 'cidades', rotulo: 'Cidades atendidas', tipo: 'linhas', linhas: 5 },
      { nome: 'cidadesTexto', rotulo: 'Como funciona fora de Iguatu', tipo: 'texto-longo', linhas: 3 },
      { nome: 'retirada', rotulo: 'Retirada na loja', tipo: 'texto-longo', linhas: 2 }
    ],
    assistenciaInfo: () => [
      { nome: 'chamada', rotulo: 'Chamada principal', obrigatorio: true },
      { nome: 'texto', rotulo: 'Texto de abertura', tipo: 'texto-longo', linhas: 4 },
      { nome: 'diferenciais', rotulo: 'Diferenciais', tipo: 'linhas', linhas: 5 }
    ],
    sobreLoja: () => [
      { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
      { nome: 'texto', rotulo: 'Texto sobre a loja', tipo: 'texto-longo', linhas: 6 },
      { nome: '_foto1', rotulo: 'Foto principal (fachada / interior)', tipo: 'imagem' },
      { nome: '_foto2', rotulo: 'Foto da bancada de assistência', tipo: 'imagem' },
      { nome: '_foto3', rotulo: 'Foto extra', tipo: 'imagem' }
    ]
  };

  /* Converte entre o formato do banco e os campos "achatados" do formulário. */
  const PARA_FORM = {
    config: (v) => ({ ...v, _horarios: v.horarios.map((h) => `${h.dia} | ${h.hora}`) }),
    pagamento: (v) => ({
      ...v,
      _formas: v.formas.map((f) => `${f.nome} | ${f.detalhe}`),
      _carneDisponivel: v.carne.disponivel,
      _carneTexto: v.carne.texto,
      _usadoDisponivel: v.aceitaUsado.disponivel,
      _usadoTexto: v.aceitaUsado.texto
    }),
    garantia: (v) => ({ ...v, _itens: v.itens.map((i) => `${i.categoria} | ${i.prazo} | ${i.detalhe}`) }),
    entrega: (v) => ({
      ...v,
      _localPrazo: v.local.prazo,
      _localTaxa: v.local.taxa,
      _bairros: v.local.bairros
    }),
    assistenciaInfo: (v) => v,
    sobreLoja: (v) => ({ ...v, _foto1: v.fotos[0] || '', _foto2: v.fotos[1] || '', _foto3: v.fotos[2] || '' })
  };

  const partes = (linha, n) => {
    const p = linha.split('|').map((x) => x.trim());
    return Array.from({ length: n }, (_, i) => p[i] || '');
  };

  const DO_FORM = {
    config: (f) => ({
      ...f,
      horarios: (f._horarios || []).map((l) => {
        const [dia, hora] = partes(l, 2);
        return { dia, hora };
      })
    }),
    pagamento: (f) => ({
      ...f,
      formas: (f._formas || []).map((l) => {
        const [nome, detalhe] = partes(l, 2);
        return { nome, detalhe };
      }),
      carne: { disponivel: f._carneDisponivel, texto: f._carneTexto },
      aceitaUsado: { disponivel: f._usadoDisponivel, texto: f._usadoTexto }
    }),
    garantia: (f) => ({
      ...f,
      itens: (f._itens || []).map((l) => {
        const [categoria, prazo, detalhe] = partes(l, 3);
        return { categoria, prazo, detalhe };
      })
    }),
    entrega: (f) => ({
      ...f,
      local: { prazo: f._localPrazo, taxa: f._localTaxa, bairros: f._bairros || [] }
    }),
    assistenciaInfo: (f) => f,
    sobreLoja: (f) => ({ ...f, fotos: [f._foto1, f._foto2, f._foto3].filter(Boolean) })
  };

  const TITULO_BLOCO = {
    config: 'Contato, endereço e horário',
    pagamento: 'Pagamento e parcelamento',
    garantia: 'Garantia e procedência',
    entrega: 'Entrega e região',
    assistenciaInfo: 'Página de assistência técnica',
    sobreLoja: 'A loja e o time'
  };

  function editarBloco(nome) {
    const atual = PARA_FORM[nome](dados[nome]);
    abrirModal(TITULO_BLOCO[nome], CAMPOS_BLOCO[nome](atual), atual, (corpo) =>
      api(`/bloco/${nome}`, { method: 'PUT', body: JSON.stringify(DO_FORM[nome](corpo)) })
    );
  }

  /* ================================================================
     Eventos delegados
     ================================================================ */
  $('.admin-corpo').addEventListener('click', async (ev) => {
    const alvo = ev.target.closest('[data-acao]');
    if (!alvo) return;

    const { acao, colecao, id, bloco, status, valor } = alvo.dataset;

    try {
      if (acao === 'novo') return novoItem(colecao);

      if (acao === 'editar') {
        const item = dados[colecao].find((i) => i.id === Number(id));
        return editarItem(colecao, item);
      }

      if (acao === 'apagar') {
        const item = dados[colecao].find((i) => i.id === Number(id));
        return confirmarRemocao(item.nome, () => api(`/${colecao}/${id}`, { method: 'DELETE' }));
      }

      if (acao === 'bloco') return editarBloco(bloco);

      if (acao === 'filtro-lead') {
        PAINEIS._filtroLead = valor;
        return desenhar('leads');
      }

      if (acao === 'lead-status') {
        await api(`/lista/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        toast(status === 'atendido' ? 'Marcado como atendido.' : 'Marcado como perdido.');
        return carregar();
      }

      if (acao === 'lead-apagar') {
        return confirmarRemocao('este pedido', () => api(`/lista/leads/${id}`, { method: 'DELETE' }));
      }
    } catch (err) {
      if (err.message !== 'sessao') toast(err.message, 'erro');
    }
  });

  /* ================================================================
     Render
     ================================================================ */
  function desenhar(aba) {
    const painel = $(`#painel-${aba}`);
    if (!painel || !dados) return;
    painel.innerHTML = PAINEIS[aba]();
  }

  function esqueleto() {
    $(`#painel-${abaAtiva()}`).innerHTML =
      '<div class="esqueleto">' + '<div class="esqueleto__linha"></div>'.repeat(4) + '</div>';
  }

  async function carregar({ propagar = false } = {}) {
    try {
      dados = await api('/dados');
      desenhar(abaAtiva());
    } catch (err) {
      if (propagar) throw err;
      if (err.message !== 'sessao') toast(err.message, 'erro');
    }
  }

  /* ================================================================
     Início
     ================================================================ */
  (async function iniciar() {
    esqueleto();
    await carregar();
  })();
})();
