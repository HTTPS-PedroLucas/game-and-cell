/* Site público — só o essencial. Tudo que dá para renderizar no servidor
   já vem pronto do servidor; aqui fica menu, simulador e os dois formulários. */
(() => {
  'use strict';

  const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)');

  /* ================================================================
     Animação de entrada e de rolagem

     Sem biblioteca: IntersectionObserver + transição CSS dão o mesmo
     resultado que GSAP+ScrollTrigger para este caso, sem os ~50KB de
     CDN — e velocidade em 4G é requisito crítico do briefing.
     Só transform e opacity são animados (não disparam layout).
     ================================================================ */
  function iniciarAnimacoes() {
    const raiz = document.documentElement;
    if (!raiz.classList.contains('anim')) return;

    // Quem pedir menos movimento recebe o estado final, sem transição.
    if (menosMovimento.matches) {
      raiz.classList.remove('anim');
      return;
    }

    /* A entrada da primeira tela é 100% CSS (@keyframes com fill "backwards").
       Nada de classe via requestAnimationFrame: rAF não roda em aba oculta e
       deixaria o hero invisível para quem abre o link em segundo plano. */

    /* --- Cascata: numera os filhos dos grupos para escalonar o atraso --- */
    document.querySelectorAll('[data-revelar-grupo]').forEach((grupo) => {
      Array.from(grupo.children).forEach((filho, i) => {
        // Além de ~8 itens a cascata começa a parecer lenta; o resto entra junto.
        filho.style.setProperty('--i', Math.min(i, 7));
        if (!filho.hasAttribute('data-revelar')) filho.setAttribute('data-revelar', '');
      });
    });

    /* --- Revelação na rolagem --- */
    const alvos = document.querySelectorAll('[data-revelar], .filete-marca');
    if (!('IntersectionObserver' in window)) {
      alvos.forEach((el) => el.classList.add('visivel'));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('visivel');
          observador.unobserve(e.target); // anima uma vez só, não fica indo e voltando
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );

    alvos.forEach((el) => observador.observe(el));

    /* Rede de segurança: conteúdo escondido esperando um evento é a única forma
       de o site sumir da tela. Se em 2,5s algo dentro da janela ainda não foi
       revelado, revela na marra. Custa uma varredura e elimina a classe inteira
       de bug "a página abriu em branco". */
    setTimeout(() => {
      alvos.forEach((el) => {
        if (el.classList.contains('visivel')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          el.classList.add('visivel');
          observador.unobserve(el);
        }
      });
    }, 2500);
  }

  /* ================================================================
     Paralaxe dos elementos decorativos do hero
     Só enfeites — nunca texto ou controle, por conforto de leitura.
     ================================================================ */
  function iniciarParallax() {
    if (menosMovimento.matches) return;

    const camadas = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!camadas.length) return;

    let pendente = false;

    const atualizar = () => {
      pendente = false;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.5) return; // fora de vista, não gasta cálculo
      camadas.forEach((el) => {
        const fator = parseFloat(el.dataset.parallax) || 0;
        el.style.setProperty('--parallax-y', `${(y * fator).toFixed(1)}px`);
      });
    };

    // rAF evita rodar o cálculo mais de uma vez por quadro
    addEventListener(
      'scroll',
      () => {
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(atualizar);
      },
      { passive: true }
    );

    atualizar();
  }

  /* ================================================================
     Cabeçalho ganha corpo depois de sair do topo
     ================================================================ */
  function iniciarCabecalho() {
    const cabecalho = document.querySelector('.cabecalho');
    if (!cabecalho) return;

    let pendente = false;
    let anterior = window.scrollY;
    const atualizar = () => {
      pendente = false;
      const atual = window.scrollY;
      const menuAberto = document.querySelector('.nav.aberto');
      cabecalho.classList.toggle('rolado', atual > 8);
      cabecalho.classList.toggle('cabecalho--oculto', atual > 180 && atual > anterior + 3 && !menuAberto);
      anterior = atual;
    };

    addEventListener(
      'scroll',
      () => {
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(atualizar);
      },
      { passive: true }
    );

    atualizar();
  }

  /* ================================================================
     Progresso, palco do hero e transição de saída entre páginas
     ================================================================ */
  function iniciarProgresso() {
    const barra = document.querySelector('.progresso-scroll span');
    if (!barra) return;

    let pendente = false;
    const atualizar = () => {
      pendente = false;
      const total = document.documentElement.scrollHeight - innerHeight;
      const progresso = total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0;
      barra.style.transform = `scaleX(${progresso})`;
    };

    addEventListener('scroll', () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(atualizar);
    }, { passive: true });
    addEventListener('resize', atualizar, { passive: true });
    atualizar();
  }

  function iniciarPalcoHero() {
    if (menosMovimento.matches || !matchMedia('(pointer: fine)').matches) return;
    const palco = document.querySelector('[data-palco]');
    if (!palco) return;

    palco.addEventListener('pointermove', (ev) => {
      const r = palco.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      palco.style.setProperty('--palco-x', `${(x * 10).toFixed(2)}deg`);
      palco.style.setProperty('--palco-y', `${(-y * 8).toFixed(2)}deg`);
      palco.style.setProperty('--luz-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      palco.style.setProperty('--luz-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    palco.addEventListener('pointerleave', () => {
      palco.style.setProperty('--palco-x', '0deg');
      palco.style.setProperty('--palco-y', '0deg');
      palco.style.setProperty('--luz-x', '50%');
      palco.style.setProperty('--luz-y', '50%');
    });
  }

  function iniciarTransicoesPagina() {
    addEventListener('pageshow', () => document.body.classList.remove('saindo'));

    document.addEventListener('click', (ev) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const link = ev.target.closest('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;

      const destino = new URL(link.href, location.href);
      if (destino.origin !== location.origin || destino.protocol !== location.protocol) return;
      if (destino.pathname === location.pathname && destino.search === location.search && destino.hash) return;

      ev.preventDefault();
      document.body.classList.add('saindo');
      setTimeout(() => location.assign(destino.href), menosMovimento.matches ? 0 : 320);
    });
  }

  iniciarAnimacoes();
  iniciarParallax();
  iniciarCabecalho();
  iniciarProgresso();
  iniciarPalcoHero();
  iniciarTransicoesPagina();

  // Se a pessoa mudar a preferência de movimento com a página aberta, respeita na hora.
  menosMovimento.addEventListener('change', (ev) => {
    if (ev.matches) {
      document.documentElement.classList.remove('anim');
      document.querySelectorAll('[data-parallax]').forEach((el) => el.style.removeProperty('--parallax-y'));
    }
  });

  /* ---------------- Menu no celular ---------------- */
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('navPrincipal');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const aberto = nav.classList.toggle('aberto');
      toggle.setAttribute('aria-expanded', String(aberto));
      toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });

    // Esc fecha e devolve o foco ao botão — navegação por teclado.
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && nav.classList.contains('aberto')) {
        nav.classList.remove('aberto');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------------- Utilidades ---------------- */
  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function mostrarErros(erros, form) {
    form.querySelectorAll('.campo__erro').forEach((el) => {
      el.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

    let primeiro = null;
    Object.entries(erros || {}).forEach(([campo, msg]) => {
      const alvo = document.getElementById(campo);
      const caixa = document.getElementById(`erro-${campo}`);
      if (caixa) caixa.textContent = msg;
      if (alvo) {
        alvo.setAttribute('aria-invalid', 'true');
        if (!primeiro) primeiro = alvo;
      }
    });
    // Erro perto do campo e foco no primeiro problema — não só um resumo no topo.
    if (primeiro) primeiro.focus();
  }

  function aviso(destino, tipo, texto) {
    destino.innerHTML = `<div class="aviso aviso--${tipo}" style="margin-top:var(--s-4)"><span>${texto}</span></div>`;
  }

  async function enviar(url, dados) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resp.json().catch(() => ({}));
    return { ok: resp.ok, corpo };
  }

  /* ---------------- Simulador de parcelas ---------------- */
  const sim = document.querySelector('.simulador');
  if (sim) {
    const valor = document.getElementById('simValor');
    const parcelas = document.getElementById('simParcelas');
    const saidaN = document.getElementById('simParcelasSaida');
    const saida = document.getElementById('simSaida');
    const total = document.getElementById('simTotal');
    const whats = document.getElementById('simWhats');

    const juros = Number(sim.dataset.juros) || 0;
    const semJuros = Number(sim.dataset.semJuros) || 0;
    const baseWhats = whats.href.split('?')[0];

    function calcular() {
      const v = Math.max(0, Number(valor.value) || 0);
      const n = Math.max(1, Number(parcelas.value) || 1);
      saidaN.textContent = n;

      let porMes;
      if (n <= semJuros || !juros) {
        porMes = v / n;
      } else {
        const i = juros / 100;
        porMes = (v * i) / (1 - Math.pow(1 + i, -n));
      }

      saida.textContent = `${n}x de ${reais.format(porMes)}`;
      total.textContent =
        n <= semJuros
          ? 'Sem juros. Total: ' + reais.format(v)
          : 'Total com juros: ' + reais.format(porMes * n);

      const msg = `Olá! Simulei no site: ${reais.format(v)} em ${n}x de ${reais.format(porMes)}. Confere?`;
      whats.href = `${baseWhats}?text=${encodeURIComponent(msg)}`;
    }

    valor.addEventListener('input', calcular);
    parcelas.addEventListener('input', calcular);
    calcular();
  }

  /* ---------------- Orçamento de assistência ---------------- */
  const formOrcamento = document.getElementById('formOrcamento');
  if (formOrcamento) {
    const resposta = document.getElementById('respostaOrcamento');
    const botao = formOrcamento.querySelector('button[type="submit"]');
    const textoOriginal = botao.innerHTML;

    formOrcamento.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      botao.disabled = true;
      botao.textContent = 'Enviando...';
      resposta.innerHTML = '';

      const dados = Object.fromEntries(new FormData(formOrcamento).entries());
      const { ok, corpo } = await enviar('/api/orcamento', dados);

      botao.disabled = false;
      botao.innerHTML = textoOriginal;

      if (!ok) {
        if (corpo.erros) mostrarErros(corpo.erros, formOrcamento);
        aviso(resposta, 'erro', corpo.erro || 'Confira os campos marcados acima.');
        return;
      }

      mostrarErros({}, formOrcamento);
      aviso(
        resposta,
        'ok',
        'Pedido registrado! Estamos abrindo seu WhatsApp com a mensagem pronta. ' +
          `Se não abrir, <a href="${corpo.whatsappUrl}" rel="noopener">toque aqui</a>.`
      );
      formOrcamento.reset();
      window.open(corpo.whatsappUrl, '_blank', 'noopener');
    });
  }

  /* ---------------- Inscrição em torneio ---------------- */
  const formInscricao = document.getElementById('formInscricao');
  if (formInscricao) {
    const resposta = document.getElementById('respostaInscricao');
    const botao = formInscricao.querySelector('button[type="submit"]');
    const textoOriginal = botao.innerHTML;

    formInscricao.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      botao.disabled = true;
      botao.textContent = 'Enviando...';
      resposta.innerHTML = '';

      const dados = Object.fromEntries(new FormData(formInscricao).entries());
      dados.torneioId = formInscricao.dataset.torneio;

      const { ok, corpo } = await enviar('/api/inscricao', dados);

      botao.disabled = false;
      botao.innerHTML = textoOriginal;

      if (!ok) {
        if (corpo.erros) mostrarErros(corpo.erros, formInscricao);
        aviso(resposta, 'erro', corpo.erro || 'Confira os campos marcados acima.');
        return;
      }

      mostrarErros({}, formInscricao);
      const vagas =
        typeof corpo.vagasRestantes === 'number' ? ` Restam ${corpo.vagasRestantes} vagas.` : '';
      aviso(
        resposta,
        'ok',
        `${corpo.mensagem}${vagas} <a href="${corpo.whatsappUrl}" rel="noopener">Abrir o WhatsApp</a>.`
      );
      formInscricao.reset();
      window.open(corpo.whatsappUrl, '_blank', 'noopener');
    });
  }
})();
