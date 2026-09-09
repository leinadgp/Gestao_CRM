import { describe, it, expect } from 'vitest';
import {
  normalizarHora,
  normalizarSemana,
  montarTextoSemanal,
  interpretarTextoHorario,
  estaForaDoHorarioSemanal,
} from './horarioSemanal.js';

describe('normalizarHora', () => {
  it('aceita as formas que as pessoas realmente digitam', () => {
    expect(normalizarHora('8')).toBe('08:00');
    expect(normalizarHora('08')).toBe('08:00');
    expect(normalizarHora('8h')).toBe('08:00');
    expect(normalizarHora('8h30')).toBe('08:30');
    expect(normalizarHora('830')).toBe('08:30');
    expect(normalizarHora('0830')).toBe('08:30');
    expect(normalizarHora('1730')).toBe('17:30');
    expect(normalizarHora('17:30')).toBe('17:30');
    expect(normalizarHora(' 17:30 ')).toBe('17:30');
  });

  it('recusa o que não é hora em vez de chutar', () => {
    expect(normalizarHora('25')).toBe('');
    expect(normalizarHora('12:75')).toBe('');
    expect(normalizarHora('abc')).toBe('');
    expect(normalizarHora('')).toBe('');
    expect(normalizarHora(null)).toBe('');
    expect(normalizarHora('12345')).toBe('');
  });
});

describe('normalizarSemana', () => {
  it('descarta faixa invertida ou incompleta sem derrubar as válidas', () => {
    const semana = normalizarSemana({
      seg: [{ inicio: '08:00', fim: '17:00' }],
      ter: [{ inicio: '17:00', fim: '08:00' }],
      qua: [{ inicio: '08:00' }],
    });
    expect(semana.seg).toEqual([{ inicio: '08:00', fim: '17:00' }]);
    expect(semana.ter).toEqual([]);
    expect(semana.qua).toEqual([]);
  });

  it('ordena as faixas do dia e limita a duas', () => {
    const semana = normalizarSemana({
      seg: [
        { inicio: '13:00', fim: '17:00' },
        { inicio: '08:00', fim: '12:00' },
        { inicio: '19:00', fim: '21:00' },
      ],
    });
    expect(semana.seg).toEqual([
      { inicio: '08:00', fim: '12:00' },
      { inicio: '13:00', fim: '17:00' },
    ]);
  });

  it('não explode com lixo', () => {
    expect(normalizarSemana(null).seg).toEqual([]);
    expect(normalizarSemana('não é json').seg).toEqual([]);
    expect(normalizarSemana([1, 2, 3]).seg).toEqual([]);
    expect(normalizarSemana('{"seg":[{"inicio":"08:00","fim":"12:00"}]}').seg)
      .toEqual([{ inicio: '08:00', fim: '12:00' }]);
  });
});

describe('montarTextoSemanal', () => {
  it('agrupa dias consecutivos com o mesmo horário', () => {
    const semana = {
      seg: [{ inicio: '08:00', fim: '17:00' }],
      ter: [{ inicio: '08:00', fim: '17:00' }],
      qua: [{ inicio: '08:00', fim: '17:00' }],
      qui: [{ inicio: '08:00', fim: '17:00' }],
      sex: [{ inicio: '08:00', fim: '12:00' }],
    };
    expect(montarTextoSemanal(semana)).toBe('Seg a Qui 08:00 às 17:00 · Sex 08:00 às 12:00');
  });

  it('NÃO agrupa dias não consecutivos, mesmo com horário igual', () => {
    const semana = {
      seg: [{ inicio: '09:00', fim: '15:00' }],
      qua: [{ inicio: '09:00', fim: '15:00' }],
      sex: [{ inicio: '09:00', fim: '15:00' }],
    };
    // "Seg a Sex" incluiria terça e quinta, que não atendem.
    expect(montarTextoSemanal(semana)).toBe(
      'Seg 09:00 às 15:00 · Qua 09:00 às 15:00 · Sex 09:00 às 15:00'
    );
  });

  it('usa "e" para dois dias vizinhos', () => {
    expect(montarTextoSemanal({
      seg: [{ inicio: '08:00', fim: '12:00' }],
      ter: [{ inicio: '08:00', fim: '12:00' }],
    })).toBe('Seg e Ter 08:00 às 12:00');
  });

  it('escreve as duas faixas do dia', () => {
    expect(montarTextoSemanal({
      seg: [{ inicio: '08:00', fim: '11:30' }, { inicio: '13:30', fim: '16:00' }],
    })).toBe('Seg 08:00 às 11:30 e 13:30 às 16:00');
  });

  it('semana sem atendimento vira texto vazio', () => {
    expect(montarTextoSemanal({})).toBe('');
  });
});

describe('interpretarTextoHorario', () => {
  const casos = [
    ['08:00 às 17:00', 'Seg a Sex 08:00 às 17:00'],
    ['Seg a Sex, 08:00 - 17:00', 'Seg a Sex 08:00 às 17:00'],
    ['Seg-Sex 08:00-17:00', 'Seg a Sex 08:00 às 17:00'],
    ['De segunda a sexta, das 07:30 às 13:30', 'Seg a Sex 07:30 às 13:30'],
    ['Seg a Qui 8h às 17h, Sex 8h às 12h', 'Seg a Qui 08:00 às 17:00 · Sex 08:00 às 12:00'],
    ['08:00 às 11:30 e 13:30 às 16:00', 'Seg a Sex 08:00 às 11:30 e 13:30 às 16:00'],
    ['terça e quinta das 13h às 18h', 'Ter 13:00 às 18:00 · Qui 13:00 às 18:00'],
    ['Segunda, quarta e sexta: 9h às 15h', 'Seg 09:00 às 15:00 · Qua 09:00 às 15:00 · Sex 09:00 às 15:00'],
  ];

  casos.forEach(([entrada, esperado]) => {
    it(`entende "${entrada}"`, () => {
      const { semana, entendeuAlgo } = interpretarTextoHorario(entrada);
      expect(montarTextoSemanal(semana)).toBe(esperado);
      expect(entendeuAlgo).toBe(true);
    });
  });

  it('marca como incerto o dia que ficou sem horário completo', () => {
    const { semana, diasIncertos } = interpretarTextoHorario('Seg a Qui 8h as 17h, sexta ate 12h');
    expect(montarTextoSemanal(semana)).toBe('Seg a Qui 08:00 às 17:00');
    expect(diasIncertos).toEqual(['sex']);
  });

  it('não inventa horário quando não entende nada', () => {
    const { semana, diasIncertos, entendeuAlgo } = interpretarTextoHorario('atendimento ao público');
    expect(montarTextoSemanal(semana)).toBe('');
    expect(diasIncertos).toEqual([]);
    expect(entendeuAlgo).toBe(false);
  });

  it('lida com entrada vazia ou inválida', () => {
    expect(interpretarTextoHorario('').entendeuAlgo).toBe(false);
    expect(interpretarTextoHorario(null).entendeuAlgo).toBe(false);
    expect(interpretarTextoHorario(undefined).entendeuAlgo).toBe(false);
  });
});

describe('estaForaDoHorarioSemanal', () => {
  const semana = {
    seg: [{ inicio: '08:00', fim: '17:00' }],
    ter: [],
    qua: [{ inicio: '08:00', fim: '12:00' }],
    qui: [],
    sex: [{ inicio: '08:00', fim: '12:00' }],
  };

  // 2026-09-07 é uma segunda-feira.
  it('dentro do horário na segunda', () => {
    expect(estaForaDoHorarioSemanal(semana, new Date(2026, 8, 7, 10, 0))).toBe(false);
  });

  it('fora do horário na segunda de noite', () => {
    expect(estaForaDoHorarioSemanal(semana, new Date(2026, 8, 7, 19, 0))).toBe(true);
  });

  it('terça inteira é fora, porque não atende terça', () => {
    expect(estaForaDoHorarioSemanal(semana, new Date(2026, 8, 8, 10, 0))).toBe(true);
  });

  it('quarta à tarde é fora — atende só até meio-dia', () => {
    expect(estaForaDoHorarioSemanal(semana, new Date(2026, 8, 9, 14, 0))).toBe(true);
    expect(estaForaDoHorarioSemanal(semana, new Date(2026, 8, 9, 9, 0))).toBe(false);
  });

  it('sem grade preenchida não afirma nada', () => {
    expect(estaForaDoHorarioSemanal({}, new Date(2026, 8, 7, 10, 0))).toBe(null);
    expect(estaForaDoHorarioSemanal(null, new Date(2026, 8, 7, 10, 0))).toBe(null);
  });
});
