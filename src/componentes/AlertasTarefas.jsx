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

  return (
    <Overlay>
      {alertas.map(t => {
        const status = classificarTarefa(t);
        const vencida = status === 'vencida';
        return (
          <AlertaCard key={t.id} $vencida={vencida} onClick={() => irParaFunil(t.oportunidade_id)}>
            <Icone $vencida={vencida}>
              <i className={`fa-solid ${vencida ? 'fa-bell' : 'fa-clock'}`}></i>
            </Icone>
            <Conteudo>
              <Titulo>{vencida ? 'Tarefa atrasada!' : 'Tarefa em breve'}</Titulo>
              <Descricao>
                <strong>{t.titulo}</strong>
                {t.oportunidade_titulo && (
                  <span className="negocio"> — {t.oportunidade_titulo}</span>
                )}
              </Descricao>
              <Horario>
                <i className="fa-regular fa-calendar"></i>
                {formatarDataHoraTarefa(t.data_hora)}
              </Horario>
            </Conteudo>
            <BtnConcluir
              type="button"
              onClick={e => handleConcluir(t.id, e)}
              title="Marcar como concluída"
            >
              <i className="fa-solid fa-check"></i> Concluir
            </BtnConcluir>
          </AlertaCard>
        );
      })}
    </Overlay>
  );
}

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
`;

const ring = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const alertaAnimacao = css`
  animation: ${slideIn} 0.35s ease-out, ${ring} 2s ease-in-out infinite;
`;

const Overlay = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 380px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;

  > * { pointer-events: auto; }

  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
    max-width: calc(100vw - 32px);
  }
`;

const AlertaCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  ${alertaAnimacao}
  background: ${p => (p.$vencida ? 'linear-gradient(135deg, #fff5f5 0%, #fdecea 100%)' : 'linear-gradient(135deg, #fff9db 0%, #fff3cd 100%)')};
  border: 2px solid ${p => (p.$vencida ? '#dc3545' : '#ffc107')};
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;

  &:hover { transform: translateY(-2px); }
`;

const Icone = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => (p.$vencida ? '#dc3545' : '#ffc107')};
  color: ${p => (p.$vencida ? '#fff' : '#333')};
  font-size: 1.2rem;
`;

const Conteudo = styled.div`
  flex: 1;
  min-width: 0;
`;

const Titulo = styled.div`
  font-weight: 800;
  font-size: 0.95rem;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const Descricao = styled.div`
  font-size: 0.88rem;
  color: #475569;
  line-height: 1.4;
  .negocio { color: #64748b; font-weight: 500; }
`;

const Horario = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 6px;
  i { margin-right: 4px; }
`;

const BtnConcluir = styled.button`
  flex-shrink: 0;
  background: #28a745;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  &:hover { background: #218838; }
`;
