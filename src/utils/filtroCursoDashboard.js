import { situacaoCampanha } from './campanhaStatus.js';

const mesDe = (data) => (data ? String(data).substring(0, 7) : '');

// Opções do seletor "Curso" do Dashboard.
//
// O Dashboard é histórico: lista TODOS os cursos — ativos, encerrados e arquivados.
// Arquivar um curso ou passar da data de fim não pode tirar dele o filtro, senão
// não há como consultar os inscritos e as vendas de um curso que já aconteceu.
//
// Com um mês (yyyy-MM) selecionado, separa os cursos com algum módulo naquele mês
// (início ou fim do evento) dos demais. Nenhum curso some: os de outros meses vão
// para `outros`. Sem mês, tudo fica em `doMes`.
//
// Dentro de cada grupo os ativos vêm primeiro, mantendo a ordem recebida da API
// (mais recentes primeiro). Cada opção leva a `situacao` do curso para a tela
// marcar os encerrados e arquivados.
export function montarOpcoesFiltroCurso(campanhas, modulos, mes, agora = Date.now()) {
  const opcoes = campanhas
    .map((c) => ({ ...c, situacao: situacaoCampanha(c, agora) }))
    .sort((a, b) => (a.situacao === 'ativa' ? 0 : 1) - (b.situacao === 'ativa' ? 0 : 1));

  if (!mes) return { doMes: opcoes, outros: [] };

  const temModuloNoMes = (c) =>
    modulos.some(
      (m) =>
        Number(m.campanha_id) === Number(c.id) &&
        (mesDe(m.data_evento) === mes || mesDe(m.data_evento_fim) === mes)
    );

  return {
    doMes: opcoes.filter(temModuloNoMes),
    outros: opcoes.filter((c) => !temModuloNoMes(c)),
  };
}
