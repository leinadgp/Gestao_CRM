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

  function abrirNovo() {
    setEditandoId(null); setNome(''); setDescricao('');
    setMostrarForm(true);
  }

  function prepararEdicao(c) {
    setEditandoId(c.id); setNome(c.nome); setDescricao(c.descricao || '');
    setMostrarForm(true);
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      if (editandoId) await axios.put(`${API_URL}/campanhas/${editandoId}`, { nome, descricao }, getHeaders());
      else await axios.post(`${API_URL}/campanhas`, { nome, descricao }, getHeaders());
      setMostrarForm(false);
      carregarCampanhas();
    } catch (err) { alert('Erro ao salvar campanha.'); }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir esta campanha?")) return;
    try {
      await axios.delete(`${API_URL}/campanhas/${id}`, getHeaders());
      carregarCampanhas();
    } catch (err) { alert("Erro ao excluir."); }
  }

  return (
    <div>
      <Header titulo="Gestão de Campanhas" />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Campanhas de Vendas</h2>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Crie campanhas para atrelar às suas negociações no Funil.</p>
          </div>
          <button onClick={abrirNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-bullhorn"></i> Nova Campanha
          </button>
        </div>

        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '5px solid #007bff', marginBottom: '20px' }}>
            <h3>{editandoId ? 'Editar Campanha' : 'Nova Campanha'}</h3>
            <form onSubmit={salvar} style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label>Nome da Campanha *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div>
                <label>Descrição / Objetivo</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ padding: '10px 20px', border: 'none', background: '#eee', borderRadius: '6px' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '6px' }}>Salvar</button>
              </div>
            </form>
          </div>
        )}

        <div className="panel" style={{ padding: '20px' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '10px' }}>Nome</th>
                <th style={{ padding: '10px' }}>Descrição</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>Carregando...</td></tr> : 
               campanhas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.nome}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{c.descricao || '-'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
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