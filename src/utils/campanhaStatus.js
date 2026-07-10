export function campanhaEstaAtiva(campanha) {
  if (!campanha) return false;
  if (campanha.arquivada === true) return false;
  if (campanha.data_fim && Date.now() > new Date(campanha.data_fim).getTime()) return false;
  return true;
}
