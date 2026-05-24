/** Soma valores dos módulos selecionados. */
export function somarValorModulos(idsModulos, modulosCampanha) {
  const ids = (idsModulos || []).map(Number).filter(Boolean);
  return ids.reduce((acc, idMod) => {
    const m = (modulosCampanha || []).find((mod) => Number(mod.id) === idMod);
    return acc + (m ? Number(m.valor || 0) : 0);
  }, 0);
}

/** Quantidade de vagas/inscritos que multiplica o pacote (mínimo 1). */
export function fatorQuantidadeInscritos(qtdInscritos, inscritos = []) {
  const qtd = Math.max(0, Number(qtdInscritos) || 0);
  const preenchidos = (inscritos || []).filter((i) => i?.nome || i?.email).length;
  return Math.max(qtd, preenchidos, 1);
}

/** Detecta se algum inscrito tem módulos próprios (modo futuro / por pessoa). */
export function inscritosUsamModulosPorPessoa(inscritos = [], modulosGlobais = []) {
  const glob = [...new Set((modulosGlobais || []).map(Number).filter(Boolean))].sort((a, b) => a - b);
  return (inscritos || []).some((ins) => {
    const ids = (ins.modulos_ids || []).map(Number).filter(Boolean);
    if (!ids.length) return false;
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    if (sorted.length !== glob.length) return true;
    return sorted.some((id, i) => id !== glob[i]);
  });
}

/**
 * Calcula subtotal e valor final do pacote.
 * @param {'igual'|'por_inscrito'} modoPacote
 */
export function calcularTotaisPacote({
  modulosSelecionados = [],
  modulosCampanha = [],
  qtdInscritos = 0,
  inscritos = [],
  modoPacote = 'igual',
  desconto = 0,
  descontoReais = 0,
}) {
  const fator = fatorQuantidadeInscritos(qtdInscritos, inscritos);
  const somaUnidade = somarValorModulos(modulosSelecionados, modulosCampanha);

  let subtotal = 0;
  let detalhe = '';

  if (modoPacote === 'por_inscrito' && fator > 0) {
    const lista = (inscritos || []).slice(0, fator);
    const linhas = lista.length ? lista : [{ modulos_ids: modulosSelecionados }];
    subtotal = linhas.reduce((acc, ins) => {
      const ids = (ins.modulos_ids?.length ? ins.modulos_ids : modulosSelecionados);
      return acc + somarValorModulos(ids, modulosCampanha);
    }, 0);
    detalhe = `${linhas.length} inscrito(s) com módulos individuais`;
  } else {
    subtotal = somaUnidade * fator;
    if (fator > 1 && somaUnidade > 0) {
      detalhe = `${fator} inscrito(s) × pacote de ${formatarMoedaCurta(somaUnidade)}`;
    }
  }

  let valorFinal = subtotal * (1 - Number(desconto) / 100) - Number(descontoReais);
  if (valorFinal < 0) valorFinal = 0;

  return { subtotal, valorFinal, fator, somaUnidade, detalhe };
}

function formatarMoedaCurta(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** União de todos os módulos (para gravar na oportunidade). */
export function uniaoModulosInscritos(modulosGlobais, inscritos = []) {
  const set = new Set((modulosGlobais || []).map(Number).filter(Boolean));
  for (const ins of inscritos || []) {
    for (const id of ins.modulos_ids || []) {
      if (id) set.add(Number(id));
    }
  }
  return [...set];
}
