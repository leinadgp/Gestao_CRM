// Interpreta o texto livre de "horário de funcionamento" (ex: "08:00 às 17:00",
// "Seg a Sex, 08:00 - 17:00", "8h às 17h", ou com intervalo de almoço:
// "08:00 às 11:30 e 13:30 às 16:00") e permite avisar quando o órgão
// provavelmente está fora do horário de atendimento — sem precisar de um campo
// estruturado novo. Se não conseguir interpretar o texto, não afirma nada
// (retorna null) em vez de arriscar um aviso errado.

function paraMinutos(horaStr, minutoStr) {
  const h = parseInt(horaStr, 10);
  const m = minutoStr ? parseInt(minutoStr, 10) : 0;
  if (Number.isNaN(h) || h > 23 || Number.isNaN(m) || m > 59) return null;
  return h * 60 + m;
}

/**
 * Extrai todos os horários do texto (HH:MM, HHhMM ou HHh) e agrupa em pares
 * sequenciais (1º+2º = faixa 1, 3º+4º = faixa 2, ...). Suporta múltiplas
 * faixas no mesmo texto (ex: manhã + tarde com intervalo de almoço).
 * Retorna um array de { inicio, fim } (minutos do dia) — vazio se não
 * conseguir reconhecer nenhuma faixa válida.
 */
export function parseFaixasHorarioFuncionamento(texto) {
  if (!texto || typeof texto !== 'string') return [];
  const regexHora = /(\d{1,2})[:h](\d{2})?/g;
  const encontrados = [];
  let m;
  while ((m = regexHora.exec(texto)) !== null) {
    const minutos = paraMinutos(m[1], m[2]);
    if (minutos != null) encontrados.push(minutos);
  }
  const faixas = [];
  for (let i = 0; i + 1 < encontrados.length; i += 2) {
    const inicio = encontrados[i];
    const fim = encontrados[i + 1];
    if (fim > inicio) faixas.push({ inicio, fim }); // descarta par ambíguo, mas continua nos próximos
  }
  return faixas;
}

/** Mantido por compatibilidade: retorna só a primeira faixa reconhecida, ou null. */
export function parseHorarioFuncionamento(texto) {
  const faixas = parseFaixasHorarioFuncionamento(texto);
  return faixas[0] || null;
}

/**
 * Retorna true se, pela hora atual, o órgão provavelmente está fora do
 * expediente (fora de TODAS as faixas reconhecidas); false se está dentro de
 * alguma; null se não dá pra saber (texto vazio, não reconhecido, etc.) —
 * nesse caso a interface não deve exibir nenhum aviso.
 */
export function estaForaDoHorario(textoHorario, dataRef = new Date()) {
  const faixas = parseFaixasHorarioFuncionamento(textoHorario);
  if (!faixas.length) return null;

  const diaSemana = dataRef.getDay(); // 0=domingo, 6=sábado
  if (diaSemana === 0 || diaSemana === 6) return true;

  const minutosAgora = dataRef.getHours() * 60 + dataRef.getMinutes();
  const dentroDeAlgumaFaixa = faixas.some((f) => minutosAgora >= f.inicio && minutosAgora < f.fim);
  return !dentroDeAlgumaFaixa;
}
