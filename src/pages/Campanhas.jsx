// src/pages/Campanhas.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const perfilUsuario = localStorage.getItem('perfil');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // NOVO: Array dinâmico de etapas
  const [etapasForm, setEtapasForm] = useState(['Lead', 'Contato Feito', 'Proposta Enviada', 'Fechamento']);

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => { carregarCampanhas(); }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarCampanhas() {
    setCarregando(true);
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      setCampanhas(res.data);
    } catch (e) { console.error(e); } finally { setCarregando(false); }
  }

  // === LÓGICA DAS ETAPAS ===
  function adicionarEtapa() { setEtapasForm([...etapasForm, 'Nova Etapa']); }
  function removerEtapa(index) { setEtapasForm(etapasForm.filter((_, i) => i !== index)); }
  function atualizarEtapa(index, valor) {
    const novoArray = [...etapasForm];
    novoArray[index] = valor;
    setEtapasForm(novoArray);
  }

  function abrirNovo() {
    setEditandoId(null); setNome(''); setDescricao('');
    setEtapasForm(['Lead', 'Contato Feito', 'Proposta Enviada', 'Fechamento']); // Reseta o funil padrão
    setMostrarForm(true);
  }

  function prepararEdicao(c) {
    setEditandoId(c.id); setNome(c.nome); setDescricao(c.descricao || '');
    setEtapasForm([]); // Edição de etapas existentes exigiria painel à parte, mantemos simples
    setMostrarForm(true);
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      if (editandoId) {
        await axios.put(`${API_URL}/campanhas/${editandoId}`, { nome, descricao }, getHeaders());
      } else {
        // Envia as etapas atreladas na hora da CRIAÇÃO
        await axios.post(`${API_URL}/campanhas`, { nome, descricao, etapas: etapasForm.filter(e => e.trim() !== '') }, getHeaders());
      }
      setMostrarForm(false);
      carregarCampanhas();
    } catch (err) { alert('Erro ao salvar campanha.'); }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir esta campanha? Os funis e oportunidades dela serão afetados.")) return;
    try {
      await axios.delete(`${API_URL}/campanhas/${id}`, getHeaders());
      carregarCampanhas();
    } catch (err) { alert("Erro ao excluir. Pode haver negociações atreladas."); }
  }

  return (
    <div>
      <Header titulo="Gestão de Campanhas e Funis" />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Múltiplos Funis (Campanhas)</h2>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Crie campanhas e defina as etapas personalizadas para cada uma.</p>
          </div>
          <button onClick={abrirNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-layer-group"></i> Nova Campanha
          </button>
        </div>

        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '5px solid #007bff', marginBottom: '20px' }}>
            <h3>{editandoId ? 'Editar Dados da Campanha' : 'Criar Campanha e Construir Funil'}</h3>
            <form onSubmit={salvar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 'bold' }}>Nome da Campanha / Curso *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 'bold' }}>Descrição / Objetivo</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>

              {/* CONSTRUTOR DE FUNIL (Só aparece ao criar nova) */}
              {!editandoId && (
                <div style={{ gridColumn: 'span 2', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333', display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span><i className="fa-solid fa-filter"></i> Etapas do Funil Desta Campanha</span>
                    <button type="button" onClick={adicionarEtapa} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>+ Adicionar Etapa</button>
                  </label>
                  
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {etapasForm.map((etapa, index) => (
                      <div key={index} style={{ minWidth: '200px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '10px', position: 'relative' }}>
                        <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '5px', fontWeight: 'bold' }}>ETAPA {index + 1}</div>
                        <input type="text" value={etapa} onChange={e => atualizarEtapa(index, e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '2px solid #007bff', outline: 'none', fontWeight: 'bold', color: '#333' }} />
                        {etapasForm.length > 1 && (
                          <button type="button" onClick={() => removerEtapa(index)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}><i className="fa-solid fa-times"></i></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ padding: '10px 20px', border: 'none', background: '#eee', borderRadius: '6px' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '6px', fontWeight: 'bold' }}><i className="fa-solid fa-save"></i> Salvar Campanha</button>
              </div>
            </form>
          </div>
        )}

        <div className="panel" style={{ padding: '0' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '15px' }}>Campanha / Funil</th>
                <th style={{ padding: '15px' }}>Descrição</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>Carregando...</td></tr> : 
               campanhas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#007bff' }}><i className="fa-solid fa-bullhorn"></i> {c.nome}</td>
                  <td style={{ padding: '15px', color: '#666' }}>{c.descricao || '-'}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button onClick={() => prepararEdicao(c)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }}><i className="fa-solid fa-pen-to-square"></i></button>
                    {perfilUsuario === 'admin' && <button onClick={() => excluir(c.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }}><i className="fa-solid fa-trash-can"></i></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}