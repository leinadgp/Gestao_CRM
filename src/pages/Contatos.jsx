// src/pages/Contatos.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Contatos() {
  const [contatos, setContatos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const perfilUsuario = localStorage.getItem('perfil');

  // === FILTROS DA TABELA PRINCIPAL ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');

  // === ESTADOS DO FORMULÁRIO ===
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [emails, setEmails] = useState('');
  const [telefones, setTelefones] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  // === ESTADOS DO DROPDOWN PESQUISÁVEL (PREFEITURAS) ===
  const [buscaEmpresaNoForm, setBuscaEmpresaNoForm] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => {
    carregarDados();
  }, []);

  // Lógica para fechar dropdown e restaurar nome se clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
        
        // Se houver uma empresa selecionada, volta o nome dela para o campo ao fechar
        if (empresaId) {
          const atual = empresas.find(e => e.id === parseInt(empresaId));
          if (atual) setBuscaEmpresaNoForm(atual.nome);
        } else {
          setBuscaEmpresaNoForm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [empresaId, empresas]);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarDados() {
    setCarregando(true);
    try {
      const [resC, resE] = await Promise.all([
        axios.get(`${API_URL}/contatos`, getHeaders()),
        axios.get(`${API_URL}/empresas`, getHeaders())
      ]);
      setContatos(resC.data);
      setEmpresas(resE.data);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      setCarregando(false);
    }
  }

  // === FILTRAGEM DINÂMICA DA TABELA ===
  const contatosFiltrados = contatos.filter(c => {
    const termo = buscaGeral.toLowerCase();
    const matchBusca = (c.nome || '').toLowerCase().includes(termo) ||
                       (c.empresa_nome || '').toLowerCase().includes(termo) ||
                       (c.cidade || '').toLowerCase().includes(termo);
    const matchEstado = filtroEstado === '' || (c.estado || '').toUpperCase() === filtroEstado.toUpperCase();
    const matchCargo = filtroCargo === '' || c.cargo === filtroCargo;
    return matchBusca && matchEstado && matchCargo;
  });

  // === FILTRAGEM DO SELECT DE EMPRESAS NO FORMULÁRIO ===
  const empresasFiltradasParaSelect = empresas.filter(e =>
    e.nome.toLowerCase().includes(buscaEmpresaNoForm.toLowerCase())
  );

  const totalPaginas = Math.ceil(contatosFiltrados.length / itensPorPagina);
  const itensExibidos = contatosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // === FUNÇÕES DE AÇÃO ===
  function abrirNovo() {
    setEditandoId(null); setNome(''); setEmails(''); setTelefones(''); setCargo(''); setEmpresaId('');
    setBuscaEmpresaNoForm(''); setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prepararEdicao(c) {
    setEditandoId(c.id);
    setNome(c.nome || '');
    setEmails(c.emails || '');
    setTelefones(c.telefones || '');
    setCargo(c.cargo || '');
    setEmpresaId(c.empresa_id || '');
    setBuscaEmpresaNoForm(c.empresa_nome || '');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    const dados = { nome, emails, telefones, cargo, empresa_id: empresaId || null };
    try {
      if (editandoId) await axios.put(`${API_URL}/contatos/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/contatos`, dados, getHeaders());
      setMostrarForm(false);
      carregarDados();
    } catch (err) {
      alert('Erro ao salvar contato.');
    }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir este contato permanentemente?")) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      carregarDados();
    } catch (err) {
      alert("Erro ao excluir contato.");
    }
  }

  return (
    <div>
      <Header titulo="Gestão de Contatos" />
      <div className="page-container">

        {/* BARRA DE FILTROS DA LISTA */}
        <div className="panel" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '13px', color: '#aaa' }}></i>
            <input
              placeholder="Pesquisar Nome, Prefeitura ou Cidade..."
              value={buscaGeral}
              onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }}
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaAtual(1); }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="">Todos Estados</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
            <option value="SC">Santa Catarina (SC)</option>
            <option value="PR">Paraná (PR)</option>
            <option value="SP">São Paulo (SP)</option>
          </select>
          <select value={filtroCargo} onChange={e => { setFiltroCargo(e.target.value); setPaginaAtual(1); }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="">Todos Cargos</option>
            <option value="Prefeito">Prefeito</option>
            <option value="Secretário">Secretário</option>
            <option value="Licita">Licita</option>
            <option value="CI-R">CI-R</option>
            <option value="CI-E">CI-E</option>
          </select>
          <button onClick={abrirNovo} style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Novo
          </button>
        </div>

        {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
        {mostrarForm && (
          <div className="panel" style={{ borderLeft: '5px solid #007bff', marginBottom: '20px' }}>
            <div className="panel-title" style={{ marginBottom: '15px' }}>
              <i className="fa-solid fa-user-edit"></i> {editandoId ? `Editando: ${nome}` : 'Novo Contato'}
            </div>

            <form onSubmit={salvar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Nome Completo *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>E-mail</label>
                <input type="email" value={emails} onChange={e => setEmails(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Cargo / Função</label>
                <select value={cargo} onChange={e => setCargo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  <option value="">Selecione...</option>
                  <option value="Prefeito">Prefeito</option>
                  <option value="Secretário">Secretário</option>
                  <option value="Licita">Licita</option>
                  <option value="CI-R">CI-R</option>
                  <option value="CI-E">CI-E</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>WhatsApp</label>
                <input type="text" value={telefones} onChange={e => setTelefones(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              </div>

              {/* DROPDOWN PESQUISÁVEL DE PREFEITURAS */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Vincular Prefeitura</label>
                <div className="custom-select-container" ref={dropdownRef}>
                  <input
                    type="text"
                    className="custom-select-input"
                    placeholder="🔍 Clique para pesquisar na lista..."
                    value={buscaEmpresaNoForm}
                    autoComplete="off"
                    onFocus={() => {
                      setBuscaEmpresaNoForm(''); // Limpa ao clicar
                      setMostrarDropdown(true);
                    }}
                    onChange={(e) => {
                      setBuscaEmpresaNoForm(e.target.value);
                      setMostrarDropdown(true);
                    }}
                  />
                  {mostrarDropdown && (
                    <div className="custom-select-dropdown">
                      <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold', borderBottom: '2px solid #eee' }} onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                        <i className="fa-solid fa-eraser"></i> Sem Vínculo (Limpar)
                      </div>
                      {empresasFiltradasParaSelect.length > 0 ? (
                        empresasFiltradasParaSelect.map(emp => (
                          <div 
                            key={emp.id} 
                            className="custom-select-option" 
                            style={parseInt(empresaId) === emp.id ? { background: '#e7f3ff', borderLeft: '4px solid #007bff' } : {}}
                            onClick={() => { 
                              setEmpresaId(emp.id); 
                              setBuscaEmpresaNoForm(emp.nome); 
                              setMostrarDropdown(false); 
                            }}
                          >
                            <strong>{emp.nome}</strong> <span style={{ color: '#999' }}>({emp.estado})</span>
                            {parseInt(empresaId) === emp.id && <i className="fa-solid fa-check" style={{ float: 'right', color: '#007bff', marginTop: '3px' }}></i>}
                          </div>
                        ))
                      ) : (
                        <div className="custom-select-no-results">Nenhuma prefeitura encontrada.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setMostrarForm(false)} style={{ padding: '10px 25px', border: 'none', background: '#eee', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 25px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-save"></i> {editandoId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABELA DE RESULTADOS */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Empresa / UF</th>
                  <th>Cargo</th>
                  <th>WhatsApp</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Nenhum contato encontrado.</td></tr>
                ) : (
                  itensExibidos.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.nome}</strong><br />
                        <small style={{ color: '#666' }}>{c.emails || 'Sem e-mail'}</small>
                      </td>
                      <td>
                        {c.empresa_nome || <span style={{ color: '#ccc' }}>Avulso</span>}
                        {c.estado && <span style={{ color: '#007bff', fontWeight: 'bold' }}> ( {c.estado} )</span>}
                      </td>
                      <td><span className={`badge ${c.cargo}`}>{c.cargo || '-'}</span></td>
                      <td style={{ fontWeight: '500' }}>{c.telefones || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => prepararEdicao(c)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        {perfilUsuario === 'admin' && (
                          <button onClick={() => excluir(c.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }}>
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

          {/* PAGINAÇÃO */}
          {!carregando && contatosFiltrados.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                {contatosFiltrados.length} contatos encontrados
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