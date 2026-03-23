// src/pages/Contatos.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Contatos() {
  // Estados para as listas
  const [contatos, setContatos] = useState([]);
  const [empresas, setEmpresas] = useState([]); // Para preencher o dropdown
  const [carregando, setCarregando] = useState(true);
  
  // Controle do Formulário
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [emails, setEmails] = useState('');
  const [telefones, setTelefones] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // Busca contatos e empresas ao mesmo tempo
  async function carregarDadosIniciais() {
    setCarregando(true);
    try {
      const [resContatos, resEmpresas] = await Promise.all([
        axios.get(`${API_URL}/contatos`, getHeaders()),
        axios.get(`${API_URL}/empresas`, getHeaders())
      ]);
      setContatos(resContatos.data);
      setEmpresas(resEmpresas.data);
    } catch (erro) {
      console.error('Erro ao buscar dados:', erro);
    } finally {
      setCarregando(false);
    }
  }

  function abrirFormularioNovo() {
    setEditandoId(null);
    setNome('');
    setEmails('');
    setTelefones('');
    setCargo('');
    setEmpresaId('');
    setMostrarForm(true);
  }

  function prepararEdicao(contato) {
    setEditandoId(contato.id);
    setNome(contato.nome);
    setEmails(contato.emails || '');
    setTelefones(contato.telefones || '');
    setCargo(contato.cargo || '');
    setEmpresaId(contato.empresa_id || '');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fecharFormulario() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  async function salvarContato(e) {
    e.preventDefault();
    // Se empresaId for uma string vazia, enviamos null para o banco
    const dados = { 
      nome, 
      emails, 
      telefones, 
      cargo, 
      empresa_id: empresaId || null 
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/contatos/${editandoId}`, dados, getHeaders());
      } else {
        await axios.post(`${API_URL}/contatos`, dados, getHeaders());
      }
      fecharFormulario();
      carregarDadosIniciais(); // Recarrega a tabela
    } catch (erro) {
      console.error(erro);
      alert('Erro ao salvar contato.');
    }
  }

  async function deletarContato(id) {
    if (!window.confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      carregarDadosIniciais();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao excluir contato.');
    }
  }

  return (
    <div>
      <Header titulo="Gestão de Contatos" />

      <div className="page-container">
        {/* === CABEÇALHO === */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#333' }}>Pessoas Físicas</h2>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Cadastre os funcionários e responsáveis de cada empresa.</p>
          </div>
          
          {!mostrarForm && (
            <button 
              onClick={abrirFormularioNovo} 
              style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <i className="fa-solid fa-user-plus"></i> + Novo Contato
            </button>
          )}
        </div>

        {/* === FORMULÁRIO === */}
        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="panel-title">
              {editandoId ? 'Atualizar Contato' : 'Cadastrar Novo Contato'}
            </div>
            
            <form onSubmit={salvarContato} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Nome Completo *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              {/* A MÁGICA ACONTECE AQUI: Dropdown de Empresas */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Vincular a uma Empresa / Prefeitura</label>
                <select 
                  value={empresaId} 
                  onChange={(e) => setEmpresaId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
                >
                  <option value="">-- Nenhuma empresa (Avulso) --</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome} {emp.estado ? `(${emp.estado})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Cargo / Função</label>
                <select 
                  value={cargo} 
                  onChange={(e) => setCargo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
                >
                  <option value="" disabled>Selecione um Cargo...</option>
                  <option value="CI-R">CI-R</option>
                  <option value="CI-E">CI-E</option>
                  <option value="Licita">Licita</option>
                  <option value="Prefeito">Prefeito</option>
                  <option value="Secretário">Secretário(a)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Telefone (WhatsApp)</label>
                <input type="text" value={telefones} onChange={(e) => setTelefones(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>E-mail</label>
                <input type="email" value={emails} onChange={(e) => setEmails(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={fecharFormulario} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Contato</button>
              </div>
            </form>
          </div>
        )}

        {/* === TABELA DE CONTATOS === */}
        <div className="panel">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome do Contato</th>
                  <th>Empresa Vinculada</th>
                  <th>Cargo</th>
                  <th>Telefone</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
                ) : contatos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Nenhum contato cadastrado.</td></tr>
                ) : (
                  contatos.map(contato => (
                    <tr key={contato.id}>
                      <td style={{ fontWeight: 600, color: '#1c1e21' }}>{contato.nome}</td>
                      {/* Aqui usamos o empresa_nome que veio do JOIN no Node.js */}
                      <td style={{ color: '#555' }}>
                        {contato.empresa_nome ? (
                          <><i className="fa-solid fa-building" style={{ color: '#888', marginRight: '5px' }}></i> {contato.empresa_nome}</>
                        ) : (
                          <span style={{ color: '#aaa', fontStyle: 'italic' }}>Sem vínculo</span>
                        )}
                      </td>
                      <td><span className={`badge ${contato.cargo || 'default'}`}>{contato.cargo || '-'}</span></td>
                      <td>{contato.telefones || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => prepararEdicao(contato)}
                          style={{ background: '#ffc107', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }} title="Editar"
                        >
                          <i className="fa-solid fa-pencil-alt"></i>
                        </button>
                        <button 
                          onClick={() => deletarContato(contato.id)}
                          style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }} title="Excluir"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}