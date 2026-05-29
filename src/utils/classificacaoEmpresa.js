/** Pesos para ordenação no funil (maior = mais prioritário). */
export const PESOS_CLASSIFICACAO = {
  assessorada: 3,
  lead_quente: 2,
  nao_assessorada: 1,
};

export function normalizarClassificacoesPorCargo(dado) {
  if (dado == null) return [];
  let parsed = dado;
  if (typeof dado === 'string') {
    try {
      parsed = JSON.parse(dado);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      cargo: String(item?.cargo || '').trim(),
      classificacao: item?.classificacao || 'nao_assessorada',
      estrelas: Number(item?.estrelas) || 0,
    }))
    .filter((item) => item.cargo);
}

/**
 * Prioridade da prefeitura para a campanha atual, com base nos cargos-alvo.
 * Ex.: campanha Licitação → usa VIP/estrelas do cargo Licitação na empresa.
 */
export function resolverScoringEmpresa(empresa = {}, cargosAlvoCampanha = [], cargosContato = []) {
  const porCargo = normalizarClassificacoesPorCargo(empresa.classificacoes_por_cargo_json);
  const alvos = (cargosAlvoCampanha || []).map((c) => String(c).trim()).filter(Boolean);

  const normalizeCargo = (value) => String(value || '').trim().toLowerCase();
  const compararPrioridade = (a, b) => {
    const pa = PESOS_CLASSIFICACAO[a.classificacao] || 1;
    const pb = PESOS_CLASSIFICACAO[b.classificacao] || 1;
    if (pb !== pa) return pb - pa;
    return (b.estrelas || 0) - (a.estrelas || 0);
  };

  const cargoMap = porCargo.reduce((map, item) => {
    const key = normalizeCargo(item.cargo);
    if (!key) return map;
    if (!map[key] || compararPrioridade(item, map[key]) > 0) {
      map[key] = item;
    }
    return map;
  }, {});

  if (alvos.length) {
    const candidatos = alvos
      .map(normalizeCargo)
      .filter(Boolean)
      .map((key) => cargoMap[key])
      .filter(Boolean);

    if (candidatos.length) {
      candidatos.sort(compararPrioridade);
      return {
        classificacao: candidatos[0].classificacao,
        estrelas: candidatos[0].estrelas,
        cargoRef: candidatos[0].cargo,
      };
    }
  }

  if (porCargo.length) {
    const melhor = [...porCargo].sort(compararPrioridade)[0];
    if (melhor) {
      return { classificacao: melhor.classificacao, estrelas: melhor.estrelas, cargoRef: melhor.cargo };
    }
  }

  return {
    classificacao: 'nao_assessorada',
    estrelas: 0,
    cargoRef: null,
  };
}

export function labelClassificacao(classificacao) {
  if (classificacao === 'assessorada') return '👑 VIP (Assessorada)';
  if (classificacao === 'lead_quente') return '🔥 Lead Quente';
  return '❄️ Frio';
}
