import { describe, it, expect } from 'vitest';
import { montarOpcoesFiltroCurso } from './filtroCursoDashboard.js';
import { situacaoCampanha, campanhaEstaAtiva } from './campanhaStatus.js';

const AGORA = new Date('2026-11-17T12:00:00Z').getTime();

const ativa = { id: 1, nome: 'Curso Novembro', arquivada: false, data_fim: '2026-12-31' };
const encerrada = { id: 2, nome: 'Curso Setembro', arquivada: false, data_fim: '2026-09-30' };
const arquivada = { id: 3, nome: 'Curso Outubro', arquivada: true, data_fim: '2026-12-31' };
const semModulo = { id: 4, nome: 'Curso sem módulo', arquivada: false, data_fim: null };

const modulos = [
  { id: 10, campanha_id: 1, data_evento: '2026-11-20', data_evento_fim: null },
  { id: 20, campanha_id: 2, data_evento: '2026-09-16T00:00:00.000Z', data_evento_fim: null },
  // módulo que começa num mês e termina no outro: conta nos dois
  { id: 30, campanha_id: 3, data_evento: '2026-10-28', data_evento_fim: '2026-11-03' },
];

const ids = (lista) => lista.map((c) => c.id);

describe('situacaoCampanha', () => {
  it('sem data de fim e não arquivada é ativa', () => {
    expect(situacaoCampanha(semModulo, AGORA)).toBe('ativa');
  });

  it('data de fim no passado é encerrada', () => {
    expect(situacaoCampanha(encerrada, AGORA)).toBe('encerrada');
  });

  it('arquivada vale mais que a data de fim', () => {
    expect(situacaoCampanha({ ...encerrada, arquivada: true }, AGORA)).toBe('arquivada');
  });

  it('campanhaEstaAtiva continua igual para quem já usa (Disparos, Landing Pages)', () => {
    expect(campanhaEstaAtiva(null)).toBe(false);
    expect(campanhaEstaAtiva(arquivada)).toBe(false);
    expect(campanhaEstaAtiva({ ...ativa, data_fim: null })).toBe(true);
  });
});

describe('montarOpcoesFiltroCurso', () => {
  it('sem mês: lista todos os cursos, inclusive encerrados e arquivados', () => {
    const { doMes, outros } = montarOpcoesFiltroCurso([ativa, encerrada, arquivada, semModulo], modulos, '', AGORA);
    expect(ids(doMes).sort()).toEqual([1, 2, 3, 4]);
    expect(outros).toEqual([]);
  });

  it('ativos primeiro, mantendo a ordem original dentro de cada grupo', () => {
    // a API devolve do mais recente para o mais antigo
    const { doMes } = montarOpcoesFiltroCurso([encerrada, ativa, arquivada, semModulo], modulos, '', AGORA);
    expect(ids(doMes)).toEqual([1, 4, 2, 3]);
  });

  it('cada opção traz a situação do curso', () => {
    const { doMes } = montarOpcoesFiltroCurso([ativa, encerrada, arquivada], modulos, '', AGORA);
    const porId = Object.fromEntries(doMes.map((c) => [c.id, c.situacao]));
    expect(porId).toEqual({ 1: 'ativa', 2: 'encerrada', 3: 'arquivada' });
  });

  it('curso encerrado aparece no mês em que aconteceu', () => {
    const { doMes, outros } = montarOpcoesFiltroCurso([ativa, encerrada, arquivada, semModulo], modulos, '2026-09', AGORA);
    expect(ids(doMes)).toEqual([2]);
    expect(ids(outros)).toEqual([1, 4, 3]);
  });

  it('curso arquivado aparece no mês em que aconteceu, por início ou fim do módulo', () => {
    expect(ids(montarOpcoesFiltroCurso([arquivada], modulos, '2026-10', AGORA).doMes)).toEqual([3]);
    expect(ids(montarOpcoesFiltroCurso([ativa, arquivada], modulos, '2026-11', AGORA).doMes)).toEqual([1, 3]);
  });

  it('com mês selecionado, curso de outro mês não some: vai para "outros"', () => {
    const { doMes, outros } = montarOpcoesFiltroCurso([ativa, encerrada], modulos, '2026-11', AGORA);
    expect(ids(doMes)).toEqual([1]);
    expect(ids(outros)).toEqual([2]);
  });
});
