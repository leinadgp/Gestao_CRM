import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { getAuthHeaders } from '../utils/auth.js';

const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

const inscritoVazio = () => ({
  nome: '',
  email: '',
  telefone: '',
  formacao: '',
  cargo: '',
  contato_id: null,
  modulos_ids: [],
});

// Preserva todos os campos que vierem do backend (inclusive contato_id/modulos_ids) —
// versões antigas deste componente só guardavam nome/email/telefone/cargo/formação no
// estado local e reenviavam isso no PUT, apagando o vínculo com o contato de quem já
// tinha um ao simplesmente abrir e salvar o editor.
function normalizarListaInscritos(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [];
  return arr.map((i) => ({ ...inscritoVazio(), ...i }));
}

export function InscritosOportunidadeEditor({
  oportunidadeId,
  titulo = 'Inscritos no curso',
  compact = false,
  onSalvo,
}) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [qtdInscritos, setQtdInscritos] = useState(0);
  const [inscritos, setInscritos] = useState([inscritoVazio()]);
  const [editando, setEditando] = useState(false);

  const carregar = useCallback(async () => {
    if (!oportunidadeId) return;
    setCarregando(true);
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${oportunidadeId}/inscritos`, getAuthHeaders());
      const lista = normalizarListaInscritos(res.data.inscritos_json);
      setQtdInscritos(res.data.qtd_inscritos || lista.length || 0);
      setInscritos(lista.length ? lista : [inscritoVazio()]);
    } catch {
      setInscritos([inscritoVazio()]);
    } finally {
      setCarregando(false);
    }
  }, [oportunidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function atualizar(index, campo, valor) {
    setInscritos((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function adicionarInscrito() {
    setInscritos((prev) => [...prev, inscritoVazio()]);
    setQtdInscritos((prev) => (Number(prev) || 0) + 1);
  }

  function removerInscrito(index) {
    const ins = inscritos[index];
    const label = ins?.nome || ins?.email || `Inscrito ${index + 1}`;
    if (!window.confirm(`Remover "${label}" desta negociação?`)) return;
    setInscritos((prev) => prev.filter((_, i) => i !== index));
    // Acompanha a exclusão por padrão — nunca deixa cair abaixo do tamanho da lista
    // resultante, mas some junto quando dá pra saber que a quantidade "oficial"
    // representava justamente essas pessoas nomeadas.
    setQtdInscritos((prev) => Math.max(inscritos.length - 1, (Number(prev) || 0) - 1));
  }

  async function salvar(e) {
    e?.preventDefault();
    const lista = inscritos.filter((i) => i.nome || i.email);
    if (!lista.length) {
      alert('Informe pelo menos um inscrito com nome ou e-mail.');
      return;
    }
    setSalvando(true);
    try {
      await axios.put(
        `${API_URL}/oportunidades/${oportunidadeId}/inscritos`,
        {
          qtd_inscritos: Math.max(Number(qtdInscritos) || 0, lista.length),
          inscritos_json: lista,
        },
        getAuthHeaders()
      );
      setEditando(false);
      await carregar();
      onSalvo?.();
      alert('Inscritos atualizados.');
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao salvar inscritos.');
    } finally {
      setSalvando(false);
    }
  }

  if (!oportunidadeId) return null;

  if (carregando) {
    return <Wrap $compact={compact}><Muted><i className="fa-solid fa-spinner fa-spin" /> Carregando inscritos...</Muted></Wrap>;
  }

  return (
    <Wrap $compact={compact}>
      <HeaderRow>
        <Title $compact={compact}><i className="fa-solid fa-graduation-cap" /> {titulo}</Title>
        {!editando ? (
          <Btn type="button" onClick={() => setEditando(true)}>
            <i className="fa-solid fa-pen" /> Editar
          </Btn>
        ) : (
          <BtnGroup>
            <Btn type="button" className="muted" onClick={() => { setEditando(false); carregar(); }}>Cancelar</Btn>
            <Btn type="button" className="primary" disabled={salvando} onClick={salvar}>
              <i className="fa-solid fa-save" /> {salvando ? 'Salvando...' : 'Salvar'}
            </Btn>
          </BtnGroup>
        )}
      </HeaderRow>

      {!editando ? (
        <Lista>
          {inscritos.filter((i) => i.nome || i.email).length === 0 && (
            <Muted>Nenhum inscrito cadastrado nesta negociação.</Muted>
          )}
          {inscritos.filter((i) => i.nome || i.email).map((ins, idx) => (
            <Card key={idx}>
              <strong>{ins.nome || 'Sem nome'}</strong>
              <Line>{ins.email || '—'}</Line>
              {ins.telefone && <Line><i className="fa-solid fa-phone" /> {ins.telefone}</Line>}
              {ins.cargo && <Line><i className="fa-solid fa-briefcase" /> {ins.cargo}</Line>}
              {ins.formacao && <Line>{ins.formacao}</Line>}
            </Card>
          ))}
        </Lista>
      ) : (
        <form onSubmit={salvar}>
          <Field>
            <label>Quantidade oficial de inscritos</label>
            <input
              type="number"
              min={inscritos.length || 1}
              value={qtdInscritos || ''}
              onChange={(e) => setQtdInscritos(e.target.value)}
            />
            <Hint>Use isso pra registrar um total maior do que a lista abaixo (ex.: gente confirmada sem nome ainda). Nunca fica menor que a quantidade de inscritos nomeados.</Hint>
          </Field>

          {inscritos.map((ins, idx) => (
            <Card key={idx} $edit>
              <CardTop>
                <small>Inscrito {idx + 1}</small>
                <BtnRemover type="button" onClick={() => removerInscrito(idx)} title="Remover este inscrito">
                  <i className="fa-solid fa-trash" /> Remover
                </BtnRemover>
              </CardTop>
              <Field><label>Nome</label><input value={ins.nome} onChange={(e) => atualizar(idx, 'nome', e.target.value)} /></Field>
              <Field><label>E-mail</label><input type="email" value={ins.email} onChange={(e) => atualizar(idx, 'email', e.target.value)} /></Field>
              <Field><label>Telefone</label><input value={ins.telefone} onChange={(e) => atualizar(idx, 'telefone', e.target.value)} /></Field>
              <Field><label>Cargo</label><input value={ins.cargo} onChange={(e) => atualizar(idx, 'cargo', e.target.value)} /></Field>
              <Field><label>Formação</label><input value={ins.formacao} onChange={(e) => atualizar(idx, 'formacao', e.target.value)} /></Field>
            </Card>
          ))}

          <Btn type="button" className="primary" onClick={adicionarInscrito} style={{ alignSelf: 'flex-start' }}>
            <i className="fa-solid fa-plus" /> Adicionar inscrito
          </Btn>
        </form>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  margin-top: ${(p) => (p.$compact ? '12px' : '16px')};
  padding: ${(p) => (p.$compact ? '12px' : '16px')};
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
`;
const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;
const Title = styled.h4`
  margin: 0;
  font-size: ${(p) => (p.$compact ? '0.9rem' : '1rem')};
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
`;
const BtnGroup = styled.div` display: flex; gap: 8px; flex-wrap: wrap; `;
const Btn = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &.primary { background: #007bff; color: #fff; border-color: #007bff; }
  &.muted { background: #e2e8f0; }
  &:disabled { opacity: 0.6; }
`;
const Lista = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Card = styled.div`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #edf2f9;
  background: ${(p) => (p.$edit ? '#f8fafc' : '#fff')};
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: ${(p) => (p.$edit ? '10px' : '0')};
  strong { color: #0f172a; }
  small { font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 0.7rem; }
`;
const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const BtnRemover = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  background: #fff5f5;
  color: #dc3545;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover { background: #dc3545; color: #fff; }
`;
const Line = styled.div` font-size: 0.85rem; color: #475569; `;
const Muted = styled.p` margin: 0; color: #94a3b8; font-size: 0.85rem; font-style: italic; `;
const Hint = styled.p` margin: 2px 0 0; color: #94a3b8; font-size: 0.72rem; `;
const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  label { font-size: 0.75rem; font-weight: 600; color: #64748b; }
  input {
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.9rem;
  }
`;
