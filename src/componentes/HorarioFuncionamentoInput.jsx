import { useState } from 'react';
import styled from 'styled-components';
import { parseFaixasHorarioFuncionamento } from '../utils/horarioFuncionamento.js';

function minutosParaHHMM(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function montarTexto(faixas) {
  return faixas
    .filter((f) => f.inicio && f.fim)
    .map((f) => `${f.inicio} às ${f.fim}`)
    .join(' e ');
}

function faixasIniciais(value) {
  const parseadas = parseFaixasHorarioFuncionamento(value || '');
  const iniciais = parseadas.slice(0, 2).map((f) => ({
    inicio: minutosParaHHMM(f.inicio),
    fim: minutosParaHHMM(f.fim),
  }));
  while (iniciais.length < 2) iniciais.push({ inicio: '', fim: '' });
  return iniciais;
}

const ROTULOS_FAIXA = ['Manhã', 'Tarde'];

/**
 * Campo estruturado de horário de funcionamento (até 2 faixas, com início/fim
 * em `<input type="time">` — fisicamente não dá pra digitar um horário
 * inválido). Se o texto atual (`value`) não for reconhecível pelo
 * interpretador existente (formato antigo/livre), NÃO preenche nada sozinho —
 * preserva o texto original até a pessoa optar por substituir por um horário
 * estruturado novo, evitando perder/estragar o que já estava salvo.
 */
export function HorarioFuncionamentoInput({ value, onChange }) {
  const [modoEstruturado, setModoEstruturado] = useState(
    () => !value || parseFaixasHorarioFuncionamento(value).length > 0
  );
  const [faixas, setFaixas] = useState(() => faixasIniciais(value));

  function aplicar(novasFaixas) {
    setFaixas(novasFaixas);
    onChange(montarTexto(novasFaixas));
  }

  function atualizarFaixa(indice, campo, novoValor) {
    aplicar(faixas.map((f, i) => (i === indice ? { ...f, [campo]: novoValor } : f)));
  }

  function limparFaixa(indice) {
    aplicar(faixas.map((f, i) => (i === indice ? { inicio: '', fim: '' } : f)));
  }

  if (!modoEstruturado) {
    return (
      <ValorAntigo>
        <span>Valor salvo atualmente: <strong>{value}</strong></span>
        <button type="button" onClick={() => setModoEstruturado(true)}>
          Preencher horário estruturado
        </button>
      </ValorAntigo>
    );
  }

  return (
    <Container>
      {faixas.map((faixa, i) => (
        <FaixaRow key={i}>
          <span className="rotulo">{ROTULOS_FAIXA[i]}</span>
          <label>
            Início
            <input type="time" value={faixa.inicio} onChange={(e) => atualizarFaixa(i, 'inicio', e.target.value)} />
          </label>
          <label>
            Fim
            <input type="time" value={faixa.fim} onChange={(e) => atualizarFaixa(i, 'fim', e.target.value)} />
          </label>
          {(faixa.inicio || faixa.fim) && (
            <button type="button" className="limpar" onClick={() => limparFaixa(i)}>Limpar</button>
          )}
        </FaixaRow>
      ))}
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;

const FaixaRow = styled.div`
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  .rotulo { font-size: 0.8rem; font-weight: 700; color: #64748b; width: 48px; flex-shrink: 0; }
  label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #64748b; }
  input[type="time"] {
    padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; font-size: 0.9rem; box-sizing: border-box;
    &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
  }
  button.limpar {
    background: none; border: none; color: #dc3545; font-size: 0.78rem; cursor: pointer; padding: 4px 6px; text-decoration: underline;
  }
`;

const ValorAntigo = styled.div`
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 0.85rem; color: #64748b;
  strong { color: #334155; }
  button {
    background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: 600; font-size: 0.8rem;
    padding: 6px 12px; border-radius: 8px; cursor: pointer;
    &:hover { background: #dbeafe; }
  }
`;
