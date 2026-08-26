/**
 * Conteúdo inicial do site, extraído do briefing de marca (ago/2026).
 * Contato e endereço são reais; preços, fichas e prazos são EXEMPLOS
 * e devem ser conferidos pela loja em /admin antes de publicar.
 */
module.exports = {
  config: {
    nome: 'Game & Cell',
    assinatura: 'universo da tecnologia',
    propostaValor: 'Console, celular, acessório e conserto no mesmo balcão — no centro de Iguatu.',
    subtitulo: 'Produto original, lacrado e com garantia. Preço na tela, sem "chama no direct pra saber".',
    whatsapp: '5588993696758',
    whatsappExibicao: '(88) 99369-6758',
    instagram: 'gamecell.igt',
    endereco: 'Rua Coronel Mendonça, 275',
    bairro: 'Centro',
    cidade: 'Iguatu',
    estado: 'CE',
    cep: '63500-000',
    mapsQuery: 'Rua Coronel Mendonça, 275, Centro, Iguatu - CE',
    horarios: [
      { dia: 'Segunda a sexta', hora: '08h00 às 18h00' },
      { dia: 'Sábado', hora: '08h00 às 12h00' },
      { dia: 'Domingo', hora: 'Fechado' }
    ],
    pendencias: [
      'A assistência técnica é feita na loja ou terceirizada? Quais aparelhos ela atende?',
      'Existe parcelamento próprio, carnê ou crediário — e qual o limite de parcelas no cartão?',
      'A loja entrega? Em quais bairros e cidades, e com qual prazo?',
      'Aceita aparelho usado na troca?',
      'Quantos itens o catálogo teria de início, e quem ficaria responsável por mantê-lo?',
      'Há intenção de vender online de fato no futuro, ou o WhatsApp segue como canal único?',
      'Existe arquivo vetorial do logo e os códigos de cor oficiais?',
      'Qual o horário de funcionamento, inclusive sábado e véspera de feriado?'
    ]
  },

  pagamento: {
    resumo: 'PIX, dinheiro, débito e crédito em até 12x no cartão. Sem taxa escondida.',
    formas: [
      { nome: 'PIX', detalhe: 'Confirmação na hora. Melhor preço à vista.' },
      { nome: 'Dinheiro', detalhe: 'Preço à vista, direto no balcão.' },
      { nome: 'Cartão de débito', detalhe: 'Todas as bandeiras.' },
      { nome: 'Cartão de crédito', detalhe: 'Até 12x. Juros da operadora acima de 3x.' }
    ],
    maxParcelas: 12,
    parcelasSemJuros: 3,
    jurosMes: 1.99,
    carne: { disponivel: false, texto: 'Crediário próprio / carnê: a confirmar com a loja.' },
    aceitaUsado: {
      disponivel: true,
      texto: 'Aceitamos seu aparelho usado como parte do pagamento. Traga na loja — a avaliação é gratuita e sai na hora.'
    },
    documentos: ['RG ou CNH', 'CPF', 'Comprovante de residência atualizado']
  },

  garantia: {
    resumo: 'Tudo que sai daqui é lacrado, original e com nota fiscal.',
    itens: [
      { categoria: 'Celulares e consoles', prazo: '12 meses de garantia do fabricante', detalhe: 'Atendimento pela rede autorizada da marca. A loja orienta e encaminha.' },
      { categoria: 'Acessórios e áudio', prazo: '3 meses de garantia da loja', detalhe: 'Defeito de fabricação. Troca direta no balcão com a nota.' },
      { categoria: 'Jogos físicos e colecionáveis', prazo: '7 dias para troca', detalhe: 'Mídia lacrada com defeito de leitura.' },
      { categoria: 'Serviço de assistência técnica', prazo: '90 dias sobre o reparo', detalhe: 'Cobre a peça trocada e a mão de obra do mesmo defeito.' }
    ],
    comoAcionar: [
      'Traga o aparelho e a nota fiscal na loja.',
      'A loja abre o chamado e informa o prazo na hora.',
      'Se for caso de rede autorizada, encaminhamos e acompanhamos.'
    ],
    politicaTroca: 'Troca por arrependimento em até 7 dias corridos, com o produto lacrado e a nota fiscal, conforme o Código de Defesa do Consumidor. Produto já aberto só troca em caso de defeito.'
  },

  entrega: {
    resumo: 'Entrega em Iguatu no mesmo dia e envio para as cidades vizinhas.',
    local: {
      prazo: 'Mesmo dia para pedidos até as 16h',
      taxa: 'A partir de R$ 8,00 conforme o bairro',
      bairros: ['Centro', 'Prado', 'Veneza', 'Bugi', 'Alto São Francisco', 'Santo Antônio']
    },
    cidades: ['Iguatu', 'Icó', 'Cedro', 'Acopiara', 'Jucás', 'Várzea Alegre', 'Orós'],
    cidadesTexto: 'Para cidades vizinhas combinamos envio por transportadora ou motoboy — o valor sai no WhatsApp antes de fechar.',
    retirada: 'Retirada na loja é sempre grátis. Separa pelo WhatsApp e busca no balcão.'
  },

  categorias: [
    { slug: 'consoles-e-jogos', nome: 'Consoles e jogos', descricao: 'PlayStation, Xbox, controles originais e jogos físicos.', destaque: true },
    { slug: 'celulares', nome: 'Celulares', descricao: 'Samsung, Apple, LG e realme novos, lacrados e com nota.', destaque: true },
    { slug: 'acessorios', nome: 'Acessórios', descricao: 'Capas, películas, carregadores, cabos e smartwatches.', destaque: true },
    { slug: 'audio', nome: 'Áudio', descricao: 'Caixas de som TWS, fones e headsets gamer.', destaque: false },
    { slug: 'colecionaveis', nome: 'Colecionáveis', descricao: 'Action figures de anime e games.', destaque: false }
  ],

  marcas: ['Samsung', 'Apple', 'LG', 'realme', 'PlayStation', 'Xbox', 'Outras'],

  produtos: [
    {
      id: 1, nome: 'PlayStation 5 Slim 1TB', slug: 'playstation-5-slim-1tb',
      categoria: 'consoles-e-jogos', marca: 'PlayStation',
      preco: 3899, precoAntigo: 4299, parcelas: 12,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'Console novo, lacrado e com nota fiscal. Acompanha um controle DualSense sem fio.',
      ficha: ['SSD de 1TB', 'Saída 4K com até 120fps', 'Controle DualSense incluso', 'Garantia de 12 meses']
    },
    {
      id: 2, nome: 'Xbox Series S 512GB', slug: 'xbox-series-s-512gb',
      categoria: 'consoles-e-jogos', marca: 'Xbox',
      preco: 2199, precoAntigo: null, parcelas: 12,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'O console de entrada da geração. Totalmente digital, compacto e silencioso.',
      ficha: ['SSD de 512GB', 'Até 120fps', 'Totalmente digital', 'Garantia de 12 meses']
    },
    {
      id: 3, nome: 'Controle Xbox sem fio', slug: 'controle-xbox-sem-fio',
      categoria: 'consoles-e-jogos', marca: 'Xbox',
      preco: 449, precoAntigo: 529, parcelas: 6,
      disponibilidade: 'estoque', destaque: false, imagem: '',
      descricao: 'Controle original com selo da Microsoft. Nada de paralelo.',
      ficha: ['Selo Produto Original Microsoft', 'Bluetooth e USB-C', 'Compatível com Series X|S, One e PC', 'Garantia de 12 meses']
    },
    {
      id: 4, nome: 'Headset Gamer GT Orion RGB', slug: 'headset-gamer-gt-orion-rgb',
      categoria: 'audio', marca: 'Outras',
      preco: 189, precoAntigo: 229, parcelas: 4,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'Headset com iluminação RGB e microfone articulado. O mais pedido do balcão.',
      ficha: ['Som surround virtual 7.1', 'Microfone com cancelamento de ruído', 'Iluminação RGB', 'Conexão P2 + USB']
    },
    {
      id: 5, nome: 'Samsung Galaxy A55 5G 256GB', slug: 'samsung-galaxy-a55-5g-256gb',
      categoria: 'celulares', marca: 'Samsung',
      preco: 1899, precoAntigo: 2099, parcelas: 12,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'Novo, na caixa lacrada, com nota fiscal e garantia Samsung.',
      ficha: ['Tela Super AMOLED de 6.6"', '256GB + 8GB de RAM', 'Câmera de 50MP com OIS', 'Bateria de 5000mAh']
    },
    {
      id: 6, nome: 'iPhone 15 128GB', slug: 'iphone-15-128gb',
      categoria: 'celulares', marca: 'Apple',
      preco: 4499, precoAntigo: null, parcelas: 12,
      disponibilidade: 'encomenda', destaque: false, imagem: '',
      descricao: 'Lacrado, com garantia Apple. Sob encomenda — chegou, avisamos no WhatsApp.',
      ficha: ['Tela Super Retina XDR de 6.1"', 'Chip A16 Bionic', 'Câmera principal de 48MP', 'Conector USB-C']
    },
    {
      id: 7, nome: 'realme C67 256GB', slug: 'realme-c67-256gb',
      categoria: 'celulares', marca: 'realme',
      preco: 1149, precoAntigo: 1299, parcelas: 10,
      disponibilidade: 'estoque', destaque: false, imagem: '',
      descricao: 'O custo-benefício que mais sai da loja.',
      ficha: ['Tela de 6.72" a 90Hz', '256GB + 8GB de RAM', 'Câmera de 108MP', 'Carga rápida de 33W']
    },
    {
      id: 8, nome: 'Caixa de Som TWS Pop Lite', slug: 'caixa-de-som-tws-pop-lite',
      categoria: 'audio', marca: 'Outras',
      preco: 129, precoAntigo: 159, parcelas: 3,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'Som alto pro tamanho, bateria que aguenta o dia.',
      ficha: ['Som de alta qualidade', 'Tecnologia TWS — pareia duas caixas', 'Até 6h de autonomia', 'Bluetooth 5.3']
    },
    {
      id: 9, nome: 'Película 3D de vidro temperado', slug: 'pelicula-3d-vidro-temperado',
      categoria: 'acessorios', marca: 'Outras',
      preco: 35, precoAntigo: null, parcelas: 1,
      disponibilidade: 'estoque', destaque: false, imagem: '',
      descricao: 'Aplicação grátis na hora, no balcão. Se bolhar, a gente reaplica.',
      ficha: ['Vidro temperado 9H', 'Bordas 3D que cobrem a tela toda', 'Aplicação gratuita na loja', 'Diversos modelos']
    },
    {
      id: 10, nome: 'Carregador turbo 33W USB-C', slug: 'carregador-turbo-33w-usb-c',
      categoria: 'acessorios', marca: 'Outras',
      preco: 79, precoAntigo: 99, parcelas: 2,
      disponibilidade: 'estoque', destaque: false, imagem: '',
      descricao: 'Carregador com cabo incluso. Nada de fonte genérica que queima bateria.',
      ficha: ['33W de potência', 'Cabo USB-C incluso', 'Proteção contra sobrecarga', 'Garantia de 3 meses']
    },
    {
      id: 11, nome: 'Smartwatch com pulseira extra', slug: 'smartwatch-com-pulseira-extra',
      categoria: 'acessorios', marca: 'Outras',
      preco: 199, precoAntigo: 249, parcelas: 4,
      disponibilidade: 'estoque', destaque: false, imagem: '',
      descricao: 'Acompanha duas pulseiras. Configuramos na loja sem cobrar nada.',
      ficha: ['Tela AMOLED de 1.8"', 'Monitor de batimentos e sono', 'Chamadas por Bluetooth', 'Duas pulseiras inclusas']
    },
    {
      id: 12, nome: 'Action Figure Goku Super Saiyajin', slug: 'action-figure-goku-super-saiyajin',
      categoria: 'colecionaveis', marca: 'Outras',
      preco: 149, precoAntigo: null, parcelas: 3,
      disponibilidade: 'estoque', destaque: true, imagem: '',
      descricao: 'Figure com base e caixa. Presente que resolve aniversário de gamer.',
      ficha: ['Aproximadamente 25cm', 'Base de apoio inclusa', 'Pintura detalhada', 'Caixa com visor']
    }
  ],

  servicos: [
    { id: 1, nome: 'Troca de tela', descricao: 'Display trincado, com mancha ou sem imagem. Trabalhamos com tela original e compatível — você escolhe depois do orçamento.', prazo: '24h a 48h', garantia: '90 dias', faixa: 'A partir de R$ 180,00' },
    { id: 2, nome: 'Troca de bateria', descricao: 'Aparelho descarregando rápido, desligando sozinho ou estufado.', prazo: 'No mesmo dia', garantia: '90 dias', faixa: 'A partir de R$ 120,00' },
    { id: 3, nome: 'Conector de carga', descricao: 'Só carrega em certa posição, não reconhece o cabo ou entrou água.', prazo: '24h', garantia: '90 dias', faixa: 'A partir de R$ 90,00' },
    { id: 4, nome: 'Câmera e microfone', descricao: 'Foto embaçada, câmera não abre, ninguém escuta você na ligação.', prazo: '24h a 48h', garantia: '90 dias', faixa: 'A partir de R$ 110,00' },
    { id: 5, nome: 'Software e desbloqueio', descricao: 'Aparelho travado na logo, lento, cheio de vírus ou precisando de backup.', prazo: 'No mesmo dia', garantia: '30 dias', faixa: 'A partir de R$ 70,00' },
    { id: 6, nome: 'Console — limpeza e reparo', descricao: 'PS4, PS5, Xbox One e Series S: superaquecimento, barulho de cooler, HDMI e leitor de disco.', prazo: '48h a 72h', garantia: '90 dias', faixa: 'A partir de R$ 120,00' }
  ],

  assistenciaInfo: {
    chamada: 'Orçamento sem compromisso',
    texto: 'Você descreve o problema, a gente dá o valor e o prazo antes de encostar no aparelho. Se não valer a pena consertar, a gente fala — mesmo que isso custe a venda.',
    diferenciais: [
      'Bancada própria dentro da loja, no centro de Iguatu',
      'Orçamento sem taxa e sem compromisso',
      '90 dias de garantia sobre o reparo, por escrito na nota',
      'Você acompanha o andamento pelo WhatsApp'
    ]
  },

  torneios: [
    {
      id: 1, nome: 'Torneio Game & Cell #20', jogo: 'EA FC 25',
      data: '2026-09-20', hora: '14h00',
      local: 'Na loja — Rua Coronel Mendonça, 275',
      inscricao: 'R$ 20,00 por jogador',
      premiacao: '1º lugar: R$ 300,00 + troféu · 2º lugar: headset gamer · 3º lugar: vale-compras de R$ 100,00',
      vagas: 32, status: 'aberto', campeao: '', imagem: '',
      regulamento: [
        'Chaveamento em mata-mata, partidas de 6 minutos por tempo.',
        'Times de qualquer liga, sem seleções nacionais.',
        'Inscrição paga no ato, na loja ou por PIX.',
        'Atraso de mais de 10 minutos é W.O.',
        'A decisão da organização na mesa é final.'
      ]
    },
    {
      id: 2, nome: 'Torneio Game & Cell #19', jogo: 'EA FC 25',
      data: '2026-07-19', hora: '14h00',
      local: 'Na loja — Rua Coronel Mendonça, 275',
      inscricao: 'R$ 20,00 por jogador',
      premiacao: '1º lugar: R$ 300,00 + troféu',
      vagas: 32, status: 'encerrado', campeao: 'Cadastre o campeão no painel', imagem: '',
      regulamento: []
    }
  ],

  equipe: [
    {
      id: 1, nome: 'Equipe Game & Cell', funcao: 'Atendimento e vendas', foto: '',
      bio: 'Substitua por nome, função e foto real de cada pessoa do balcão em /admin. O time já é conhecido do público — é o maior ativo da marca.'
    }
  ],

  sobreLoja: {
    titulo: 'A loja verde do centro',
    texto: 'A Game & Cell fica na Rua Coronel Mendonça, 275, no centro de Iguatu. Letreiro verde, parede verde atrás das prateleiras e a parede inteira de capas e películas que aparece em quase todo vídeo. Aqui você entra pra comprar um cabo e sai sabendo o nome de quem te atendeu.',
    fotos: []
  },

  depoimentos: [
    {
      id: 1, nome: 'Cliente Game & Cell', cidade: 'Iguatu — CE', foto: '', aprovado: true,
      texto: 'Substitua por depoimentos reais em /admin — o briefing pede nome, foto e autorização.'
    }
  ],

  leads: [],
  usuarios: []
};
