/** Helpers compartilhados entre as views e as rotas. */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto vindo do painel antes de injetar no HTML. */
function e(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/** Junta pedaços de HTML ignorando null/false — deixa os templates legíveis. */
function join(parts, separator = '\n') {
  return parts.filter(Boolean).join(separator);
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Parcela com juros compostos da operadora acima do limite sem juros.
 * Abaixo do limite, divide direto.
 */
function parcela(total, n, jurosMes = 0, semJuros = 3) {
  const valor = Number(total);
  const vezes = Math.max(1, Number(n) || 1);
  if (vezes <= semJuros || !jurosMes) return valor / vezes;
  const i = jurosMes / 100;
  return (valor * i) / (1 - Math.pow(1 + i, -vezes));
}

/** Monta o link do WhatsApp já com a mensagem escrita — requisito CRÍTICO do briefing. */
function whatsapp(numero, mensagem) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function dataBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).split('-');
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function dataExtenso(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).split('-').map(Number);
  if (!ano || !mes || !dia) return String(iso);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

module.exports = { e, join, money, parcela, whatsapp, slugify, dataBR, dataExtenso };
