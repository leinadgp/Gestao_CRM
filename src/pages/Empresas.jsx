// src/pages/Empresas.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Controle do Formulário
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefones, setTelefones] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

  // Busca as empresas ao abrir a tela
  useEffect(() => {
    buscarEmpresas();
  }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function buscarEmpresas() {
    setCarregando(true);
    try {
      const resposta = await axios.get(`${API_URL}/empresas`, getHeaders());
      setEmpresas(resposta.data);
    } catch (erro) {
      console.error('Erro ao buscar empresas:', erro);
      alert('Erro ao carregar a lista de empresas.');
    } finally {
      setCarregando(false);
    }
  }

  function abrirFormularioNovo() {
    setEditandoId(null);
    setNome('');
    setEstado('');
    setCidade('');
    setTelefones('');
    setMostrarForm(true);
  }

  function prepararEdicao(empresa) {
    setEditandoId(empresa.id);
    setNome(empresa.nome);
    setEstado(empresa.estado || '');
    setCidade(empresa.cidade || '');
    setTelefones(empresa.telefones || '');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fecharFormulario() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  async function salvarEmpresa(e) {
    e.preventDefault();
    const dados = { nome, estado, cidade, telefones };

    try {
      if (editandoId) {
        // Atualizar
        await axios.put(`${API_URL}/empresas/${editandoId}`, dados, getHeaders());
      } else {
        // Criar Novo
        await axios.post(`${API_URL}/empresas`, dados, getHeaders());
      }
      
      fecharFormulario();
      buscarEmpresas(); // Recarrega a tabela atualizada
    } catch (erro) {
      console.error(erro);
      alert('Erro ao salvar empresa.');
    }
  }

  async function deletarEmpresa(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;

    try {
      await axios.delete(`${API_URL}/empresas/${id}`, getHeaders());
      buscarEmpresas();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao excluir. Verifique se existem contatos atrelados a ela.');
    }
  }

  return (
    <div>
      <Header titulo="Gestão de Empresas" />

      <div className="page-container">
        {/* === CABEÇALHO E BOTÃO NOVO === */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#333' }}>Empresas & Prefeituras</h2>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Cadastre os locais onde seus contatos trabalham.</p>
          </div>
          
          {!mostrarForm && (
            <button 
              onClick={abrirFormularioNovo} 
              style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <i className="fa-solid fa-plus-circle"></i> + Nova Empresa
            </button>
          )}
        </div>

        {/* === FORMULÁRIO (Exibido condicionalmente) === */}
        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="panel-title">
              {editandoId ? 'Atualizar Empresa' : 'Cadastrar Nova Empresa'}
            </div>
            
            <form onSubmit={salvarEmpresa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Nome da Prefeitura / Empresa *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Estado (UF)</label>
                <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength="2" placeholder="Ex: RS" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Cidade</label>
                <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Taquara" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Telefone Geral</label>
                <input type="text" value={telefones} onChange={(e) => setTelefones(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={fecharFormulario} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Empresa</button>
              </div>
            </form>
          </div>
        )}

        {/* === TABELA DE EMPRESAS === */}
        <div className="panel">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cidade / UF</th>
                  <th>Telefone</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
                ) : empresas.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma empresa cadastrada.</td></tr>
                ) : (
                  empresas.map(empresa => (
                    <tr key={empresa.id}>
                      <td style={{ fontWeight: 600, color: '#1c1e21' }}>{empresa.nome}</td>
                      <td>{empresa.cidade || '-'} {empresa.estado ? `(${empresa.estado})` : ''}</td>
                      <td>{empresa.telefones || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => prepararEdicao(empresa)}
                          style={{ background: '#ffc107', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }} title="Editar"
                        >
                          <i className="fa-solid fa-pencil-alt"></i>
                        </button>
                        <button 
                          onClick={() => deletarEmpresa(empresa.id)}
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