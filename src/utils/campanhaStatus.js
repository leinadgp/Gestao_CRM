// Situação de uma campanha (curso): 'arquivada', 'encerrada' (data de fim já passou) ou 'ativa'.
// Arquivar vale mais que a data: uma campanha arquivada é 'arquivada' mesmo antes do fim.
export function situacaoCampanha(campanha, agora = Date.now()) {
  if (campanha.arquivada === true) return 'arquivada';
  if (campanha.data_fim && agora > new Date(campanha.data_fim).getTime()) return 'encerrada';
  return 'ativa';
}

export function campanhaEstaAtiva(campanha) {
  if (!campanha) return false;
  return situacaoCampanha(campanha) === 'ativa';
}
