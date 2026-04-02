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

  // === ESTADOS DO SUPER MODAL (VISUALIZAÇÃO / EDIÇÃO) ===
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false); // false = Visão 360º | true = Formulário
  const [dadosHistorico, setDadosHistorico] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // === ESTADOS DO SUB-MODAL DE NEGOCIAÇÃO (OPORTUNIDADE) ===
  const [mostrarModalOp, setMostrarModalOp] = useState(false);
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [notasOp, setNotasOp] = useState([]);
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  // Estados dos Campos do Formulário
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [emails, setEmails] = useState(['']);
  const [telefones, setTelefones] = useState(['']);
  const [emailsComErroForm, setEmailsComErroForm] = useState([]);

  // Estados do Dropdown Pesquisável (Prefeituras)
  const [buscaEmpresaNoForm, setBuscaEmpresaNoForm] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => { carregarDados(); }, []);

  // Fecha dropdown de prefeitura se clicar fora
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

  // === CONTROLES DE CAMPOS DINÂMICOS ===
  function adicionarEmail() { setEmails([...emails, '']); }
  function removerEmail(index) { setEmails(emails.filter((_, i) => i !== index)); }
  function atualizarEmail(index, valor) {
    const novos = [...emails]; novos[index] = valor; setEmails(novos);
  }

  function adicionarTelefone() { setTelefones([...telefones, '']); }
  function removerTelefone(index) { setTelefones(telefones.filter((_, i) => i !== index)); }
  function atualizarTelefone(index, valor) {
    const novos = [...telefones]; novos[index] = valor; setTelefones(novos);
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

  // === AÇÕES DE ABERTURA DO SUPER MODAL ===
  function abrirModalNovo() {
    setEditandoId(null); 
    setNome(''); setCargo(''); setEmpresaId(''); setBuscaEmpresaNoForm('');
    setEmails(['']); setTelefones(['']); setEmailsComErroForm([]);
    setDadosHistorico(null);
    setModoEdicao(true); // Já abre direto no formulário
    setMostrarModalContato(true);
  }

  async function abrirModalContatoDetalhes(c) {
    setEditandoId(c.id);
    setNome(c.nome || '');
    setCargo(c.cargo || '');
    setEmpresaId(c.empresa_id || '');
    setBuscaEmpresaNoForm(c.empresa_nome || '');
    
    try {
      const ems = typeof c.emails_json === 'string' ? JSON.parse(c.emails_json) : (c.emails_json || []);
      setEmails(ems.length > 0 ? ems : ['']);
    } catch(e) { setEmails(['']); }

    try {
      const tels = typeof c.telefones_json === 'string' ? JSON.parse(c.telefones_json) : (c.telefones_json || []);
      setTelefones(tels.length > 0 ? tels : ['']);
    } catch(e) { setTelefones(['']); }

    setEmailsComErroForm(c.emails_com_erro || []);
    
    setModoEdicao(false); // Começa na Visão 360º
    setMostrarModalContato(true);
    setDadosHistorico(null);
    setCarregandoHistorico(true);

    try {
      const res = await axios.get(`${API_URL}/contatos/${c.id}/detalhes`, getHeaders());
      setDadosHistorico(res.data);
    } catch (error) { 
      console.error(error);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  // === ABRIR SUB-MODAL DE NEGOCIAÇÃO E NOTAS ===
  async function abrirDetalhesOp(op) {
    setOpSelecionada(op);
    setMostrarModalOp(true);
    setCarregandoNotas(true);
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${op.id}/notas`, getHeaders());
      setNotasOp(res.data);
    } catch(e) {
      console.error("Erro ao buscar notas:", e);
      alert("Erro ao carregar as anotações desta negociação.");
    } finally {
      setCarregandoNotas(false);
    }
  }

  // === SALVAR E EXCLUIR ===
  async function salvarContato(e) {
    e.preventDefault();
    const emailsLimpos = emails.filter(em => em.trim() !== '');
    const telefonesLimpos = telefones.filter(t => t.trim() !== '');

    const dados = { 
      nome, cargo, empresa_id: empresaId || null, 
      emails_json: emailsLimpos, 
      telefones_json: telefonesLimpos 
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/contatos/${editandoId}`, dados, getHeaders());
        setModoEdicao(false);
        abrirModalContatoDetalhes({
          id: editandoId, 
          nome, 
          cargo, 
          empresa_id: empresaId, 
          empresa_nome: buscaEmpresaNoForm, 
          emails_json: emailsLimpos, 
          telefones_json: telefonesLimpos
        });
      } else {
        await axios.post(`${API_URL}/contatos`, dados, getHeaders());
        setMostrarModalContato(false);
      }
      carregarDados();
    } catch (err) { 
      alert(err.response?.data?.erro || 'Erro ao salvar contato.'); 
    }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir este contato permanentemente? Esta ação apagará o histórico dele.")) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      setMostrarModalContato(false);
      carregarDados();
    } catch (err) { alert("Erro ao excluir contato."); }
  }

  // Utilitários Visuais
  function formatarData(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }
  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            <option value="Teste">⚙️ Teste Interno</option>
          </select>
          <button onClick={abrirModalNovo} style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Novo
          </button>
        </div>

        {/* TABELA DE RESULTADOS CLEAN */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555' }}>
                  <th style={{ padding: '12px' }}>Contato (Clique para abrir detalhes)</th>
                  <th style={{ padding: '12px' }}>Prefeitura / Vínculo</th>
                  <th style={{ padding: '12px' }}>Cargo</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhum contato encontrado.</td></tr>
                ) : (
                  itensExibidos.map(c => {
                    let primeiroEmail = 'Sem e-mail';
                    try {
                       const ems = typeof c.emails_json === 'string' ? JSON.parse(c.emails_json) : c.emails_json;
                       if (ems && ems.length > 0) primeiroEmail = ems[0];
                    } catch(e){}
                    
                    let quantEmails = 0;
                    try {
                       const ems = typeof c.emails_json === 'string' ? JSON.parse(c.emails_json) : c.emails_json;
                       quantEmails = ems ? ems.length : 0;
                    } catch(e){}

                    let primeiroTel = 'S/ Telefone';
                    let quantTels = 0;
                    try {
                       const tls = typeof c.telefones_json === 'string' ? JSON.parse(c.telefones_json) : c.telefones_json;
                       if (tls && tls.length > 0) {
                         primeiroTel = tls[0];
                         quantTels = tls.length;
                       }
                    } catch(e){}

                    const emailComErro = c.emails_com_erro?.includes(primeiroEmail);

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee', transition: '0.2s' }}>
                        
                        {/* CÉLULA TOTALMENTE CLICÁVEL COM EFEITO HOVER */}
                        <td 
                          onClick={() => abrirModalContatoDetalhes(c)}
                          style={{ padding: '15px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
                          title="Clique para ver ou editar detalhes do contato"
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f8ff'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <strong style={{ fontSize: '1.05rem', color: '#007bff' }}>{c.nome}</strong>
                          
                          <div style={{ display: 'flex', gap: '15px', marginTop: '6px' }}>
                            <span style={{ color: emailComErro ? '#dc3545' : '#666', fontSize: '0.8rem', fontWeight: emailComErro ? 'bold' : 'normal' }}>
                              <i className={emailComErro ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-envelope"}></i> {primeiroEmail}
                              {quantEmails > 1 && <span style={{ background: '#e9ecef', padding: '1px 6px', borderRadius: '10px', marginLeft: '5px', fontSize: '0.7rem', color: '#555' }}>+{quantEmails - 1}</span>}
                            </span>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                              <i className="fa-brands fa-whatsapp"></i> {primeiroTel}
                              {quantTels > 1 && <span style={{ background: '#e9ecef', padding: '1px 6px', borderRadius: '10px', marginLeft: '5px', fontSize: '0.7rem', color: '#555' }}>+{quantTels - 1}</span>}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '15px 12px' }}>
                          <span style={{ fontWeight: 'bold', color: c.empresa_nome ? '#333' : '#aaa' }}>{c.empresa_nome || 'Avulso (Sem Prefeitura)'}</span>
                          {c.estado && <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '0.8rem', marginLeft: '5px' }}>({c.estado})</span>}
                        </td>
                        
                        <td style={{ padding: '15px 12px' }}>
                          {c.cargo ? <span className={`badge ${c.cargo}`}>{c.cargo}</span> : <span style={{color: '#999', fontSize: '0.85rem'}}>-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINAÇÃO */}
          {!carregando && contatosFiltrados.length > 0 && (
            <div className="pagination-container" style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <div className="pagination-info" style={{ color: '#666', fontSize: '0.9rem' }}>{contatosFiltrados.length} contatos encontrados</div>
              <div className="pagination-controls">
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}><i className="fa-solid fa-angles-left"></i></button>
                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>Anterior</button>
                <span style={{ padding: '0 15px', fontWeight: 'bold', color: '#333' }}>{paginaAtual} de {totalPaginas}</span>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>Próxima</button>
                <button className="btn-page" disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}><i className="fa-solid fa-angles-right"></i></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUPER MODAL (RAIO-X 360º OU FORMULÁRIO DE EDIÇÃO)        */}
      {/* ======================================================== */}
      {mostrarModalContato && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalContato(false)}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '850px', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            
            {/* CABEÇALHO DO MODAL */}
            <div style={{ background: modoEdicao ? '#1F4E79' : '#fff', color: modoEdicao ? '#fff' : '#333', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', transition: 'background 0.3s' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {modoEdicao ? (
                    <><i className="fa-solid fa-user-pen"></i> {editandoId ? 'Editar Contato' : 'Novo Contato'}</>
                  ) : (
                    <><i className="fa-solid fa-user-circle" style={{ color: '#007bff' }}></i> {nome}</>
                  )}
                </h2>
                {!modoEdicao && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cargo && <span className={`badge ${cargo}`}>{cargo}</span>}
                    {buscaEmpresaNoForm && <span><i className="fa-solid fa-building" style={{color: '#999'}}></i> {buscaEmpresaNoForm}</span>}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                
                {/* BOTÃO EXCLUIR NO CABEÇALHO */}
                {perfilUsuario === 'admin' && editandoId && (
                  <button onClick={() => excluir(editandoId)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }} title="Excluir Contato permanentemente">
                    <i className="fa-solid fa-trash-can"></i> Excluir
                  </button>
                )}

                {/* BOTÃO EDITAR (Visível apenas na Visão 360) */}
                {!modoEdicao && (
                  <button onClick={() => setModoEdicao(true)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <i className="fa-solid fa-pen"></i> Editar
                  </button>
                )}
                
                <button onClick={() => setMostrarModalContato(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: modoEdicao ? '#fff' : '#aaa' }}>&times;</button>
              </div>
            </div>

            {/* CORPO DO MODAL SCROLLÁVEL */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', position: 'relative' }}>
              
              {/* ================================================= */}
              {/* VISÃO 360º (HISTÓRICO E DETALHES DE LEITURA)        */}
              {/* ================================================= */}
              {!modoEdicao && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                    <div className="panel" style={{ margin: 0, padding: '20px', borderTop: '4px solid #17a2b8' }}>
                      <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#555' }}><i className="fa-regular fa-envelope"></i> E-mails (Comunicação)</h4>
                      {emails.length > 0 && emails[0] !== '' ? (
                        <ul style={{ paddingLeft: '20px', margin: 0, color: '#333' }}>
                          {emails.map((em, i) => {
                            const isFalho = emailsComErroForm.includes(em);
                            return (
                              <li key={i} style={{ marginBottom: '5px', color: isFalho ? '#dc3545' : '#333', fontWeight: isFalho ? 'bold' : 'normal' }}>
                                {em} {isFalho && <span style={{fontSize: '0.7rem', background: '#f8d7da', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px'}}>Falha</span>}
                              </li>
                            );
                          })}
                        </ul>
                      ) : <span style={{ color: '#999', fontStyle: 'italic' }}>Nenhum e-mail registrado.</span>}
                    </div>

                    <div className="panel" style={{ margin: 0, padding: '20px', borderTop: '4px solid #28a745' }}>
                      <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#555' }}><i className="fa-brands fa-whatsapp"></i> Telefones</h4>
                      {telefones.length > 0 && telefones[0] !== '' ? (
                        <ul style={{ paddingLeft: '20px', margin: 0, color: '#333' }}>
                          {telefones.map((tel, i) => <li key={i} style={{marginBottom: '5px'}}>{tel}</li>)}
                        </ul>
                      ) : <span style={{ color: '#999', fontStyle: 'italic' }}>Nenhum telefone registrado.</span>}
                    </div>
                  </div>

                  <div className="panel" style={{ margin: 0, padding: '20px' }}>
                    <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}>
                      <i className="fa-solid fa-chart-pie"></i> Histórico de Interações (Funil)
                    </h4>
                    
                    {carregandoHistorico ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin"></i> Buscando oportunidades...</div>
                    ) : !dadosHistorico || dadosHistorico.oportunidades.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', color: '#999', fontStyle: 'italic' }}>Este contato ainda não possui negociações.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                        {dadosHistorico.oportunidades.map(op => {
                          let corBorda = '#c9c5c5'; let bgTag = '#fff'; let corTag = '#555'; let textoTag = 'Em Aberto';
                          if (op.status === 'naofunciona') { corBorda = '#f1c40f'; bgTag = '#fff9db'; corTag = '#b8860b'; textoTag = 'Não Funciona'; }
                          if (op.status === 'naoatendeu') { corBorda = '#e67e22'; bgTag = '#fff4e6'; corTag = '#d35400'; textoTag = 'Não Atendeu'; }
                          if (op.status === 'tarefa') { corBorda = '#6f42c1'; bgTag = '#f3e8ff'; corTag = '#6f42c1'; textoTag = 'Tarefa'; }
                          if (op.status === 'avaliar') { corBorda = '#7bed9f'; bgTag = '#f1fff3'; corTag = '#2e8b57'; textoTag = 'Avaliar'; }
                          if (op.status === 'interessada') { corBorda = '#28a745'; bgTag = '#e9f7ef'; corTag = '#28a745'; textoTag = 'Interessada'; }
                          if (op.status === 'inscricao') { corBorda = '#195326'; bgTag = '#e6f4ea'; corTag = '#195326'; textoTag = 'Inscrição'; }
                          if (op.status === 'ganho') { corBorda = '#28a745'; bgTag = '#e6f4ea'; corTag = '#28a745'; textoTag = 'Vendido'; }
                          if (op.status === 'perdido') { corBorda = '#dc3545'; bgTag = '#fce8e6'; corTag = '#dc3545'; textoTag = 'Perdido'; }

                          return (
                            <div 
                              key={op.id} 
                              onClick={() => abrirDetalhesOp(op)}
                              title="Clique para ver anotações desta negociação"
                              style={{ background: '#f8f9fa', border: '1px solid #ddd', borderLeft: `4px solid ${corBorda}`, borderRadius: '6px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            >
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#555' }}>
                                  {formatarMoeda(op.valor)}
                                </div>
                                <button style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                  <i className="fa-solid fa-eye"></i> Notas
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ================================================= */}
              {/* MODO FORMULÁRIO DE EDIÇÃO / CRIAÇÃO               */}
              {/* ================================================= */}
              {modoEdicao && (
                <form onSubmit={salvarContato}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Nome Completo *</label>
                      <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>

                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Cargo / Função</label>
                      <select value={cargo} onChange={e => setCargo(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
                        <option value="">Sem Cargo Específico</option>
                        <option value="Prefeito">Prefeito</option>
                        <option value="Secretário">Secretário</option>
                        <option value="Licita">Licita</option>
                        <option value="CI-R">CI-R</option>
                        <option value="CI-E">CI-E</option>
                        <option value="Teste">⚙️ Teste Interno</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    {/* VINCULAR PREFEITURA */}
                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Prefeitura Alvo (Vínculo)</label>
                      <div className="custom-select-container" ref={dropdownRef} style={{ width: '100%' }}>
                        <input 
                          type="text" className="custom-select-input" placeholder="🔍 Buscar na lista..." 
                          value={buscaEmpresaNoForm} autoComplete="off" 
                          onFocus={() => { setBuscaEmpresaNoForm(''); setMostrarDropdown(true); }} 
                          onChange={(e) => { setBuscaEmpresaNoForm(e.target.value); setMostrarDropdown(true); }} 
                          style={{ padding: '12px' }}
                        />
                        {mostrarDropdown && (
                          <div className="custom-select-dropdown" style={{ zIndex: 10000 }}>
                            <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold', borderBottom: '1px solid #eee' }} onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                              <i className="fa-solid fa-eraser"></i> Desvincular Prefeitura
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
                  </div>

                  {/* ARRAYS DINÂMICOS: EMAILS E TELEFONES */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span><i className="fa-solid fa-envelope" style={{ color: '#007bff' }}></i> Lista de E-mails</span>
                        <button type="button" onClick={adicionarEmail} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Novo</button>
                      </label>
                      {emails.map((email, index) => {
                        const isFalho = emailsComErroForm.includes(email);
                        return (
                          <div key={index} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input 
                                type="email" value={email} onChange={e => atualizarEmail(index, e.target.value)} 
                                placeholder="Ex: email@teste.com" 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isFalho ? '2px solid #dc3545' : '1px solid #ccc', background: isFalho ? '#fdf0f1' : '#fff' }} 
                              />
                              {emails.length > 1 && (
                                <button type="button" onClick={() => removerEmail(index)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                              )}
                            </div>
                            {isFalho && <div style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}><i className="fa-solid fa-triangle-exclamation"></i> E-mail bloqueado por erro no servidor</div>}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span><i className="fa-brands fa-whatsapp" style={{ color: '#28a745' }}></i> Lista de Telefones</span>
                        <button type="button" onClick={adicionarTelefone} style={{ background: 'none', border: 'none', color: '#28a745', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>+ Novo</button>
                      </label>
                      {telefones.map((tel, index) => (
                        <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input type="text" value={tel} onChange={e => atualizarTelefone(index, e.target.value)} placeholder="(XX) 99999-9999" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                          {telefones.length > 1 && (
                            <button type="button" onClick={() => removerTelefone(index)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <button type="button" onClick={() => { editandoId ? setModoEdicao(false) : setMostrarModalContato(false) }} style={{ padding: '12px 25px', border: 'none', background: '#eee', color: '#333', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Cancelar
                    </button>
                    <button type="submit" style={{ padding: '12px 25px', border: 'none', background: '#007bff', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-save"></i> Salvar Contato
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL DE OPORTUNIDADES / NOTAS (Z-INDEX 10000)         */}
      {/* ======================================================== */}
      {mostrarModalOp && opSelecionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalOp(false)}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            
            {/* Cabeçalho do Sub-Modal */}
            <div style={{ background: '#007bff', color: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fa-solid fa-handshake"></i> Detalhes da Negociação</h3>
              <button onClick={() => setMostrarModalOp(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>&times;</button>
            </div>

            {/* Corpo do Sub-Modal */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              <div style={{ marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '1.1rem' }}>{opSelecionada.titulo}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem', color: '#555' }}>
                  <div><i className="fa-solid fa-graduation-cap" style={{color:'#6f42c1'}}></i> <strong>Curso:</strong> <br/>{opSelecionada.campanha_nome || '-'}</div>
                  <div><i className="fa-solid fa-sack-dollar" style={{color:'#28a745'}}></i> <strong>Valor:</strong> <br/><span style={{color: '#333', fontWeight: 'bold', fontSize: '1.05rem'}}>{formatarMoeda(opSelecionada.valor)}</span></div>
                  <div><i className="fa-solid fa-user-tie" style={{color:'#007bff'}}></i> <strong>Vendedor:</strong> <br/>{opSelecionada.vendedor_nome || '-'}</div>
                  <div><i className="fa-regular fa-calendar" style={{color:'#666'}}></i> <strong>Criado em:</strong> <br/>{formatarDataHora(opSelecionada.criado_em)}</div>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}><i className="fa-solid fa-comments"></i> Anotações da Negociação</h4>
                
                {carregandoNotas ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin"></i> Carregando notas...</div>
                ) : notasOp.length === 0 ? (
                  <div style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>Nenhuma anotação registrada nesta venda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {notasOp.map(n => (
                      <div key={n.id} style={{ background: '#f8f9fa', borderLeft: '4px solid #007bff', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>
                          <strong><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong>
                          <span>{formatarDataHora(n.criado_em)}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#333', whiteSpace: 'pre-wrap' }}>{n.nota}</div>
                      </div>
                    ))}
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