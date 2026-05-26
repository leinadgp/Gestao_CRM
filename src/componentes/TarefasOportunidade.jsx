import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  listarTarefasOportunidade,
  criarTarefa,
  atualizarTarefa,
  concluirTarefa,
  excluirTarefa,
  classificarTarefa,
  formatarDataHoraTarefa,
  deInputDatetimeLocal,
  paraInputDatetimeLocal,
} from '../utils/tarefasService';

export function TarefasOportunidade({ oportunidadeId, oportunidadeTitulo }) {
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDataHora, setEditDataHora] = useState('');

  const carregar = useCallback(async () => {
    if (!oportunidadeId) return;
    setCarregando(true);
    try {
      const lista = await listarTarefasOportunidade(oportunidadeId);
      setTarefas(lista);
    } catch {
      setTarefas([]);
    } finally {
      setCarregando(false);
    }
  }, [oportunidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const handler = () => carregar();
    window.addEventListener('tarefasAtualizadas', handler);
    return () => window.removeEventListener('tarefasAtualizadas', handler);
  }, [carregar]);

  function cancelarEdicao() {
    setEditandoId(null);
    setEditTitulo('');
    setEditDataHora('');
  }

  function iniciarEdicao(t) {
    setEditandoId(t.id);
    setEditTitulo(t.titulo || '');
    setEditDataHora(paraInputDatetimeLocal(t.data_hora));
  }

  async function handleCriar() {
    if (!titulo.trim() || !dataHora) {
      alert('Preencha a descrição e a data/horário da tarefa.');
      return;
    }

    const iso = deInputDatetimeLocal(dataHora);
    if (!iso || new Date(iso) <= new Date()) {
      alert('Escolha uma data e horário no futuro.');
      return;
    }

    setSalvando(true);
    try {
      await criarTarefa({
        oportunidade_id: oportunidadeId,
        oportunidade_titulo: oportunidadeTitulo,
        titulo,
        data_hora: iso,
      });
      setTitulo('');
      setDataHora('');
      await carregar();
    } catch (erro) {
      const msg = erro.response?.data?.erro || erro.message || 'Não foi possível criar a tarefa.';
      alert(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao() {
    if (!editTitulo.trim() || !editDataHora) {
      alert('Preencha a descrição e a data/horário da tarefa.');
      return;
    }

    const iso = deInputDatetimeLocal(editDataHora);
    if (!iso) {
      alert('Data/horário inválidos.');
      return;
    }

    setSalvando(true);
    try {
      await atualizarTarefa(editandoId, {
        titulo: editTitulo,
        data_hora: iso,
      });
      cancelarEdicao();
      await carregar();
    } catch (erro) {
      const msg = erro.response?.data?.erro || erro.message || 'Não foi possível salvar a tarefa.';
      alert(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleConcluir(id) {
    try {
      await concluirTarefa(id);
      if (editandoId === id) cancelarEdicao();
      await carregar();
    } catch {
      alert('Erro ao concluir tarefa.');
    }
  }

  async function handleExcluir(id) {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await excluirTarefa(id);
      if (editandoId === id) cancelarEdicao();
      await carregar();
    } catch {
      alert('Erro ao excluir tarefa.');
    }
  }

  const pendentes = tarefas.filter(t => !t.concluida);
  const concluidas = tarefas.filter(t => t.concluida);

  function renderTarefaItem(t, concluida = false) {
    const status = classificarTarefa(t);
    const emEdicao = editandoId === t.id;

    if (emEdicao) {
      return (
        <TarefaItem key={t.id} $status="editando">
          <FormEdicao>
            <input
              type="text"
              value={editTitulo}
              onChange={e => setEditTitulo(e.target.value)}
              placeholder="Descrição da tarefa..."
              autoFocus
            />
            <input
              type="datetime-local"
              value={editDataHora}
              onChange={e => setEditDataHora(e.target.value)}
            />
            <FormEdicaoAcoes>
              <BtnSalvar type="button" onClick={handleSalvarEdicao} disabled={salvando}>
                <i className="fa-solid fa-check" /> {salvando ? 'Salvando...' : 'Salvar'}
              </BtnSalvar>
              <BtnCancelar type="button" onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </BtnCancelar>
            </FormEdicaoAcoes>
          </FormEdicao>
        </TarefaItem>
      );
    }

    return (
      <TarefaItem key={t.id} $status={status}>
        <TarefaInfo>
          <strong>{t.titulo}</strong>
          <span className={concluida ? 'meta done' : 'meta'}>
            <i className={concluida ? 'fa-solid fa-check-circle' : 'fa-regular fa-clock'}></i>
            {formatarDataHoraTarefa(t.data_hora)}
            {!concluida && status === 'proxima' && <Badge $tipo="proxima">Em breve</Badge>}
            {!concluida && status === 'vencida' && <Badge $tipo="vencida">Atrasada</Badge>}
          </span>
        </TarefaInfo>
        <Acoes>
          {!concluida && (
            <>
              <BtnEditar type="button" onClick={() => iniciarEdicao(t)} title="Editar tarefa">
                <i className="fa-solid fa-pen"></i>
              </BtnEditar>
              <BtnConcluir type="button" onClick={() => handleConcluir(t.id)} title="Marcar como concluída">
                <i className="fa-solid fa-check"></i>
              </BtnConcluir>
            </>
          )}
          <BtnExcluir type="button" onClick={() => handleExcluir(t.id)} title="Excluir">
            <i className="fa-solid fa-trash"></i>
          </BtnExcluir>
        </Acoes>
      </TarefaItem>
    );
  }

  return (
    <Container>
      <SectionLabel>
        <i className="fa-solid fa-list-check"></i> Tarefas desta negociação
      </SectionLabel>

      <FormNova>
        <input
          type="text"
          placeholder="Ex: Ligar para o secretário..."
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCriar(); } }}
        />
        <input
          type="datetime-local"
          value={dataHora}
          onChange={e => setDataHora(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCriar(); } }}
        />
        <button type="button" onClick={handleCriar} disabled={salvando || !!editandoId}>
          <i className="fa-solid fa-plus"></i>
        </button>
      </FormNova>

      {carregando ? (
        <EmptyMsg><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</EmptyMsg>
      ) : tarefas.length === 0 ? (
        <EmptyMsg>Nenhuma tarefa agendada. Crie um lembrete com data e horário.</EmptyMsg>
      ) : (
        <Lista>
          {pendentes.map(t => renderTarefaItem(t, false))}
          {concluidas.length > 0 && (
            <>
              <Divider>Concluídas</Divider>
              {concluidas.map(t => renderTarefaItem(t, true))}
            </>
          )}
        </Lista>
      )}
    </Container>
  );
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
`;

const pulseUrgente = css`
  animation: ${pulse} 2s infinite;
`;

const Container = styled.div``;

const SectionLabel = styled.label`
  display: block;
  margin-bottom: 12px;
  color: #6f42c1;
  font-size: 0.95rem;
  font-weight: bold;
  i { margin-right: 6px; }
`;

const FormNova = styled.div`
  display: grid;
  grid-template-columns: 1fr 180px 44px;
  gap: 8px;
  margin-bottom: 14px;

  input {
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
    &:focus { border-color: #6f42c1; box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.15); }
  }

  button {
    background: #6f42c1;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    &:hover { background: #5a32a3; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
`;

const TarefaItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid ${p =>
    p.$status === 'editando' ? '#c4b5fd' :
    p.$status === 'vencida' ? '#f5c6cb' :
    p.$status === 'proxima' ? '#ffeeba' :
    p.$status === 'concluida' ? '#c3e6cb' : '#e2e8f0'};
  background: ${p =>
    p.$status === 'editando' ? '#f5f3ff' :
    p.$status === 'vencida' ? '#fff5f5' :
    p.$status === 'proxima' ? '#fff9db' :
    p.$status === 'concluida' ? '#f4fbf5' : '#fff'};
  ${p => (p.$status === 'vencida' || p.$status === 'proxima') && pulseUrgente}
`;

const FormEdicao = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  input {
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    &:focus { border-color: #6f42c1; box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.15); }
  }
`;

const FormEdicaoAcoes = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const BtnSalvar = styled.button`
  background: #6f42c1;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover { background: #5a32a3; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnCancelar = styled.button`
  background: #e2e8f0;
  color: #475569;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  &:hover { background: #cbd5e1; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const TarefaInfo = styled.div`
  flex: 1;
  min-width: 0;
  strong {
    display: block;
    font-size: 0.92rem;
    color: #2c3e50;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 4px;
    &.done { color: #28a745; }
  }
`;

const Badge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${p => (p.$tipo === 'vencida' ? '#dc3545' : '#ffc107')};
  color: ${p => (p.$tipo === 'vencida' ? '#fff' : '#333')};
`;

const Acoes = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const BtnEditar = styled.button`
  background: #eef2ff;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  &:hover { background: #4f46e5; color: #fff; }
`;

const BtnConcluir = styled.button`
  background: #28a745;
  color: #fff;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  &:hover { background: #218838; }
`;

const BtnExcluir = styled.button`
  background: #fff5f5;
  color: #dc3545;
  border: 1px solid #f8d7da;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  &:hover { background: #dc3545; color: #fff; }
`;

const Divider = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin: 8px 0 4px;
`;

const EmptyMsg = styled.div`
  text-align: center;
  color: #94a3b8;
  font-size: 0.88rem;
  padding: 16px;
  font-style: italic;
`;
