// Contagem de INSCRITOS (pessoas) por linha de venda no dashboard.
//
// O dashboard quebra cada negociação em uma linha por módulo do curso, porque o
// valor é rateado entre os módulos e cada módulo tem seu próprio mês de
// competência. A contagem de pessoas precisa acompanhar esse mesmo corte: quem
// se inscreveu no módulo de março conta em março, quem se inscreveu no de abril
// conta em abril.
//
// A regra que NÃO vale é somar a lista inteira em cada linha — 3 inscritos numa
// negociação de 2 módulos virariam 6 pessoas.

function paraLista(valor) {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === 'string' && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function idsNumericos(valor) {
  return paraLista(valor).map(Number).filter((n) => Number.isFinite(n) && n > 0);
}

/** Inscritos com nome ou e-mail — os "anônimos" entram pela folga de qtd_inscritos. */
function inscritosNomeados(op) {
  return paraLista(op?.inscritos_json).filter((p) => p && (p.nome || p.email));
}

/**
 * Quantas pessoas esta linha (negociação × módulo) representa.
 *
 * - Inscrito com `modulos_ids` conta no módulo que ele escolheu.
 * - Inscrito sem módulo definido (cadastro manual antigo, ou negociação de
 *   módulo único) conta UMA vez, no primeiro módulo da negociação — nunca em
 *   todos, senão a mesma pessoa apareceria em vários meses.
 * - A diferença entre `qtd_inscritos` e a lista nomeada (gente confirmada que
 *   ainda não tem nome cadastrado) segue a mesma regra do "sem módulo".
 * - Negociação sem módulo nenhum vira uma linha só, que leva o total.
 */
export function contarInscritosDaLinha(op) {
  const lista = inscritosNomeados(op);
  const qtdOficial = Math.max(Number(op?.qtd_inscritos) || 0, lista.length);
  if (qtdOficial === 0) return 0;

  const moduloDaLinha = op?.modulo_id_fracionado != null ? Number(op.modulo_id_fracionado) : null;
  if (moduloDaLinha == null) return qtdOficial;

  const modulosDaOp = idsNumericos(op?.modulos_ids);
  const ehPrimeiroModulo = modulosDaOp.length > 0 && modulosDaOp[0] === moduloDaLinha;

  let comEsteModulo = 0;
  let semModuloDefinido = 0;
  lista.forEach((pessoa) => {
    const mods = idsNumericos(pessoa?.modulos_ids);
    if (mods.length === 0) semModuloDefinido += 1;
    else if (mods.includes(moduloDaLinha)) comEsteModulo += 1;
  });

  const semNome = Math.max(0, qtdOficial - lista.length);
  return comEsteModulo + (ehPrimeiroModulo ? semModuloDefinido + semNome : 0);
}

/** Soma de inscritos de várias linhas já filtradas (por mês, campanha, etc). */
export function somarInscritos(linhas) {
  return (linhas || []).reduce((total, linha) => total + contarInscritosDaLinha(linha), 0);
}
