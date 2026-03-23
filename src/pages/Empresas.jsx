// src/pages/Empresas.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // Pegamos o perfil do usuário para esconder/mostrar coisas
  const perfilUsuario = localStorage.getItem('perfil');

  // === FILTROS DA TABELA ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Controle de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15; // Quantidade de itens por tela
  
  // Controle do Formulário
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefones, setTelefones] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

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
    } finally {
      setCarregando(false);
    }
  }

  // === LÓGICA DE FILTRAGEM DINÂMICA ===
  const empresasFiltradas = empresas.filter(emp => {
    const termo = buscaGeral.toLowerCase();
    const matchBusca = (emp.nome || '').toLowerCase().includes(termo) ||
                       (emp.cidade || '').toLowerCase().includes(termo);
    const matchEstado = filtroEstado === '' || (emp.estado || '').toUpperCase() === filtroEstado.toUpperCase();
    return matchBusca && matchEstado;
  });

  // === LÓGICA DE ORDENAÇÃO (ESTADO -> CIDADE) SOBRE A LISTA FILTRADA ===
  const empresasOrdenadas = [...empresasFiltradas].sort((a, b) => {
    const estadoA = a.estado || '';
    const estadoB = b.estado || '';
    if (estadoA === estadoB) {
      return (a.cidade || '').localeCompare(b.cidade || '');
    }
    return estadoA.localeCompare(estadoB);
  });

  // === LÓGICA DE PAGINAÇÃO ===
  const totalPaginas = Math.ceil(empresasOrdenadas.length / itensPorPagina);
  const itensAtuais = empresasOrdenadas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // === FUNÇÕES DE CRUD ===
  function abrirFormularioNovo() {
    setEditandoId(null); setNome(''); setEstado(''); setCidade(''); setTelefones('');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setMostrarForm(false); setEditandoId(null);
  }

  async function salvarEmpresa(e) {
    e.preventDefault();
    const dados = { nome, estado, cidade, telefones };
    try {
      if (editandoId) await axios.put(`${API_URL}/empresas/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/empresas`, dados, getHeaders());
      fecharFormulario();
      buscarEmpresas(); 
    } catch (erro) { 
      alert(erro.response?.data?.erro || 'Erro ao salvar empresa.'); 
    }
  }

  async function deletarEmpresa(id) {
    if (!window.confirm('Excluir esta empresa permanentemente?')) return;
    try {
      await axios.delete(`${API_URL}/empresas/${id}`, getHeaders());
      buscarEmpresas();
    } catch (erro) { 
      alert('Erro ao excluir. Verifique se existem contatos atrelados a esta prefeitura.'); 
    }
  }

  return (
    <div>
      <Header titulo="Gestão de Empresas" />

      <div className="page-container">
        
        {/* === BARRA DE FILTROS E BUSCA === */}
        <div className="panel" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 120px', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '13px', color: '#aaa' }}></i>
            <input
              placeholder="Pesquisar por Nome ou Cidade..."
              value={buscaGeral}
              onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }}
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          
          <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaAtual(1); }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="">Todos os Estados</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
            <option value="SC">Santa Catarina (SC)</option>
            <option value="PR">Paraná (PR)</option>
            <option value="SP">São Paulo (SP)</option>
          </select>

          <button onClick={abrirFormularioNovo} style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Nova
          </button>
        </div>

        {/* === FORMULÁRIO DE CADASTRO/EDIÇÃO === */}
        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '5px solid #007bff', marginBottom: '20px' }}>
            <div className="panel-title" style={{ marginBottom: '15px' }}>
              <i className="fa-solid fa-building"></i> {editandoId ? 'Atualizar Empresa' : 'Cadastrar Nova Empresa'}
            </div>
            
            <form onSubmit={salvarEmpresa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Estado (UF)</label>
                <input type="text" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Cidade</label>
                <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Telefone Geral</label>
                <input type="text" value={telefones} onChange={(e) => setTelefones(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button type="button" onClick={fecharFormulario} style={{ background: '#eee', color: '#333', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: '#007bff', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-save"></i> {editandoId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* === TABELA DE RESULTADOS === */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Nome da Empresa / Prefeitura</th>
                  <th>Cidade / UF</th>
                  <th>Telefone</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
                ) : itensAtuais.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma empresa encontrada com estes filtros.</td></tr>
                ) : (
                  itensAtuais.map(empresa => (
                    <tr key={empresa.id}>
                      <td style={{ fontWeight: 600, color: '#1c1e21' }}>{empresa.nome}</td>
                      <td>
                        {empresa.cidade || '-'} 
                        {empresa.estado && <span style={{ color: '#007bff', fontWeight: 'bold' }}> ( {empresa.estado} )</span>}
                      </td>
                      <td>{empresa.telefones || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => prepararEdicao(empresa)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }} title="Editar">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        
                        {/* A MÁGICA DO RBAC AQUI: Só o Admin vê a Lixeira */}
                        {perfilUsuario === 'admin' && (
                          <button onClick={() => deletarEmpresa(empresa.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* === PAGINAÇÃO === */}
          {!carregando && empresasOrdenadas.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                {empresasOrdenadas.length} empresas encontradas
              </div>
              <div className="pagination-controls">
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)} title="Primeira">
                  <i className="fa-solid fa-angles-left"></i>
                </button>
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>
                  Anterior
                </button>
                <span style={{ padding: '0 15px', fontWeight: 'bold' }}>{paginaAtual} de {totalPaginas}</span>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>
                  Próxima
                </button>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)} title="Última">
                  <i className="fa-solid fa-angles-right"></i>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}