/**
 * Ícones em SVG inline (nunca emoji — regra de estilo do sistema de design).
 * Traço herda currentColor para funcionar em qualquer superfície.
 */
const wrap = (path, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${path}</svg>`;

const icons = {
  check: wrap('<path d="M20 6 9 17l-5-5"/>'),
  escudo: wrap('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'),
  selo: wrap('<circle cx="12" cy="8" r="6"/><path d="m8.2 13.5-1.2 8L12 19l5 2.5-1.2-8"/>'),
  relogio: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pin: wrap('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  chave: wrap('<path d="M14.7 6.3a4.5 4.5 0 1 0-5.6 5.6L3 18v3h3l6.1-6.1a4.5 4.5 0 0 0 5.6-5.6l-2.5 2.5-2.1-2.1Z"/>'),
  controle: wrap('<path d="M6 11h4M8 9v4M15 12h.01M17.5 10.5h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/>'),
  celular: wrap('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
  fone: wrap('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="14" width="4" height="6" rx="2"/><rect x="18" y="14" width="4" height="6" rx="2"/>'),
  caixa: wrap('<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  trofeu: wrap('<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M9 20h6M12 14v6"/>'),
  cartao: wrap('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
  caminhao: wrap('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  loja: wrap('<path d="M3 9 4.5 4h15L21 9M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>'),
  usuarios: wrap('<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/>'),
  imagem: wrap('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  alerta: wrap('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'),
  busca: wrap('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  menu: wrap('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  fechar: wrap('<path d="M18 6 6 18M6 6l12 12"/>'),
  seta: wrap('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  instagram: wrap('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'),
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.9 2.4 1.02 2.56c.12.17 1.75 2.67 4.25 3.75.59.25 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.19.21-.58.21-1.08.14-1.19-.06-.11-.22-.17-.47-.29Z"/></svg>'
};

/** Devolve o ícone com classe opcional. */
function icon(nome, classe = '') {
  const svg = icons[nome];
  if (!svg) return '';
  return classe ? svg.replace('<svg ', `<svg class="${classe}" `) : svg;
}

module.exports = { icon, icons };
