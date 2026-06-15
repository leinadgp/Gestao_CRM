import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  listarMinhasTarefas,
  concluirTarefa,
  tarefasQuePrecisamAlerta,
  classificarTarefa,
  formatarDataHoraTarefa,
} from '../utils/tarefasService';

const INTERVALO_MS = 30 * 1000;

export function AlertasTarefas() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const [minimizado, setMinimizado] = useState(false);

  const atualizar = useCallback(async () => {
    try {
      const todas = await listarMinhasTarefas();
      const urgentes = tarefasQuePrecisamAlerta(todas);
      setAlertas(urgentes);
    } catch {
      setAlertas([]);
    }
  }, []);

  useEffect(() => {
    atualizar();
    const timer = setInterval(atualizar, INTERVALO_MS);
    const handler = () => atualizar();
    window.addEventListener('tarefasAtualizadas', handler);
    return () => {
      clearInterval(timer);
      window.removeEventListener('tarefasAtualizadas', handler);
    };
  }, [atualizar]);

  async function handleConcluir(id, e) {
    e.stopPropagation();
    try {
      await concluirTarefa(id);
      await atualizar();
    } catch {
      alert('Erro ao concluir tarefa.');
    }
  }

  function irParaFunil(oportunidadeId) {
    navigate('/funil', { state: { abrirOportunidadeId: oportunidadeId } });
  }

  if (alertas.length === 0) return null;

  const temVencida = alertas.some(t => classificarTarefa(t) === 'vencida');
  const corPrincipal = temVencida ? '#dc3545' : '#f59e0b';

  if (minimizado) {
    return (
      <MiniBadge
        $cor={corPrincipal}
        $pulsar={temVencida}
        onClick={() => setMinimizado(false)}
        title="Expandir alertas de tarefas"
      >
        <i className="fa-solid fa-bell" />
        <CountBadge>{alertas.length}</CountBadge>
      </MiniBadge>
    );
  }

  return (
    <Widget>
      <WidgetHeader $cor={corPrincipal}>
        <HeaderLeft>
          <i className="fa-solid fa-bell" />
          <span>
            {alertas.length} tarefa{alertas.length > 1 ? 's' : ''} pendente{alertas.length > 1 ? 's' : ''}
          </span>
        </HeaderLeft>
        <BtnMin onClick={() => setMinimizado(true)} title="Minimizar">
          <i className="fa-solid fa-chevron-down" />
        </BtnMin>
      </WidgetHeader>

      <AlertaLista>
        {alertas.map(t => {
          const vencida = classificarTarefa(t) === 'vencida';
          return (
            <AlertaItem key={t.id} $vencida={vencida} onClick={() => irParaFunil(t.oportunidade_id)}>
              <ItemIcone $vencida={vencida}>
                <i className={`fa-solid ${vencida ? 'fa-circle-exclamation' : 'fa-clock'}`} />
              </ItemIcone>
              <ItemConteudo>
                <ItemTitulo>{t.titulo}</ItemTitulo>
                {t.oportunidade_titulo && <ItemNegocio>{t.oportunidade_titulo}</ItemNegocio>}
                <ItemHorario>
                  <i className="fa-regular fa-calendar" />
                  {formatarDataHoraTarefa(t.data_hora)}
                </ItemHorario>
              </ItemConteudo>
              <BtnConcluir type="button" onClick={e => handleConcluir(t.id, e)} title="Concluir">
                <i className="fa-solid fa-check" />
              </BtnConcluir>
            </AlertaItem>
          );
        })}
      </AlertaLista>
    </Widget>
  );
}

// ── Animações ──────────────────────────────────────────────────

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 4px 16px rgba(220,53,69,0.3); }
  50%       { box-shadow: 0 4px 24px rgba(220,53,69,0.6); }
`;

const pulsarCss = css`
  animation: ${pulse} 1.8s ease-in-out infinite;
`;

// ── Estado minimizado ──────────────────────────────────────────

const MiniBadge = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${p => p.$cor};
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transition: transform 0.15s;
  ${p => p.$pulsar ? pulsarCss : ''}
  &:hover { transform: scale(1.08); }
`;

const CountBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #1e293b;
  color: #fff;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0 4px;
  border: 2px solid #fff;
  pointer-events: none;
`;

// ── Estado expandido ───────────────────────────────────────────

const Widget = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  width: min(360px, calc(100vw - 32px));
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.22);
  animation: ${slideIn} 0.3s ease-out;
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: ${p => p.$cor};
  color: #fff;
  user-select: none;

  i.fa-bell { margin-right: 8px; font-size: 0.9rem; }
  span { font-size: 0.88rem; font-weight: 700; }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
`;

const BtnMin = styled.button`
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.35); }
`;

const AlertaLista = styled.div`
  background: #fff;
  max-height: min(360px, calc(100vh - 160px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const AlertaItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
  background: ${p => p.$vencida ? '#fff5f5' : '#fffbeb'};
  &:hover { background: ${p => p.$vencida ? '#fdecea' : '#fef3c7'}; }
  &:last-child { border-bottom: none; }
`;

const ItemIcone = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => p.$vencida ? '#dc3545' : '#f59e0b'};
  color: #fff;
  font-size: 0.88rem;
`;

const ItemConteudo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitulo = styled.div`
  font-weight: 700;
  font-size: 0.88rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemNegocio = styled.div`
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemHorario = styled.div`
  font-size: 0.74rem;
  color: #94a3b8;
  margin-top: 4px;
  i { margin-right: 4px; }
`;

const BtnConcluir = styled.button`
  flex-shrink: 0;
  background: #22c55e;
  color: #fff;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 2px;
  &:hover { background: #16a34a; }
`;
