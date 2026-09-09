import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { CampoHora } from './CampoHora.jsx';
import {
  DIAS_SEMANA,
  CHAVES_DIAS_UTEIS,
  MAX_FAIXAS_POR_DIA,
  semanaVazia,
  normalizarSemana,
  semanaTemAlgum,
  montarTextoSemanal,
  interpretarTextoHorario,
} from '../utils/horarioSemanal.js';

const FAIXA_PADRAO = { inicio: '08:00', fim: '17:00' };

/**
 * Grade de horário de funcionamento por dia da semana.
 *
 * Substitui o campo antigo de duas faixas iguais pra semana inteira, que não
 * conseguia representar o caso comum das prefeituras: um horário de segunda a
 * quinta e outro na sexta, ou atendimento só em alguns dias.
 *
 * Props:
 *   valor      — objeto semanal ({ seg: [{inicio, fim}], ... }) já salvo
 *   textoAtual — o `horario_funcionamento` textual que está no banco hoje
 *   onChange   — recebe { semanal, texto } a cada alteração; o texto é o que
 *                deve ir pra coluna antiga, mantendo tudo que só lê texto
 *                funcionando
 */
export function HorarioSemanalInput({ valor, textoAtual, onChange }) {
  const [semana, setSemana] = useState(() => {
    const norm = normalizarSemana(valor);
    if (semanaTemAlgum(norm)) return norm;
    // Sem grade salva, tenta aproveitar o texto que já existe — mas como
    // palpite visível (ver `vindoDoTexto`), nunca como fato consumado.
    const { semana: interpretada } = interpretarTextoHorario(textoAtual || '');
    return interpretada;
  });

  const [diasIncertos, setDiasIncertos] = useState(() => {
    if (semanaTemAlgum(normalizarSemana(valor))) return [];
    return interpretarTextoHorario(textoAtual || '').diasIncertos;
  });

  // Verdadeiro quando o que está na tela veio de uma leitura do texto antigo, e
  // não de uma grade que alguém salvou de propósito.
  const [vindoDoTexto] = useState(() => {
    if (semanaTemAlgum(normalizarSemana(valor))) return false;
    return interpretarTextoHorario(textoAtual || '').entendeuAlgo;
  });

  const [mostrarFimDeSemana, setMostrarFimDeSemana] = useState(() => {
    const norm = normalizarSemana(valor);
    return norm.sab.length > 0 || norm.dom.length > 0;
  });

  const [textoColado, setTextoColado] = useState('');
  const [avisoColagem, setAvisoColagem] = useState('');

  const textoGerado = useMemo(() => montarTextoSemanal(semana), [semana]);

  const diasVisiveis = useMemo(() => (
    DIAS_SEMANA.filter((d) => d.util || mostrarFimDeSemana)
  ), [mostrarFimDeSemana]);

  function aplicar(nova, incertos = diasIncertos) {
    const norm = normalizarSemana(nova);
    setSemana(norm);
    setDiasIncertos(incertos);
    onChange({ semanal: norm, texto: montarTextoSemanal(norm) });
  }

  function alternarDia(chave) {
    const atendia = semana[chave].length > 0;
    aplicar(
      { ...semana, [chave]: atendia ? [] : [{ ...FAIXA_PADRAO }] },
      diasIncertos.filter((d) => d !== chave)
    );
  }

  function mudarHora(chave, indiceFaixa, campo, novoValor) {
    const faixas = semana[chave].map((f, i) => (i === indiceFaixa ? { ...f, [campo]: novoValor } : f));
    // Uma faixa em edição pode ficar temporariamente inválida (só o início
    // preenchido). Guardamos assim mesmo no estado local pra não apagar o que a
    // pessoa acabou de digitar; `normalizarSemana` descarta na hora de salvar.
    setSemana((prev) => ({ ...prev, [chave]: faixas }));
    setDiasIncertos((prev) => prev.filter((d) => d !== chave));
    const proposta = { ...semana, [chave]: faixas };
    onChange({ semanal: normalizarSemana(proposta), texto: montarTextoSemanal(proposta) });
  }

  function adicionarFaixa(chave) {
    if (semana[chave].length >= MAX_FAIXAS_POR_DIA) return;
    aplicar({ ...semana, [chave]: [...semana[chave], { inicio: '13:00', fim: '17:00' }] });
  }

  function removerFaixa(chave, indiceFaixa) {
    aplicar({ ...semana, [chave]: semana[chave].filter((_, i) => i !== indiceFaixa) });
  }

  function copiarSegundaParaTodos() {
    const modelo = semana.seg;
    if (!modelo.length) return;
    const nova = { ...semana };
    CHAVES_DIAS_UTEIS.forEach((chave) => { nova[chave] = modelo.map((f) => ({ ...f })); });
    aplicar(nova, []);
  }

  function limparTudo() {
    aplicar(semanaVazia(), []);
  }

  function aplicarTextoColado() {
    const { semana: interpretada, diasIncertos: incertos, entendeuAlgo } = interpretarTextoHorario(textoColado);
    if (!entendeuAlgo && !incertos.length) {
      setAvisoColagem('Não consegui reconhecer nenhum horário nesse texto. Preencha na grade abaixo.');
      return;
    }
    const norm = normalizarSemana(interpretada);
    if (norm.sab.length || norm.dom.length) setMostrarFimDeSemana(true);
    aplicar(norm, incertos);
    setAvisoColagem(
      incertos.length
        ? `Confira ${incertos.map((c) => DIAS_SEMANA.find((d) => d.chave === c)?.nome).join(', ')} — não deu pra entender o horário desse(s) dia(s).`
        : ''
    );
    setTextoColado('');
  }

  const textoMudou = Boolean(textoAtual) && textoGerado && textoAtual.trim() !== textoGerado.trim();

  return (
    <Container>
      <ColarLinha>
        <i className="fa-solid fa-clipboard" />
        <input
          type="text"
          value={textoColado}
          placeholder="Colar horário. Ex.: Seg a Qui 8h às 17h, Sex 8h às 12h"
          onChange={(e) => { setTextoColado(e.target.value); setAvisoColagem(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarTextoColado(); } }}
        />
        <button type="button" onClick={aplicarTextoColado} disabled={!textoColado.trim()}>
          Interpretar
        </button>
      </ColarLinha>
      {avisoColagem && <Aviso $tom="atencao"><i className="fa-solid fa-triangle-exclamation" /> {avisoColagem}</Aviso>}

      {vindoDoTexto && (
        <Aviso $tom="info">
          <i className="fa-solid fa-wand-magic-sparkles" />
          Preenchi a grade a partir do horário que já estava salvo. Confira antes de salvar.
        </Aviso>
      )}

      <Grade>
        {diasVisiveis.map((dia) => {
          const faixas = semana[dia.chave] || [];
          const atende = faixas.length > 0;
          const incerto = diasIncertos.includes(dia.chave);
          return (
            <LinhaDia key={dia.chave} $atende={atende} $incerto={incerto}>
              <label className="dia">
                <input type="checkbox" checked={atende} onChange={() => alternarDia(dia.chave)} />
                <span>{dia.nome}</span>
              </label>

              {!atende ? (
                <span className="fechado">não atende</span>
              ) : (
                <div className="faixas">
                  {faixas.map((faixa, i) => (
                    <div className="faixa" key={i}>
                      <CampoHora
                        value={faixa.inicio}
                        ariaLabel={`${dia.nome} — início${i > 0 ? ' da 2ª faixa' : ''}`}
                        onChange={(v) => mudarHora(dia.chave, i, 'inicio', v)}
                      />
                      <span className="as">às</span>
                      <CampoHora
                        value={faixa.fim}
                        ariaLabel={`${dia.nome} — fim${i > 0 ? ' da 2ª faixa' : ''}`}
                        onChange={(v) => mudarHora(dia.chave, i, 'fim', v)}
                      />
                      {i > 0 && (
                        <button type="button" className="icone remover" onClick={() => removerFaixa(dia.chave, i)} title="Remover esta faixa">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  ))}
                  {faixas.length < MAX_FAIXAS_POR_DIA && (
                    <button type="button" className="icone adicionar" onClick={() => adicionarFaixa(dia.chave)} title="Fecha para almoço? Adicione a faixa da tarde">
                      <i className="fa-solid fa-plus" /> almoço
                    </button>
                  )}
                </div>
              )}

              {incerto && (
                <span className="incerto" title="Não deu pra entender o horário deste dia no texto colado">
                  <i className="fa-solid fa-circle-question" /> confira
                </span>
              )}
            </LinhaDia>
          );
        })}
      </Grade>

      <Acoes>
        <button type="button" onClick={copiarSegundaParaTodos} disabled={!semana.seg.length}>
          <i className="fa-solid fa-copy" /> copiar segunda para todos
        </button>
        {!mostrarFimDeSemana && (
          <button type="button" onClick={() => setMostrarFimDeSemana(true)}>
            <i className="fa-solid fa-plus" /> sábado / domingo
          </button>
        )}
        <button type="button" className="limpar" onClick={limparTudo} disabled={!semanaTemAlgum(semana)}>
          limpar
        </button>
      </Acoes>

      <Resultado>
        <span className="rotulo">Vai ficar assim:</span>
        <strong>{textoGerado || 'Nenhum horário definido'}</strong>
      </Resultado>

      {textoMudou && (
        <Aviso $tom="atencao">
          <i className="fa-solid fa-arrow-right-arrow-left" />
          <span>
            Substitui o horário salvo hoje: <em>{textoAtual}</em>.
            {' '}Se havia alguma observação escrita ali que a grade não representa, ela se perde ao salvar.
          </span>
        </Aviso>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 10px;
`;

const ColarLinha = styled.div`
  display: flex; align-items: center; gap: 8px;

  > i { color: #94a3b8; font-size: 0.85rem; }

  input {
    flex: 1; min-width: 0; padding: 8px 10px; border-radius: 8px;
    border: 1px solid #cbd5e1; font-size: 0.85rem; outline: none;
    &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
  }

  button {
    padding: 8px 14px; border-radius: 8px; border: 1px solid #bfdbfe;
    background: #eff6ff; color: #1d4ed8; font-weight: 600; font-size: 0.8rem;
    cursor: pointer; white-space: nowrap; font-family: inherit;
    &:hover:not(:disabled) { background: #dbeafe; }
    &:disabled { opacity: 0.5; cursor: default; }
  }
`;

const Aviso = styled.div`
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 0.78rem; line-height: 1.45; padding: 8px 10px; border-radius: 8px;
  background: ${(p) => (p.$tom === 'atencao' ? '#fffbeb' : '#eff6ff')};
  color: ${(p) => (p.$tom === 'atencao' ? '#92400e' : '#1e40af')};
  border: 1px solid ${(p) => (p.$tom === 'atencao' ? '#fde68a' : '#bfdbfe')};
  i { margin-top: 2px; flex-shrink: 0; }
  em { font-style: normal; font-weight: 600; }
`;

const Grade = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;

const LinhaDia = styled.div`
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 6px 8px; border-radius: 8px;
  background: ${(p) => (p.$incerto ? '#fffbeb' : p.$atende ? 'transparent' : '#fafafa')};
  border: 1px solid ${(p) => (p.$incerto ? '#fde68a' : 'transparent')};

  label.dia {
    display: flex; align-items: center; gap: 8px; width: 116px; flex-shrink: 0;
    font-size: 0.85rem; font-weight: 600; cursor: pointer;
    color: ${(p) => (p.$atende ? '#1e293b' : '#94a3b8')};
    input { cursor: pointer; accent-color: #007bff; width: 15px; height: 15px; }
  }

  .fechado { font-size: 0.8rem; color: #cbd5e1; font-style: italic; }

  .faixas { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .faixa { display: flex; align-items: center; gap: 6px; }
  .as { font-size: 0.78rem; color: #94a3b8; }

  button.icone {
    background: none; border: none; cursor: pointer; font-family: inherit;
    font-size: 0.75rem; padding: 4px 6px; border-radius: 6px;
    display: inline-flex; align-items: center; gap: 4px;
  }
  button.adicionar { color: #64748b; &:hover { background: #f1f5f9; color: #334155; } }
  button.remover { color: #dc3545; &:hover { background: #fef2f2; } }

  .incerto { font-size: 0.75rem; color: #b45309; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }

  @media (max-width: 560px) {
    label.dia { width: 100%; }
  }
`;

const Acoes = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap;

  button {
    background: none; border: none; cursor: pointer; font-family: inherit;
    font-size: 0.78rem; font-weight: 600; color: #1d4ed8; padding: 4px 6px;
    border-radius: 6px; display: inline-flex; align-items: center; gap: 5px;
    &:hover:not(:disabled) { background: #eff6ff; }
    &:disabled { opacity: 0.45; cursor: default; }
    &.limpar { color: #dc3545; margin-left: auto; &:hover:not(:disabled) { background: #fef2f2; } }
  }
`;

const Resultado = styled.div`
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  padding: 8px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;
  .rotulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 700; }
  strong { font-size: 0.85rem; color: #1e293b; }
`;
