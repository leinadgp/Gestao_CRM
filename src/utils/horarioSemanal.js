// Horário de funcionamento POR DIA DA SEMANA.
//
// Antes existia um campo de texto livre só ("08:00 às 17:00") e o sistema
// assumia que toda prefeitura atende de segunda a sexta no mesmo horário. Na
// prática muitas atendem segunda a quinta num horário e sexta em outro, e há as
// que só abrem em alguns dias. Este módulo é a fonte da verdade dessa estrutura:
// o texto legível continua existindo, mas passa a ser GERADO a partir daqui.
//
// Formato canônico:
//   { seg: [{ inicio: '08:00', fim: '17:00' }], sex: [], ... }
// Dia ausente ou com lista vazia = não atende naquele dia.

import { estaForaDoHorario } from './horarioFuncionamento.js';

export const DIAS_SEMANA = [
  { chave: 'seg', curto: 'Seg', nome: 'Segunda', indice: 1, util: true },
  { chave: 'ter', curto: 'Ter', nome: 'Terça', indice: 2, util: true },
  { chave: 'qua', curto: 'Qua', nome: 'Quarta', indice: 3, util: true },
  { chave: 'qui', curto: 'Qui', nome: 'Quinta', indice: 4, util: true },
  { chave: 'sex', curto: 'Sex', nome: 'Sexta', indice: 5, util: true },
  { chave: 'sab', curto: 'Sáb', nome: 'Sábado', indice: 6, util: false },
  { chave: 'dom', curto: 'Dom', nome: 'Domingo', indice: 0, util: false },
];

export const CHAVES_DIAS = DIAS_SEMANA.map((d) => d.chave);
export const CHAVES_DIAS_UTEIS = DIAS_SEMANA.filter((d) => d.util).map((d) => d.chave);

const POR_INDICE_JS = DIAS_SEMANA.reduce((acc, d) => ({ ...acc, [d.indice]: d.chave }), {});

/** Máximo de faixas por dia (manhã e tarde, com intervalo de almoço no meio). */
export const MAX_FAIXAS_POR_DIA = 2;

// ---------------------------------------------------------------------------
// Horas
// ---------------------------------------------------------------------------

/**
 * Normaliza o que a pessoa digitou para "HH:MM", ou '' se não der pra
 * entender. Aceita as formas que aparecem no dia a dia: 8, 08, 8h, 8h30,
 * 830, 0830, 8:3, 08:00.
 *
 * Existe pra que o campo de hora possa ser um input de texto comum — sem
 * setinhas e sem máscara agressiva —, corrigindo o valor quando a pessoa sai
 * do campo em vez de brigar com ela enquanto digita.
 */
export function normalizarHora(entrada) {
  if (entrada == null) return '';
  const texto = String(entrada).trim().toLowerCase();
  if (!texto) return '';

  const comSeparador = /^(\d{1,2})\s*[h:.]\s*(\d{1,2})?$/.exec(texto);
  let horas;
  let minutos;

  if (comSeparador) {
    horas = Number(comSeparador[1]);
    minutos = comSeparador[2] != null ? Number(comSeparador[2]) : 0;
  } else {
    const digitos = texto.replace(/\D/g, '');
    if (!digitos || digitos.length > 4) return '';
    if (digitos.length <= 2) {
      horas = Number(digitos);
      minutos = 0;
    } else if (digitos.length === 3) {
      horas = Number(digitos.slice(0, 1));
      minutos = Number(digitos.slice(1));
    } else {
      horas = Number(digitos.slice(0, 2));
      minutos = Number(digitos.slice(2));
    }
  }

  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return '';
  if (horas > 23 || minutos > 59) return '';
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** "08:30" -> 510 minutos. Retorna null se a hora não for válida. */
export function horaParaMinutos(hora) {
  const normalizada = normalizarHora(hora);
  if (!normalizada) return null;
  const [h, m] = normalizada.split(':').map(Number);
  return h * 60 + m;
}

/** Sugestões do dropdown do campo de hora — os horários que de fato aparecem. */
export const HORARIOS_SUGERIDOS = [
  '07:00', '07:30', '08:00', '08:30', '09:00',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

// ---------------------------------------------------------------------------
// Estrutura semanal
// ---------------------------------------------------------------------------

/** Estrutura vazia com todos os dias, sem nenhum atendimento. */
export function semanaVazia() {
  return CHAVES_DIAS.reduce((acc, chave) => ({ ...acc, [chave]: [] }), {});
}

/**
 * Aceita qualquer coisa (objeto, string JSON, lixo) e devolve a estrutura
 * canônica. Descarta faixa sem início/fim, com fim <= início, e o que passar do
 * limite de faixas por dia. Nunca lança.
 */
export function normalizarSemana(valor) {
  let bruto = valor;
  if (typeof bruto === 'string' && bruto.trim()) {
    try { bruto = JSON.parse(bruto); } catch { return semanaVazia(); }
  }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return semanaVazia();

  const resultado = semanaVazia();
  CHAVES_DIAS.forEach((chave) => {
    const faixasBrutas = Array.isArray(bruto[chave]) ? bruto[chave] : [];
    const faixas = [];
    faixasBrutas.forEach((faixa) => {
      if (faixas.length >= MAX_FAIXAS_POR_DIA) return;
      const inicio = normalizarHora(faixa?.inicio);
      const fim = normalizarHora(faixa?.fim);
      if (!inicio || !fim) return;
      if (horaParaMinutos(fim) <= horaParaMinutos(inicio)) return;
      faixas.push({ inicio, fim });
    });
    faixas.sort((a, b) => horaParaMinutos(a.inicio) - horaParaMinutos(b.inicio));
    resultado[chave] = faixas;
  });
  return resultado;
}

/** Há pelo menos um dia com atendimento? */
export function semanaTemAlgum(semana) {
  const norm = normalizarSemana(semana);
  return CHAVES_DIAS.some((chave) => norm[chave].length > 0);
}

function faixasIguais(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((faixa, i) => faixa.inicio === b[i].inicio && faixa.fim === b[i].fim);
}

function textoFaixas(faixas) {
  return faixas.map((f) => `${f.inicio} às ${f.fim}`).join(' e ');
}

/**
 * Gera o texto legível que fica salvo em `empresas.horario_funcionamento`,
 * agrupando dias consecutivos com o mesmo horário:
 *   "Seg a Qui 08:00 às 17:00 · Sex 08:00 às 12:00"
 *
 * É esse texto que as telas antigas, a exportação e o CSV continuam lendo — o
 * JSON é detalhe interno de quem sabe que ele existe.
 */
export function montarTextoSemanal(semana) {
  const norm = normalizarSemana(semana);
  const grupos = [];

  CHAVES_DIAS.forEach((chave) => {
    const faixas = norm[chave];
    if (!faixas.length) return;
    const ultimo = grupos[grupos.length - 1];
    const dia = DIAS_SEMANA.find((d) => d.chave === chave);
    // Só agrupa dias vizinhos na ordem da semana — "Seg e Qua" com o mesmo
    // horário não pode virar "Seg a Qua", que incluiria a terça.
    const ehVizinho = ultimo && CHAVES_DIAS.indexOf(chave) === CHAVES_DIAS.indexOf(ultimo.dias[ultimo.dias.length - 1]) + 1;
    if (ultimo && ehVizinho && faixasIguais(ultimo.faixas, faixas)) {
      ultimo.dias.push(chave);
      ultimo.rotulos.push(dia.curto);
    } else {
      grupos.push({ dias: [chave], rotulos: [dia.curto], faixas });
    }
  });

  if (!grupos.length) return '';

  return grupos
    .map((grupo) => {
      const { rotulos } = grupo;
      let rotuloDias;
      if (rotulos.length === 1) rotuloDias = rotulos[0];
      else if (rotulos.length === 2) rotuloDias = `${rotulos[0]} e ${rotulos[1]}`;
      else rotuloDias = `${rotulos[0]} a ${rotulos[rotulos.length - 1]}`;
      return `${rotuloDias} ${textoFaixas(grupo.faixas)}`;
    })
    .join(' · ');
}

// ---------------------------------------------------------------------------
// Leitura de texto colado
// ---------------------------------------------------------------------------

const APELIDOS_DIAS = [
  ['dom', ['domingo', 'dom']],
  ['seg', ['segunda-feira', 'segunda feira', 'segunda', 'seg', '2a', '2ª']],
  ['ter', ['terca-feira', 'terca feira', 'terca', 'ter', '3a', '3ª']],
  ['qua', ['quarta-feira', 'quarta feira', 'quarta', 'qua', '4a', '4ª']],
  ['qui', ['quinta-feira', 'quinta feira', 'quinta', 'qui', '5a', '5ª']],
  ['sex', ['sexta-feira', 'sexta feira', 'sexta', 'sex', '6a', '6ª']],
  ['sab', ['sabado', 'sab']],
];

// Faixa dos diacríticos combinantes que o NFD separa das letras — escrita por
// código pra não depender de o arquivo estar salvo em UTF-8 em toda ferramenta.
const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function semAcento(texto) {
  return String(texto).normalize('NFD').replace(DIACRITICOS, '');
}

/**
 * Encontra menções a dias no trecho, em ordem de aparição, guardando onde a
 * palavra começa e termina — o texto ENTRE dois dias é o que diz se são dois
 * dias avulsos ("seg e qua") ou um intervalo ("seg a qua").
 */
function acharDias(trecho) {
  const achados = [];
  APELIDOS_DIAS.forEach(([chave, apelidos]) => {
    apelidos.forEach((apelido) => {
      const regex = new RegExp(`(^|[^a-z0-9])(${apelido})([^a-z0-9]|$)`, 'g');
      let m;
      while ((m = regex.exec(trecho)) !== null) {
        const inicio = m.index + m[1].length;
        achados.push({ chave, inicio, fim: inicio + m[2].length });
      }
    });
  });
  achados.sort((a, b) => a.inicio - b.inicio);
  // Um mesmo dia pode casar com mais de um apelido ("segunda" casa com
  // "segunda" e depois "seg" não casa por causa das bordas, mas garantimos).
  const vistos = new Set();
  return achados.filter(({ chave }) => {
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/** Expande "seg a sex" / "seg-sex" para todos os dias do intervalo. */
function expandirIntervalo(trecho, diasAchados) {
  if (diasAchados.length !== 2) return null;
  const entre = trecho.slice(diasAchados[0].fim, diasAchados[1].inicio);
  if (!/^\s*(a|ate|-|as|\/)\s*$/.test(entre)) return null;
  const de = CHAVES_DIAS.indexOf(diasAchados[0].chave);
  const ate = CHAVES_DIAS.indexOf(diasAchados[1].chave);
  if (de < 0 || ate < 0 || ate < de) return null;
  return CHAVES_DIAS.slice(de, ate + 1);
}

/** Extrai as horas do trecho, na ordem em que aparecem. */
function acharHoras(trecho) {
  const regex = /(\d{1,2})\s*(?::|h)\s*(\d{2})?|(?<![\d:h])(\d{1,2})\s*(?=\s*(?:as|às|a|ate|até|-)\s*\d)/g;
  const horas = [];
  let m;
  while ((m = regex.exec(trecho)) !== null) {
    const bruta = m[1] != null ? `${m[1]}:${m[2] ?? '00'}` : m[3];
    const hora = normalizarHora(bruta);
    if (hora) horas.push({ hora, posicao: m.index, tinhaSeparador: m[1] != null });
  }
  return horas;
}

/**
 * Interpreta um texto de horário escrito à mão e devolve o que conseguiu
 * entender — e, explicitamente, o que NÃO conseguiu.
 *
 * A regra que guia tudo aqui: nunca inventar. Um trecho ambíguo ("sexta até
 * 12h", que não diz a hora de abrir) entra em `diasIncertos` pra tela poder
 * destacar aquele dia e pedir conferência, em vez de chutar um início.
 *
 * Retorna { semana, diasIncertos, entendeuAlgo }.
 */
export function interpretarTextoHorario(texto) {
  const vazio = { semana: semanaVazia(), diasIncertos: [], entendeuAlgo: false };
  if (!texto || typeof texto !== 'string') return vazio;

  const limpo = semAcento(texto.toLowerCase()).replace(/\s+/g, ' ').trim();
  if (!limpo) return vazio;

  // Quebra em trechos por separadores fortes, e por vírgula/"e" apenas quando o
  // que vem depois começa citando um dia (senão quebraria "08:00 às 11:30 e
  // 13:30 às 16:00", que é uma coisa só).
  const trechos = limpo
    .split(/[;|·•\n]+|,\s*(?=[a-z0-9])|\s+e\s+(?=(?:seg|ter|qua|qui|sex|sab|dom|2a|3a|4a|5a|6a))/)
    .map((t) => t.trim())
    .filter(Boolean);

  const semana = semanaVazia();
  const diasIncertos = new Set();
  const diasDefinidos = new Set();
  const trechosSemDia = [];
  let entendeuAlgo = false;

  function aplicar(chaves, faixas) {
    chaves.forEach((chave) => {
      if (!CHAVES_DIAS.includes(chave)) return;
      semana[chave] = faixas.map((f) => ({ ...f }));
      diasDefinidos.add(chave);
    });
  }

  function faixasDoTrecho(trecho) {
    const horas = acharHoras(trecho);
    const faixas = [];
    for (let i = 0; i + 1 < horas.length; i += 2) {
      const inicio = horas[i].hora;
      const fim = horas[i + 1].hora;
      if (horaParaMinutos(fim) > horaParaMinutos(inicio)) faixas.push({ inicio, fim });
    }
    const sobrou = horas.length % 2 === 1;
    return { faixas: faixas.slice(0, MAX_FAIXAS_POR_DIA), sobrou, tinhaHora: horas.length > 0 };
  }

  // Dias já citados mas ainda sem horário. Cobrem o jeito natural de escrever
  // uma lista: "Segunda, quarta e sexta: 9h às 15h" chega aqui partido em três
  // trechos, e os dois primeiros só fazem sentido quando o horário aparece.
  let diasPendentes = [];

  trechos.forEach((trecho) => {
    const diasAchados = acharDias(trecho);
    const { faixas, sobrou, tinhaHora } = faixasDoTrecho(trecho);
    const intervalo = expandirIntervalo(trecho, diasAchados);
    const chaves = intervalo || diasAchados.map((d) => d.chave);

    if (chaves.length === 0) {
      if (!faixas.length) return;
      if (diasPendentes.length) {
        aplicar(diasPendentes, faixas);
        entendeuAlgo = true;
        if (sobrou) diasPendentes.forEach((c) => diasIncertos.add(c));
        diasPendentes = [];
      } else {
        trechosSemDia.push({ faixas, sobrou });
      }
      return;
    }

    if (faixas.length > 0) {
      aplicar([...diasPendentes, ...chaves], faixas);
      entendeuAlgo = true;
      // Sobrou uma hora solta além das faixas completas: alguma coisa naquele
      // trecho não foi representada.
      if (sobrou) chaves.forEach((c) => diasIncertos.add(c));
      diasPendentes = [];
    } else if (tinhaHora) {
      // Cita o dia e cita uma hora, mas não dá pra formar uma faixa — é o caso
      // clássico do "sexta até 12h", que não diz a hora de abrir.
      chaves.forEach((c) => { diasIncertos.add(c); diasDefinidos.add(c); });
      diasPendentes = [];
    } else {
      // Só o nome do dia: espera o horário que deve vir logo adiante.
      diasPendentes.push(...chaves);
    }
  });

  // Dias citados que nunca receberam horário nenhum.
  diasPendentes.forEach((c) => diasIncertos.add(c));

  // Um trecho de horário sem dia vale para os dias úteis que nenhum outro
  // trecho definiu — é o caso mais comum de todos ("08:00 às 17:00", sozinho).
  trechosSemDia.forEach(({ faixas, sobrou }) => {
    if (!faixas.length) return;
    const alvos = diasDefinidos.size > 0
      ? [...diasIncertos].filter((c) => !semana[c].length)
      : CHAVES_DIAS_UTEIS;
    const efetivos = alvos.length ? alvos : CHAVES_DIAS_UTEIS.filter((c) => !semana[c].length);
    if (!efetivos.length) return;
    aplicar(efetivos, faixas);
    entendeuAlgo = true;
    efetivos.forEach((c) => { if (!sobrou) diasIncertos.delete(c); });
  });

  return {
    semana: normalizarSemana(semana),
    diasIncertos: CHAVES_DIAS.filter((c) => diasIncertos.has(c)),
    entendeuAlgo,
  };
}

// ---------------------------------------------------------------------------
// "Está fora do horário agora?"
// ---------------------------------------------------------------------------

/**
 * Retorna true se o órgão provavelmente está fora do expediente agora, false se
 * está dentro, e null quando não dá pra saber — nesse caso a interface não deve
 * exibir aviso nenhum, porque um aviso errado é pior que nenhum aviso.
 *
 * Com a grade semanal preenchida a resposta é exata, inclusive para prefeituras
 * que só abrem em alguns dias. Sem ela, o chamador deve continuar usando o
 * interpretador de texto antigo (ver utils/horarioFuncionamento.js).
 */
/**
 * A pergunta como as telas fazem: dado o horário semanal (quando existe) e o
 * texto antigo, o órgão está fora do expediente agora?
 *
 * Prefere a grade — é exata, inclusive para quem só atende alguns dias. Sem
 * grade, cai no interpretador de texto de sempre, que assume seg a sex.
 * Retorna null quando não dá pra afirmar nada.
 */
export function estaForaDoHorarioDaEmpresa(semanal, textoHorario, dataRef = new Date()) {
  const pelaGrade = estaForaDoHorarioSemanal(semanal, dataRef);
  if (pelaGrade !== null) return pelaGrade;
  return estaForaDoHorario(textoHorario, dataRef);
}

export function estaForaDoHorarioSemanal(semana, dataRef = new Date()) {
  const norm = normalizarSemana(semana);
  if (!semanaTemAlgum(norm)) return null;

  const chaveHoje = POR_INDICE_JS[dataRef.getDay()];
  const faixasHoje = norm[chaveHoje] || [];
  if (!faixasHoje.length) return true;

  const agora = dataRef.getHours() * 60 + dataRef.getMinutes();
  return !faixasHoje.some((f) => agora >= horaParaMinutos(f.inicio) && agora < horaParaMinutos(f.fim));
}
