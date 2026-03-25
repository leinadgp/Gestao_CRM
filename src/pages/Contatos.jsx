// src/pages/Contatos.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Contatos() {
  const [contatos, setContatos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const perfilUsuario = localStorage.getItem('perfil');

  // === FILTROS DA TABELA ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');

  // === ESTADOS DO FORMULÁRIO ===
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  
  // Arrays dinâmicos para múltiplos E-mails e Telefones
  const [emails, setEmails] = useState(['']);
  const [telefones, setTelefones] = useState(['']);

  // === ESTADOS DO DROPDOWN PESQUISÁVEL (PREFEITURAS) ===
  const [buscaEmpresaNoForm, setBuscaEmpresaNoForm] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // === ESTADOS DO MODAL 360º (RAIO-X) ===
  const [mostrarModalHist, setMostrarModalHist] = useState(false);
  const [dadosHistorico, setDadosHistorico] = useState(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => { carregarDados(); }, []);

  // Fecha dropdown se clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
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
    } catch (e) { console.error("Erro ao carregar dados", e); } 
    finally { setCarregando(false); }
  }

  // === ABRIR RAIO-X DO CONTATO ===
  async function abrirHistorico(id) {
    try {
      const res = await axios.get(`${API_URL}/contatos/${id}/detalhes`, getHeaders());
      setDadosHistorico(res.data);
      setMostrarModalHist(true);
    } catch (error) { alert('Erro ao carregar histórico do contato.'); }
  }

  // === LÓGICA DE CAMPOS DINÂMICOS (E-MAIL E TELEFONE) ===
  function adicionarEmail() { setEmails([...emails, '']); }
  function removerEmail(index) { setEmails(emails.filter((_, i) => i !== index)); }
  function atualizarEmail(index, valor) {
    const novos = [...emails];
    novos[index] = valor;
    setEmails(novos);
  }

  function adicionarTelefone() { setTelefones([...telefones, '']); }
  function removerTelefone(index) { setTelefones(telefones.filter((_, i) => i !== index)); }
  function atualizarTelefone(index, valor) {
    const novos = [...telefones];
    novos[index] = valor;
    setTelefones(novos);
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

  const empresasFiltradasParaSelect = empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresaNoForm.toLowerCase()));
  const totalPaginas = Math.ceil(contatosFiltrados.length / itensPorPagina);
  const itensExibidos = contatosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // === FUNÇÕES DE AÇÃO ===
  function abrirNovo() {
    setEditandoId(null); setNome(''); setCargo(''); setEmpresaId(''); setBuscaEmpresaNoForm('');
    setEmails(['']); setTelefones(['']); 
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prepararEdicao(c) {
    setEditandoId(c.id);
    setNome(c.nome || '');
    setCargo(c.cargo || '');
    setEmpresaId(c.empresa_id || '');
    setBuscaEmpresaNoForm(c.empresa_nome || '');
    
    setEmails(c.emails_json && c.emails_json.length > 0 ? c.emails_json : ['']);
    setTelefones(c.telefones_json && c.telefones_json.length > 0 ? c.telefones_json : ['']);
    
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    const emailsLimpos = emails.filter(e => e.trim() !== '');
    const telefonesLimpos = telefones.filter(t => t.trim() !== '');

    const dados = { 
      nome, cargo, empresa_id: empresaId || null, 
      emails_json: emailsLimpos, 
      telefones_json: telefonesLimpos 
    };

    try {
      if (editandoId) await axios.put(`${API_URL}/contatos/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/contatos`, dados, getHeaders());
      setMostrarForm(false);
      carregarDados();
    } catch (err) { alert('Erro ao salvar contato.'); }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir este contato permanentemente?")) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      carregarDados();
    } catch (err) { alert("Erro ao excluir contato."); }
  }

  function formatarData(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div>
      <Header titulo="Gestão de Contatos" />
      <div className="page-container">

        {/* BARRA DE FILTROS DA LISTA */}
        <div className="panel" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '13px', color: '#aaa' }}></i>
            <input placeholder="Pesquisar Nome, Prefeitura ou Cidade..." value={buscaGeral} onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ddd' }} />
          </div>
          <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaAtual(1); }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="">Todos Estados</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
            <option value="SC">Santa Catarina (SC)</option>
            <option value="PR">Paraná (PR)</option>
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

              {/* MÚLTIPLOS E-MAILS */}
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span><i className="fa-solid fa-envelope"></i> E-mails</span>
                  <button type="button" onClick={adicionarEmail} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Adicionar</button>
                </label>
                {emails.map((email, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input type="email" value={email} onChange={e => atualizarEmail(index, e.target.value)} placeholder="Ex: email@teste.com" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => removerEmail(index)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                    )}
                  </div>
                ))}
              </div>

              {/* MÚLTIPLOS TELEFONES */}
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span><i className="fa-brands fa-whatsapp"></i> Telefones</span>
                  <button type="button" onClick={adicionarTelefone} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Adicionar</button>
                </label>
                {telefones.map((tel, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input type="text" value={tel} onChange={e => atualizarTelefone(index, e.target.value)} placeholder="(XX) 99999-9999" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }} />
                    {telefones.length > 1 && (
                      <button type="button" onClick={() => removerTelefone(index)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                    )}
                  </div>
                ))}
              </div>

              {/* DROPDOWN PESQUISÁVEL DE PREFEITURAS */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Vincular Prefeitura</label>
                <div className="custom-select-container" ref={dropdownRef}>
                  <input type="text" className="custom-select-input" placeholder="🔍 Clique para pesquisar na lista..." value={buscaEmpresaNoForm} autoComplete="off" onFocus={() => { setBuscaEmpresaNoForm(''); setMostrarDropdown(true); }} onChange={(e) => { setBuscaEmpresaNoForm(e.target.value); setMostrarDropdown(true); }} />
                  {mostrarDropdown && (
                    <div className="custom-select-dropdown">
                      <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold', borderBottom: '2px solid #eee' }} onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                        <i className="fa-solid fa-eraser"></i> Sem Vínculo (Limpar)
                      </div>
                      {empresasFiltradasParaSelect.length > 0 ? (
                        empresasFiltradasParaSelect.map(emp => (
                          <div key={emp.id} className="custom-select-option" style={parseInt(empresaId) === emp.id ? { background: '#e7f3ff', borderLeft: '4px solid #007bff' } : {}} onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoForm(emp.nome); setMostrarDropdown(false); }}>
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
                <button type="submit" style={{ padding: '10px 25px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-save"></i> {editandoId ? 'Atualizar' : 'Salvar'}</button>
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
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhum contato encontrado.</td></tr>
                ) : (
                  itensExibidos.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: '#1c1e21' }}>{c.nome}</strong><br />
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-envelope"></i> {c.emails_json && c.emails_json.length > 0 ? c.emails_json[0] : 'S/ E-mail'} 
                            {c.emails_json && c.emails_json.length > 1 && <span style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', fontSize: '0.75rem' }}>+{c.emails_json.length - 1}</span>}
                          </span>
                          <span style={{ color: '#666', fontSize: '0.85rem' }}>
                            <i className="fa-brands fa-whatsapp"></i> {c.telefones_json && c.telefones_json.length > 0 ? c.telefones_json[0] : 'S/ Tel'}
                            {c.telefones_json && c.telefones_json.length > 1 && <span style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', fontSize: '0.75rem' }}>+{c.telefones_json.length - 1}</span>}
                          </span>
                        </div>
                      </td>
                      <td>
                        {c.empresa_nome || <span style={{ color: '#ccc' }}>Avulso</span>}
                        {c.estado && <span style={{ color: '#007bff', fontWeight: 'bold' }}> ( {c.estado} )</span>}
                      </td>
                      <td><span className={`badge ${c.cargo}`}>{c.cargo || '-'}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => abrirHistorico(c.id)} style={{ background: 'none', border: 'none', color: '#6f42c1', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }} title="Ficha do Cliente">
                          <i className="fa-solid fa-address-card"></i>
                        </button>
                        <button onClick={() => prepararEdicao(c)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }} title="Editar">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        {perfilUsuario === 'admin' && (
                          <button onClick={() => excluir(c.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir">
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
              <div className="pagination-info">{contatosFiltrados.length} contatos encontrados</div>
              <div className="pagination-controls">
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}><i className="fa-solid fa-angles-left"></i></button>
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>Anterior</button>
                <span style={{ padding: '0 15px', fontWeight: 'bold' }}>{paginaAtual} de {totalPaginas}</span>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>Próxima</button>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}><i className="fa-solid fa-angles-right"></i></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 360º (RAIO-X): DETALHES COMPLETOS DO CONTATO         */}
      {/* ======================================================== */}
      {mostrarModalHist && dadosHistorico && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalHist(false)}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ background: '#fff', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <div>
                <h2 style={{ margin: 0, color: '#6f42c1', fontSize: '1.5rem' }}>
                  <i className="fa-solid fa-user-circle"></i> {dadosHistorico.contato.nome}
                </h2>
                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-briefcase"></i> {dadosHistorico.contato.cargo || 'Cargo indefinido'}
                </p>
              </div>
              <button onClick={() => setMostrarModalHist(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#aaa' }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              
              {/* GRID DE INFORMAÇÕES PESSOAIS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div className="panel" style={{ margin: 0, padding: '20px', borderTop: '4px solid #17a2b8' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><i className="fa-solid fa-envelope"></i> E-mails Cadastrados</h4>
                  {dadosHistorico.contato.emails_json && dadosHistorico.contato.emails_json.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#444' }}>
                      {dadosHistorico.contato.emails_json.map((em, i) => <li key={i} style={{marginBottom: '5px'}}>{em}</li>)}
                    </ul>
                  ) : <span style={{ color: '#999' }}>Nenhum e-mail</span>}
                </div>

                <div className="panel" style={{ margin: 0, padding: '20px', borderTop: '4px solid #28a745' }}>
                  <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><i className="fa-brands fa-whatsapp"></i> Telefones Cadastrados</h4>
                  {dadosHistorico.contato.telefones_json && dadosHistorico.contato.telefones_json.length > 0 ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#444' }}>
                      {dadosHistorico.contato.telefones_json.map((tel, i) => <li key={i} style={{marginBottom: '5px'}}>{tel}</li>)}
                    </ul>
                  ) : <span style={{ color: '#999' }}>Nenhum telefone</span>}
                </div>
              </div>

              {/* HISTÓRICO DE NEGOCIAÇÕES DESTE CONTATO */}
              <div className="panel" style={{ margin: 0, padding: '20px' }}>
                <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}>
                  <i className="fa-solid fa-chart-pie"></i> Histórico de Interações e Compras
                </h4>
                
                {dadosHistorico.oportunidades.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', color: '#999', fontStyle: 'italic' }}>Este contato ainda não possui histórico de negociações no Funil.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    {dadosHistorico.oportunidades.map(op => {
                      let corBorda = '#007bff'; let bgTag = '#e7f3ff'; let corTag = '#007bff'; let textoTag = 'Em Aberto';
                      if (op.status === 'ganho') { corBorda = '#28a745'; bgTag = '#e6f4ea'; corTag = '#28a745'; textoTag = 'Comprou'; }
                      if (op.status === 'perdido') { corBorda = '#dc3545'; bgTag = '#fce8e6'; corTag = '#dc3545'; textoTag = 'Desistiu'; }

                      return (
                        <div key={op.id} style={{ background: '#f8f9fa', border: '1px solid #ddd', borderLeft: `4px solid ${corBorda}`, borderRadius: '6px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {op.titulo}
                              <span style={{ background: bgTag, color: corTag, padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{textoTag}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                              {op.campanha_nome && <span><i className="fa-solid fa-graduation-cap"></i> Curso: <strong>{op.campanha_nome}</strong></span>}
                              <span><i className="fa-solid fa-user-tie"></i> Vendido por: <strong>{op.vendedor_nome || '-'}</strong></span>
                              <span><i className="fa-regular fa-calendar"></i> Criado em: {formatarData(op.criado_em)}</span>
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#555' }}>
                            {formatarMoeda(op.valor)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}