import { describe, it, expect } from 'vitest';
import { contarInscritosDaLinha, somarInscritos } from './contagemInscritos.js';

const pessoa = (nome, modulos = []) => ({ nome, email: '', modulos_ids: modulos });

describe('contarInscritosDaLinha', () => {
  it('negociação sem módulo leva o total de inscritos', () => {
    const linha = {
      id: 1,
      qtd_inscritos: 3,
      inscritos_json: [pessoa('Ana'), pessoa('Bia'), pessoa('Cid')],
      modulos_ids: [],
      modulo_id_fracionado: null,
    };
    expect(contarInscritosDaLinha(linha)).toBe(3);
  });

  it('módulo único: todos os inscritos contam nele', () => {
    const linha = {
      id: 1,
      qtd_inscritos: 3,
      inscritos_json: [pessoa('Ana'), pessoa('Bia'), pessoa('Cid')],
      modulos_ids: [10],
      modulo_id_fracionado: 10,
    };
    expect(contarInscritosDaLinha(linha)).toBe(3);
  });

  it('cada inscrito conta no módulo que escolheu', () => {
    const base = {
      id: 1,
      qtd_inscritos: 3,
      inscritos_json: [pessoa('Ana', [10]), pessoa('Bia', [20]), pessoa('Cid', [20])],
      modulos_ids: [10, 20],
    };
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 10 })).toBe(1);
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 20 })).toBe(2);
  });

  it('inscrito sem módulo definido conta UMA vez, no primeiro módulo', () => {
    const base = {
      id: 1,
      qtd_inscritos: 2,
      inscritos_json: [pessoa('Ana'), pessoa('Bia', [20])],
      modulos_ids: [10, 20],
    };
    // Ana não escolheu módulo: cai no primeiro, e não aparece de novo no segundo.
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 10 })).toBe(1);
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 20 })).toBe(1);
  });

  it('inscritos confirmados sem nome entram no primeiro módulo', () => {
    const base = {
      id: 1,
      qtd_inscritos: 4, // 1 nomeado + 3 ainda sem nome
      inscritos_json: [pessoa('Ana', [20])],
      modulos_ids: [10, 20],
    };
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 10 })).toBe(3);
    expect(contarInscritosDaLinha({ ...base, modulo_id_fracionado: 20 })).toBe(1);
  });

  it('aceita JSON em string, como vem de algumas rotas', () => {
    const linha = {
      id: 1,
      qtd_inscritos: 2,
      inscritos_json: '[{"nome":"Ana","modulos_ids":[10]},{"nome":"Bia","modulos_ids":[10]}]',
      modulos_ids: '[10]',
      modulo_id_fracionado: 10,
    };
    expect(contarInscritosDaLinha(linha)).toBe(2);
  });

  it('negociação sem inscrito nenhum conta zero', () => {
    expect(contarInscritosDaLinha({ id: 1, qtd_inscritos: 0, inscritos_json: [], modulos_ids: [10], modulo_id_fracionado: 10 })).toBe(0);
  });

  it('ignora entrada sem nome nem e-mail', () => {
    const linha = {
      id: 1,
      qtd_inscritos: 1,
      inscritos_json: [pessoa('Ana', [10]), { nome: '', email: '' }],
      modulos_ids: [10],
      modulo_id_fracionado: 10,
    };
    expect(contarInscritosDaLinha(linha)).toBe(1);
  });
});

describe('somarInscritos — o cenário que motivou a mudança', () => {
  it('7 prefeituras com 1 inscrito + 1 com 3 = 10 inscrições', () => {
    const linhas = [];
    for (let i = 1; i <= 7; i += 1) {
      linhas.push({
        id: i,
        qtd_inscritos: 1,
        inscritos_json: [pessoa(`Contato ${i}`)],
        modulos_ids: [10],
        modulo_id_fracionado: 10,
      });
    }
    linhas.push({
      id: 8,
      qtd_inscritos: 3,
      inscritos_json: [pessoa('Ana'), pessoa('Bia'), pessoa('Cid')],
      modulos_ids: [10],
      modulo_id_fracionado: 10,
    });
    expect(somarInscritos(linhas)).toBe(10);
  });

  it('não multiplica pessoas quando a negociação tem vários módulos', () => {
    // Mesma negociação, duas linhas (uma por módulo). 3 pessoas continuam 3.
    const linhas = [
      { id: 1, qtd_inscritos: 3, inscritos_json: [pessoa('Ana'), pessoa('Bia'), pessoa('Cid')], modulos_ids: [10, 20], modulo_id_fracionado: 10 },
      { id: 1, qtd_inscritos: 3, inscritos_json: [pessoa('Ana'), pessoa('Bia'), pessoa('Cid')], modulos_ids: [10, 20], modulo_id_fracionado: 20 },
    ];
    expect(somarInscritos(linhas)).toBe(3);
  });

  it('lista vazia soma zero', () => {
    expect(somarInscritos([])).toBe(0);
    expect(somarInscritos(null)).toBe(0);
  });
});
