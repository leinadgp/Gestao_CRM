import { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  listarMinhasTarefas,
  listarTodasTarefas,
  criarTarefa,
  atualizarTarefa,
  concluirTarefa,
  excluirTarefa,
  classificarTarefa,
  formatarDataHoraTarefa,
  paraInputDatetimeLocal,
  deInputDatetimeLocal,
} from '../utils/tarefasService.js';

export function Tarefas() {
  const perfilUsuario = localStorage.getItem('perfil');
  const isAdmin = perfilUsuario === 'admin';
  const meuId = String(localStorage.getItem('usuarioId') || '');
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editDataHora, setEditDataHora] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState(isAdmin ? 'todos' : meuId);
  const [filtroStatus, setFiltroStatus] = useState('pendentes');
  const [mostrarModalNova, setMostrarModalNova] = useState(false);

  const carregarTarefas = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await listarTodasTarefas();
      setTarefas(lista || []);
    } catch (erro) {
      console.error(erro);
      setTarefas([]);
    } finally {
      setCarregando(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    carregarTarefas();
    const handler = () => carregarTarefas();
    window.addEventListener('tarefasAtualizadas', handler);
    return () => window.removeEventListener('tarefasAtualizadas', handler);
  }, [carregarTarefas]);

  const colaboradores = useMemo(() => {
    const mapa = {};
    tarefas.forEach((t) => {
      const id = String(t.criado_por_id || '');
      if (!mapa[id]) {
        mapa[id] = { id, nome: t.criado_por_nome || 'Usuário' };
      }
    });
    return Object.values(mapa);
  }, [tarefas]);

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      const usuarioMatch = filtroUsuario === 'todos' || String(t.criado_por_id) === String(filtroUsuario);
      const statusMatch = filtroStatus === 'todos' || (filtroStatus === 'pendentes' ? !t.concluida : t.concluida);
      return usuarioMatch && statusMatch;
    });
  }, [tarefas, filtroUsuario, filtroStatus]);

  const pendentes = tarefasFiltradas.filter((t) => !t.concluida);
  const concluidas = tarefasFiltradas.filter((t) => t.concluida);

  function abrirModalNova() {
    setTitulo('');
    setDescricao('');
    setDataHora('');
    setMostrarModalNova(true);
  }

  function fecharModalNova() {
    setMostrarModalNova(false);
    setTitulo('');
    setDescricao('');
    setDataHora('');
  }

  async function handleCriar() {
    if (!titulo.trim() || !dataHora) {
      alert('Preencha a descrição da tarefa e o horário.');
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
        titulo,
        descricao,
        data_hora: iso,
      });
      fecharModalNova();
      await carregarTarefas();
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || erro.message || 'Não foi possível criar a tarefa.';
      alert(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(tarefa) {
    setEditandoId(tarefa.id);
    setEditTitulo(tarefa.titulo || '');
    setEditDescricao(tarefa.descricao || '');
    setEditDataHora(paraInputDatetimeLocal(tarefa.data_hora));
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditTitulo('');
    setEditDescricao('');
    setEditDataHora('');
  }

  async function handleSalvarEdicao() {
    if (!editTitulo.trim() || !editDataHora) {
      alert('Preencha a descrição da tarefa e o horário.');
      return;
    }

    const iso = deInputDatetimeLocal(editDataHora);
    if (!iso || new Date(iso) <= new Date()) {
      alert('Escolha uma data e horário no futuro.');
      return;
    }

    setSalvando(true);
    try {
      await atualizarTarefa(editandoId, {
        titulo: editTitulo,
        descricao: editDescricao,
        data_hora: iso,
      });
      cancelarEdicao();
      await carregarTarefas();
    } catch (erro) {
      const mensagem = erro.response?.data?.erro || erro.message || 'Não foi possível salvar a tarefa.';
      alert(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  async function handleConcluir(id) {
    try {
      await concluirTarefa(id);
      if (editandoId === id) cancelarEdicao();
      await carregarTarefas();
    } catch {
      alert('Erro ao concluir tarefa.');
    }
  }

  async function handleExcluir(id) {
    if (!window.confirm('Excluir esta tarefa?')) return;
    try {
      await excluirTarefa(id);
      if (editandoId === id) cancelarEdicao();
      await carregarTarefas();
    } catch {
      alert('Erro ao excluir tarefa.');
    }
  }

  function renderTarefaItem(tarefa) {
    const status = classificarTarefa(tarefa);
    const emEdicao = editandoId === tarefa.id;

    if (emEdicao) {
      return (
        <TarefaItem key={tarefa.id} $status="editando">
          <FormEdicao>
            <input
              type="text"
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              placeholder="Título da tarefa"
              autoFocus
            />
            <textarea
              value={editDescricao}
              onChange={(e) => setEditDescricao(e.target.value)}
              placeholder="Descrição opcional"
            />
            <input type="datetime-local" value={editDataHora} onChange={(e) => setEditDataHora(e.target.value)} />
            <FormEdicaoAcoes>
              <BtnSalvar type="button" onClick={handleSalvarEdicao} disabled={salvando}>
                <i className="fa-solid fa-check" /> {salvando ? 'Salvando...' : 'Salvar'}
              </BtnSalvar>
              <BtnCancelar2 type="button" onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </BtnCancelar2>
            </FormEdicaoAcoes>
          </FormEdicao>
        </TarefaItem>
      );
    }

    return (
      <TarefaItem key={tarefa.id} $status={status}>
        <TarefaInfo>
          <strong>{tarefa.titulo}</strong>
          {tarefa.descricao && <p>{tarefa.descricao}</p>}
          <Meta>
            <span>
              <i className="fa-regular fa-clock" /> {formatarDataHoraTarefa(tarefa.data_hora)}
            </span>
            {tarefa.oportunidade_titulo ? (
              <span>
                <i className="fa-solid fa-link" /> {tarefa.oportunidade_titulo}
              </span>
            ) : (
              <span>
                <i className="fa-solid fa-star" /> Tarefa geral
              </span>
            )}
            {tarefa.criado_por_nome && (
              <span>
                <i className="fa-solid fa-user" /> {tarefa.criado_por_nome}
              </span>
            )}
          </Meta>
        </TarefaInfo>
        <Acoes>
          {!tarefa.concluida && (
            <>
              <BtnEditar type="button" onClick={() => iniciarEdicao(tarefa)} title="Editar">
                <i className="fa-solid fa-pen" />
              </BtnEditar>
              <BtnConcluir type="button" onClick={() => handleConcluir(tarefa.id)} title="Concluir">
                <i className="fa-solid fa-check" />
              </BtnConcluir>
            </>
          )}
          <BtnExcluir type="button" onClick={() => handleExcluir(tarefa.id)} title="Excluir">
            <i className="fa-solid fa-trash" />
          </BtnExcluir>
        </Acoes>
      </TarefaItem>
    );
  }

  return (
    <PageContainer>
      <TopHeader>
        <HeaderContent>
          <div>
            <Title>Painel de Tarefas</Title>
            <SubTitle>Gerencie suas tarefas e acompanhe o progresso do time.</SubTitle>
          </div>
          <BtnNovaTarefa onClick={abrirModalNova}>
            <i className="fa-solid fa-plus" /> NOVA TAREFA
          </BtnNovaTarefa>
        </HeaderContent>
      </TopHeader>

      <Filtros>
        <FiltroGrupo>
          <label>Status</label>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="pendentes">Pendentes</option>
            <option value="concluidas">Concluídas</option>
            <option value="todos">Todas</option>
          </select>
        </FiltroGrupo>
        <FiltroGrupo>
          <label>Responsável</label>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
            <option value={meuId}>Minhas tarefas</option>
            <option value="todos">Todos</option>
            {colaboradores
              .filter((u) => u.id && u.id !== meuId)
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome}
                </option>
              ))}
          </select>
        </FiltroGrupo>
      </Filtros>

      {carregando ? (
        <EmptyMsg><i className="fa-solid fa-spinner fa-spin" /> Carregando tarefas...</EmptyMsg>
      ) : tarefasFiltradas.length === 0 ? (
        <EmptyMsg>Nenhuma tarefa encontrada para os filtros selecionados.</EmptyMsg>
      ) : (
        <TarefasLista>
          {pendentes.length > 0 && (
            <SectionBlock>
              <BlockTitle>Pendentes</BlockTitle>
              {pendentes.map(renderTarefaItem)}
            </SectionBlock>
          )}
          {concluidas.length > 0 && (
            <SectionBlock>
              <BlockTitle>Concluídas</BlockTitle>
              {concluidas.map(renderTarefaItem)}
            </SectionBlock>
          )}
        </TarefasLista>
      )}

      {mostrarModalNova && (
        <ModalOverlay onClick={fecharModalNova}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Nova Tarefa</h2>
              <BtnClose onClick={fecharModalNova}>&times;</BtnClose>
            </ModalHeader>
            <ModalBody>
              <FormField>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Ligar para o parceiro"
                  autoFocus
                />
              </FormField>
              <FormField>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição opcional"
                />
              </FormField>
              <FormField>
                <input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
              </FormField>
            </ModalBody>
            <ModalFooter>
              <BtnCancel onClick={fecharModalNova} disabled={salvando}>
                Cancelar
              </BtnCancel>
              <BtnCriar type="button" onClick={handleCriar} disabled={salvando}>
                <i className="fa-solid fa-plus" /> {salvando ? 'Salvando...' : 'Criar tarefa'}
              </BtnCriar>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
}

// ESTILOS
const PageContainer = styled.div`
  padding: 24px 30px;
  max-width: 1100px;
  margin: 0 auto;
`;

const TopHeader = styled.div`
  margin-bottom: 24px;
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 2rem;
  color: #0f172a;
`;

const SubTitle = styled.p`
  margin: 0;
  color: #475569;
  max-width: 780px;
`;

const BtnNovaTarefa = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border: none;
  border-radius: 14px;
  background: #2563eb;
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  &:hover {
    background: #1d4ed8;
  }
`;

const Filtros = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 16px;
  margin: 24px 0;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FiltroGrupo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label {
    color: #334155;
    font-weight: 700;
    font-size: 0.85rem;
  }
  select {
    width: 100%;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    padding: 12px 14px;
    font-size: 0.95rem;
    background: #f8fafc;
    color: #0f172a;
  }
`;

const TarefasLista = styled.div`
  display: grid;
  gap: 22px;
`;

const SectionBlock = styled.div`
  background: #ffffff;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
`;

const BlockTitle = styled.h3`
  margin: 0 0 16px;
  font-size: 1rem;
  color: #0f172a;
`;

const TarefaItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 18px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.16);
  ${(props) => props.$status === 'vencida' && `border-color: #dc2626; background: rgba(254, 226, 226, 0.9);`}
  ${(props) => props.$status === 'proxima' && `border-color: #f59e0b; background: rgba(254, 243, 199, 0.9);`}
  ${(props) => props.$status === 'concluida' && `opacity: 0.75;`}
`;

const TarefaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  strong {
    font-size: 1rem;
    color: #0f172a;
  }
  p {
    margin: 0;
    color: #334155;
    line-height: 1.5;
  }
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #64748b;
  font-size: 0.9rem;
  span {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }
`;

const Acoes = styled.div`
  display: flex;
  gap: 10px;
`;

const FormEdicao = styled.div`
  display: grid;
  gap: 12px;
  input, textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
    color: #0f172a;
  }
  textarea {
    min-height: 90px;
  }
`;

const FormEdicaoAcoes = styled.div`
  display: flex;
  gap: 10px;
`;

const BtnSalvar = styled.button`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: #16a34a;
  color: white;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.7; }
`;

const BtnCancelar2 = styled.button`
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: #e2e8f0;
  color: #334155;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.7; }
`;

const BtnEditar = styled.button`
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  cursor: pointer;
`;

const BtnConcluir = styled.button`
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: #0ea5e9;
  color: white;
  cursor: pointer;
`;

const BtnExcluir = styled.button`
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: #ef4444;
  color: white;
  cursor: pointer;
`;

const EmptyMsg = styled.div`
  padding: 40px 0;
  text-align: center;
  color: #64748b;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  h2 {
    margin: 0;
    font-size: 1.3rem;
    color: #0f172a;
  }
`;

const BtnClose = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  &:hover { color: #0f172a; }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormField = styled.div`
  input, textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 0.95rem;
    color: #0f172a;
    background: #f8fafc;
    font-family: inherit;
    &:focus {
      outline: none;
      border-color: #2563eb;
      background: white;
    }
  }
  textarea {
    min-height: 100px;
    resize: vertical;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
`;

const BtnCancel = styled.button`
  padding: 10px 20px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) { background: #e2e8f0; }
  &:disabled { opacity: 0.7; }
`;

const BtnCriar = styled.button`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: #16a34a;
  color: white;
  font-weight: 700;
  cursor: pointer;
  &:hover:not(:disabled) { background: #15803d; }
  &:disabled { opacity: 0.7; }
`;
