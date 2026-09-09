// Formatação de datas e horas do sistema — SEMPRE no fuso de Brasília.
//
// O motivo de existir um módulo só pra isso: `toLocaleString('pt-BR')` sem
// `timeZone` usa o fuso do navegador de quem está olhando. Numa equipe toda no
// Brasil isso passa despercebido, mas basta um computador com fuso errado (ou
// um servidor renderizando) pra mesma inscrição aparecer com hora diferente
// pra pessoas diferentes. Fixando America/Sao_Paulo, o que a tela mostra é o
// horário de Brasília independente de onde está sendo aberta.

export const FUSO_BRASILIA = 'America/Sao_Paulo';

/** Detecta uma data "pura" (YYYY-MM-DD, sem hora). */
function ehDataPura(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/**
 * Data no formato dd/mm/aaaa, no fuso de Brasília.
 *
 * Datas puras ("2026-07-15") NÃO passam por conversão de fuso: `new Date()`
 * as interpreta como meia-noite UTC, e converter isso pra Brasília (UTC-3)
 * resulta em 21h do dia ANTERIOR — a data apareceria um dia atrasada. Nesses
 * casos só reordenamos o texto.
 */
export function formatarDataBR(valor, vazio = '-') {
  if (!valor) return vazio;
  if (ehDataPura(valor)) {
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return vazio;
  return data.toLocaleDateString('pt-BR', {
    timeZone: FUSO_BRASILIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Data e hora (dd/mm/aaaa HH:MM) no fuso de Brasília.
 *
 * Uma data pura não tem hora nenhuma pra mostrar — inventar "00:00" sugeriria
 * uma precisão que o dado não tem, então cai pra data seca.
 */
export function formatarDataHoraBR(valor, vazio = '-') {
  if (!valor) return vazio;
  if (ehDataPura(valor)) return formatarDataBR(valor, vazio);
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return vazio;
  return data.toLocaleString('pt-BR', {
    timeZone: FUSO_BRASILIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Versão compacta (dd/mm/aa HH:MM) pra listas densas, onde o ano com 4 dígitos
 * rouba espaço de colunas mais informativas.
 */
export function formatarDataHoraCurtaBR(valor, vazio = '—') {
  if (!valor) return vazio;
  if (ehDataPura(valor)) {
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano.slice(2)}`;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return vazio;
  return data.toLocaleString('pt-BR', {
    timeZone: FUSO_BRASILIA,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
