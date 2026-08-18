import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { listarNotasOportunidade, criarNota, atualizarNota } from '../utils/notasService.js';

// Extraído do Funil.jsx (Bloco de performance): a lista de notas tinha seu estado
// (notas, texto digitado, edição) dentro do componente gigante da tela do funil,
// então cada tecla digitada aqui forçava o React a re-renderizar o quadro Kanban
// inteiro (todas as colunas e cards). Isolando esse estado neste componente,
// digitar uma nota só re-renderiza este bloco.
export function NotasOportunidade({ oportunidadeId }) {
  const [notas, setNotas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [textoNotaEditada, setTextoNotaEditada] = useState('');

  const carregarNotas = useCallback(async () => {
    if (!oportunidadeId) return;
    setCarregando(true);
    try {
      const lista = await listarNotasOportunidade(oportunidadeId);
      setNotas(lista);
    } catch {
      setNotas([]);
    } finally {
      setCarregando(false);
    }
  }, [oportunidadeId]);

  // Sem reset manual de estado aqui: o componente é remontado (via key={oportunidadeId}
  // no Funil.jsx) toda vez que a negociação aberta muda, então o estado já nasce limpo.
  useEffect(() => {
    carregarNotas();
  }, [carregarNotas]);

  async function adicionarNota() {
    if (!novaNota.trim() || !oportunidadeId) return;
    try {
      const nota = await criarNota(oportunidadeId, novaNota);
      setNotas((atuais) => [nota, ...atuais]);
      setNovaNota('');
    } catch { alert('Erro ao adicionar nota.'); }
  }

  function iniciarEdicaoNota(nota) { setEditandoNotaId(nota.id); setTextoNotaEditada(nota.nota); }
  function cancelarEdicaoNota() { setEditandoNotaId(null); setTextoNotaEditada(''); }

  async function salvarNotaEditada(id) {
    if (!textoNotaEditada.trim()) return;
    try {
      const notaAtualizada = await atualizarNota(id, textoNotaEditada);
      setNotas((atuais) => atuais.map((n) => (n.id === id ? notaAtualizada : n)));
      cancelarEdicaoNota();
    } catch { alert('Erro ao editar a nota.'); }
  }

  return (
    <SectionCard>
      <label style={{ display: 'block', marginBottom: '15px', color: '#333', fontSize: '0.95rem', fontWeight: 'bold' }}>
        <i className="fa-solid fa-comments text-blue"></i> Histórico de Interações (Notas)
      </label>

      <NotesFeed>
        {carregando ? (
          <div className="empty-notes"><i className="fa-solid fa-spinner fa-spin"></i> Carregando notas...</div>
        ) : notas.length === 0 ? (
          <div className="empty-notes">Nenhuma nota registrada nesta negociação.</div>
        ) : (
          notas.map((n) => (
            <NoteItem key={n.id}>
              {editandoNotaId === n.id ? (
                <>
                  <TextArea value={textoNotaEditada} onChange={(e) => setTextoNotaEditada(e.target.value)} rows="2" className="highlight-blue" />
                  <div className="note-actions">
                    <button type="button" className="btn-cancel" onClick={cancelarEdicaoNota}>Cancelar</button>
                    <button type="button" className="btn-save" onClick={() => salvarNotaEditada(n.id)}>Salvar</button>
                  </div>
                </>
              ) : (
                <>
                  <NoteHeader>
                    <strong className="user"><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong>
                    <div className="meta">
                      <span>{new Date(n.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                      <button type="button" className="btn-edit" onClick={() => iniciarEdicaoNota(n)}><i className="fa-solid fa-pen"></i></button>
                    </div>
                  </NoteHeader>
                  <NoteBody>{n.nota}</NoteBody>
                </>
              )}
            </NoteItem>
          ))
        )}
      </NotesFeed>

      {oportunidadeId && (
        <AddNoteBox>
          <Input
            type="text"
            value={novaNota}
            onChange={(e) => setNovaNota(e.target.value)}
            placeholder="Escreva o que conversou hoje..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarNota(); } }}
          />
          <button type="button" onClick={adicionarNota} className="btn-send"><i className="fa-solid fa-paper-plane"></i></button>
        </AddNoteBox>
      )}
    </SectionCard>
  );
}

const SectionCard = styled.div`
  background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 20px;
  @media (max-width: 600px) { padding: 15px; }
`;

const Input = styled.input`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; transition: 0.2s; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; resize: vertical; transition: 0.2s; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { border-color: #007bff; background: #f0f7ff; }
`;

const NotesFeed = styled.div`
  display: flex; flex-direction: column; gap: 12px; max-height: 250px; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;
  &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .empty-notes { text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 20px; font-style: italic; }
`;
const NoteItem = styled.div`
  background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #007bff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);

  .note-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  .btn-cancel { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 4px; color: #475569; font-weight: 600; cursor: pointer; }
  .btn-save { background: #007bff; border: none; padding: 6px 12px; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer; }
`;
const NoteHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
  .user { display: flex; align-items: center; gap: 6px; color: #2c3e50; font-size: 0.9rem; }
  .meta { display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 0.8rem; font-weight: 600; }
  .btn-edit { background: none; border: none; color: #007bff; cursor: pointer; opacity: 0.5; transition: 0.2s; &:hover{ opacity: 1; transform: scale(1.1); } }
`;
const NoteBody = styled.div`
  color: #475569; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;
`;

const AddNoteBox = styled.div`
  display: flex; gap: 10px;
  .btn-send { background: #28a745; color: #fff; border: none; padding: 0 20px; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.2s; &:hover{ background: #218838; } }
`;
