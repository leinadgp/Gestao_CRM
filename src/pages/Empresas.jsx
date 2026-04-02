// src/pages/Empresas.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const perfilUsuario = localStorage.getItem('perfil');

  // === FILTROS DA TABELA ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAssessorada, setFiltroAssessorada] = useState('');

  // Controle de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;
  
  // === ESTADOS DO SUPER MODAL (VISUALIZAÇÃO / EDIÇÃO) ===
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [modoEdicaoEmpresa, setModoEdicaoEmpresa] = useState(false); // false = Visão 360º | true = Formulário
  const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Estados dos Campos do Formulário da Empresa
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefones, setTelefones] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [assessorada, setAssessorada] = useState(false);

  // === CONTROLE DO SUB-MODAL DE CONTATO RÁPIDO (Z-INDEX 9999) ===
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState(null);
  const [editandoContatoRapido, setEditandoContatoRapido] = useState(false);
  const [contatoNome, setContatoNome] = useState('');
  const [contatoCargo, setContatoCargo] = useState('');
  const [contatoEmails, setContatoEmails] = useState('');
  const [contatoTelefonesRapido, setContatoTelefonesRapido] = useState('');

  // === ESTADOS DO SUB-MODAL DE NEGOCIAÇÃO (OPORTUNIDADE) ===
  const [mostrarModalOp, setMostrarModalOp] = useState(false);
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [notasOp, setNotasOp] = useState([]);
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => {
    buscarEmpresas();
  }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // Funções de Formatação
  function formatarData(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // === AÇÕES DE ABERTURA DO SUPER MODAL ===
  function abrirModalNovo() {
    setEditandoId(null); 
    setNome(''); setEstado(''); setCidade(''); setTelefones(''); setHorarioFuncionamento(''); setAssessorada(false);
    setDetalhesEmpresa(null);
    setModoEdicaoEmpresa(true); // Abre direto no form
    setMostrarModalEmpresa(true);
  }

  async function abrirModalDetalhes(emp) {
    setEditandoId(emp.id);
    setNome(emp.nome);
    setEstado(emp.estado || '');
    setCidade(emp.cidade || '');
    setTelefones(emp.telefones || '');
    setHorarioFuncionamento(emp.horario_funcionamento || '');
    setAssessorada(emp.assessorada || false);
    
    setModoEdicaoEmpresa(false); // Começa no Raio-X 360º
    setMostrarModalEmpresa(true);
    
    recarregarVisao360(emp.id);
  }

  async function recarregarVisao360(id) {
    setCarregandoDetalhes(true);
    try {
      const resposta = await axios.get(`${API_URL}/empresas/${id}/detalhes`, getHeaders());
      setDetalhesEmpresa(resposta.data);
    } catch (erro) {
      alert('Erro ao carregar os detalhes desta prefeitura.');
    } finally {
      setCarregandoDetalhes(false);
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

  // === SALVAR E EXCLUIR EMPRESA ===
  async function salvarEmpresa(e) {
    e.preventDefault();
    const dados = { nome, estado, cidade, telefones, horario_funcionamento: horarioFuncionamento, assessorada };
    try {
      if (editandoId) {
        await axios.put(`${API_URL}/empresas/${editandoId}`, dados, getHeaders());
        setModoEdicaoEmpresa(false); // Volta pra visão 360
        recarregarVisao360(editandoId); // Atualiza os dados
      } else {
        await axios.post(`${API_URL}/empresas`, dados, getHeaders());
        setMostrarModalEmpresa(false);
      }
      buscarEmpresas(); 
    } catch (erro) { 
      alert(erro.response?.data?.erro || 'Erro ao salvar empresa.'); 
    }
  }

  async function deletarEmpresa(id) {
    if (!window.confirm('Excluir esta empresa permanentemente? O histórico também será apagado.')) return;
    try {
      await axios.delete(`${API_URL}/empresas/${id}`, getHeaders());
      setMostrarModalEmpresa(false);
      buscarEmpresas();
    } catch (erro) { 
      alert('Erro ao excluir. Verifique se existem contatos atrelados a esta prefeitura.'); 
    }
  }

  // === LÓGICA DO SUB-MODAL DE CONTATO RÁPIDO ===
  function abrirDetalheContato(contato) {
    setContatoSelecionado(contato);
    setContatoNome(contato.nome);
    setContatoCargo(contato.cargo || '');
    try {
      const emails = typeof contato.emails_json === 'string' ? JSON.parse(contato.emails_json) : (contato.emails_json || []);
      setContatoEmails(emails.join(', '));
    } catch(e) { setContatoEmails(''); }
    try {
      const tels = typeof contato.telefones_json === 'string' ? JSON.parse(contato.telefones_json) : (contato.telefones_json || []);
      setContatoTelefonesRapido(tels.join(', '));
    } catch(e) { setContatoTelefonesRapido(''); }
    setEditandoContatoRapido(false);
    setMostrarModalContato(true);
  }

  async function salvarContatoRapido(e) {
    e.preventDefault();
    const emailsArr = contatoEmails.split(',').map(m => m.trim()).filter(m => m);
    const telsArr = contatoTelefonesRapido.split(',').map(t => t.trim()).filter(t => t);
    try {
      await axios.put(`${API_URL}/contatos/${contatoSelecionado.id}`, {
        nome: contatoNome,
        cargo: contatoCargo,
        emails_json: emailsArr,
        telefones_json: telsArr,
        empresa_id: detalhesEmpresa.empresa.id 
      }, getHeaders());
      
      alert('✅ Contato atualizado com sucesso!');
      setMostrarModalContato(false);
      recarregarVisao360(detalhesEmpresa.empresa.id); 
    } catch(error) {
      alert(error.response?.data?.erro || 'Erro ao atualizar contato.');
    }
  }

  // === LÓGICA DE FILTRAGEM DINÂMICA DA TABELA ===
  const empresasFiltradas = empresas.filter(emp => {
    const termo = buscaGeral.toLowerCase();
    const matchBusca = (emp.nome || '').toLowerCase().includes(termo) ||
                       (emp.cidade || '').toLowerCase().includes(termo);
    const matchEstado = filtroEstado === '' || (emp.estado || '').toUpperCase() === filtroEstado.toUpperCase();
    let matchAssessorada = true;
    if (filtroAssessorada === 'true') matchAssessorada = emp.assessorada === true;
    if (filtroAssessorada === 'false') matchAssessorada = emp.assessorada !== true;
    return matchBusca && matchEstado && matchAssessorada;
  });

  const empresasOrdenadas = [...empresasFiltradas].sort((a, b) => {
    const estadoA = a.estado || '';
    const estadoB = b.estado || '';
    if (estadoA === estadoB) return (a.cidade || '').localeCompare(b.cidade || '');
    return estadoA.localeCompare(estadoB);
  });

  const totalPaginas = Math.ceil(empresasOrdenadas.length / itensPorPagina);
  const itensAtuais = empresasOrdenadas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // === CÁLCULOS DO MODAL 360º ===
  const statusSucesso = ['ganho', 'inscricao'];
  const statusPerdido = ['perdido', 'naofunciona', 'naoatendeu'];
  const statusAndamento = ['aberto', 'tarefa', 'avaliar', 'interessada'];

  let valAndamento = 0, valGanho = 0, valPerdido = 0, totalOportunidades = 0;
  if (detalhesEmpresa && detalhesEmpresa.oportunidades) {
    totalOportunidades = detalhesEmpresa.oportunidades.length;
    detalhesEmpresa.oportunidades.forEach(op => {
      const v = Number(op.valor) || 0;
      if (statusSucesso.includes(op.status)) valGanho += v;
      else if (statusPerdido.includes(op.status)) valPerdido += v;
      else if (statusAndamento.includes(op.status)) valAndamento += v; 
    });
  }

  return (
    <div>
      <Header titulo="Gestão de Empresas" />

      <div className="page-container">
        
        {/* BARRA DE FILTROS E BUSCA */}
        <div className="panel" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', gap: '15px' }}>
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

          <select value={filtroAssessorada} onChange={e => { setFiltroAssessorada(e.target.value); setPaginaAtual(1); }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f8f9fa' }}>
            <option value="">Todos os Tipos (Quentes/Frios)</option>
            <option value="true">⭐ Apenas Assessoradas (VIP)</option>
            <option value="false">⚪ Apenas Não Assessoradas</option>
          </select>

          <button onClick={abrirModalNovo} style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Nova
          </button>
        </div>

        {/* TABELA PRINCIPAL CLEAN */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555' }}>
                  <th style={{ padding: '12px' }}>Prefeitura / UF (Clique para abrir detalhes)</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Negociações</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Último Contato</th>
                  {perfilUsuario === 'admin' && <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan={perfilUsuario === 'admin' ? 4 : 3} style={{ textAlign: 'center', padding: '40px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin"></i> Carregando dados...</td></tr>
                ) : itensAtuais.length === 0 ? (
                  <tr><td colSpan={perfilUsuario === 'admin' ? 4 : 3} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhuma empresa encontrada com estes filtros.</td></tr>
                ) : (
                  itensAtuais.map(empresa => (
                    <tr key={empresa.id} style={{ borderBottom: '1px solid #eee', transition: '0.2s' }}>
                      
                      {/* CÉLULA TOTALMENTE CLICÁVEL COM EFEITO HOVER */}
                      <td 
                        onClick={() => abrirModalDetalhes(empresa)}
                        style={{ padding: '15px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
                        title="Clique para ver ou editar detalhes da prefeitura"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f8ff'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, color: '#007bff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {empresa.nome}
                          {empresa.assessorada && (
                            <span style={{ background: '#ffc107', color: '#856404', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }} title="Cliente Assessorado (Funil Quente)">
                              <i className="fa-solid fa-star"></i> VIP
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                          <i className="fa-solid fa-location-dot"></i> {empresa.cidade || '-'} {empresa.estado ? `(${empresa.estado})` : ''}
                        </div>
                      </td>
                      
                      <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                        <span style={{ background: '#e9ecef', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', color: '#495057' }}>
                          {empresa.total_negociacoes || 0}
                        </span>
                      </td>
                      <td style={{ padding: '15px 12px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                        {formatarData(empresa.ultimo_contato)}
                      </td>
                      
                      {perfilUsuario === 'admin' && (
                        <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                          <button onClick={() => deletarEmpresa(empresa.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.1rem' }} title="Excluir">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINAÇÃO */}
          {!carregando && empresasOrdenadas.length > 0 && (
            <div className="pagination-container" style={{ padding: '15px 20px', borderTop: '1px solid #eee' }}>
              <div className="pagination-info" style={{ color: '#666', fontSize: '0.9rem' }}>{empresasOrdenadas.length} prefeituras encontradas</div>
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
      {mostrarModalEmpresa && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalEmpresa(false)}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            
            {/* Cabeçalho Dinâmico */}
            <div style={{ background: modoEdicaoEmpresa ? '#1F4E79' : '#fff', color: modoEdicaoEmpresa ? '#fff' : '#333', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', transition: 'background 0.3s' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {modoEdicaoEmpresa ? (
                    <><i className="fa-solid fa-building"></i> {editandoId ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}</>
                  ) : (
                    <><i className="fa-solid fa-building-columns" style={{ color: '#007bff' }}></i> {nome}</>
                  )}
                  
                  {!modoEdicaoEmpresa && assessorada && (
                    <span style={{ background: '#ffc107', color: '#856404', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-star"></i> Assessorada
                    </span>
                  )}
                </h2>
                {!modoEdicaoEmpresa && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>{cidade} - {estado}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                
                {/* BOTÃO EXCLUIR NO CABEÇALHO */}
                {perfilUsuario === 'admin' && editandoId && (
                  <button onClick={() => deletarEmpresa(editandoId)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }} title="Excluir Empresa permanentemente">
                    <i className="fa-solid fa-trash-can"></i> Excluir
                  </button>
                )}

                {/* BOTÃO EDITAR (Visível apenas na Visão 360) */}
                {!modoEdicaoEmpresa && (
                  <button onClick={() => setModoEdicaoEmpresa(true)} style={{ background: '#ffc107', color: '#333', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    <i className="fa-solid fa-pen"></i> Editar
                  </button>
                )}
                
                <button onClick={() => setMostrarModalEmpresa(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: modoEdicaoEmpresa ? '#fff' : '#aaa' }}>&times;</button>
              </div>
            </div>

            {/* Corpo Scrollável do Modal */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              
              {/* ================================================= */}
              {/* VISÃO 360º (HISTÓRICO E DETALHES DE LEITURA)        */}
              {/* ================================================= */}
              {!modoEdicaoEmpresa ? (
                carregandoDetalhes ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Buscando histórico...</div>
                ) : detalhesEmpresa ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      <div className="panel" style={{ borderTop: '4px solid #007bff', padding: '20px', textAlign: 'center', margin: 0 }}>
                        <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>EM ANDAMENTO ({totalOportunidades})</div>
                        <div style={{ color: '#007bff', fontSize: '1.6rem', fontWeight: 'bold', marginTop: '10px' }}>{formatarMoeda(valAndamento)}</div>
                      </div>
                      <div className="panel" style={{ borderTop: '4px solid #28a745', padding: '20px', textAlign: 'center', margin: 0 }}>
                        <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL VENDIDO</div>
                        <div style={{ color: '#28a745', fontSize: '1.6rem', fontWeight: 'bold', marginTop: '10px' }}>{formatarMoeda(valGanho)}</div>
                      </div>
                      <div className="panel" style={{ borderTop: '4px solid #dc3545', padding: '20px', textAlign: 'center', margin: 0 }}>
                        <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL PERDIDO</div>
                        <div style={{ color: '#dc3545', fontSize: '1.6rem', fontWeight: 'bold', marginTop: '10px' }}>{formatarMoeda(valPerdido)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                      <div className="panel" style={{ margin: 0, padding: '20px' }}>
                        <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-circle-info"></i> Informações Cadastrais</h4>
                        <p style={{ margin: '10px 0', fontSize: '0.95rem' }}>
                          <strong>Status no Funil:</strong> {detalhesEmpresa.empresa.assessorada ? <span style={{color: '#d39e00', fontWeight: 'bold'}}>VIP (Quente)</span> : <span style={{color: '#6c757d', fontWeight: 'bold'}}>Padrão (Frio)</span>}
                        </p>
                        <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Telefone:</strong> {detalhesEmpresa.empresa.telefones || 'Não informado'}</p>
                        <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Horário de Func.:</strong> {detalhesEmpresa.empresa.horario_funcionamento || 'Não informado'}</p>
                        <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Cadastrada em:</strong> {formatarData(detalhesEmpresa.empresa.criado_em)}</p>
                      </div>

                      <div className="panel" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-address-book"></i> Contatos Vinculados ({detalhesEmpresa.contatos.length})</h4>
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', maxHeight: '180px' }}>
                          {detalhesEmpresa.contatos.length === 0 ? (
                            <p style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>Nenhum contato atrelado.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {detalhesEmpresa.contatos.map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => abrirDetalheContato(c)}
                                  title="Clique para ver ou editar detalhes do contato"
                                  style={{ padding: '12px', background: '#fff', border: '1px solid #e0e0e0', borderLeft: '4px solid #17a2b8', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f8ff'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                >
                                  <div>
                                    <strong style={{ color: '#007bff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <i className="fa-solid fa-user"></i> {c.nome}
                                    </strong>
                                    <span style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                                      {c.cargo || 'Cargo não definido'}
                                    </span>
                                  </div>
                                  <div style={{ color: '#007bff' }}>
                                    <i className="fa-solid fa-chevron-right"></i>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* HISTÓRICO DE NEGOCIAÇÕES (CLICÁVEL) */}
                    <div className="panel" style={{ margin: 0, padding: '20px' }}>
                      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-clock-rotate-left"></i> Histórico de Negociações e Campanhas</h4>
                      {detalhesEmpresa.oportunidades.length === 0 ? (
                        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Não há histórico de negociações registradas.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                          {detalhesEmpresa.oportunidades.map(op => {
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '1.05rem', color: '#333' }}>{op.titulo}</strong>
                                    <span style={{ background: bgTag, color: corTag, padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{textoTag}</span>
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '5px' }}>
                                    <div><i className="fa-solid fa-graduation-cap"></i> Curso: <strong>{op.campanha_nome || '-'}</strong></div>
                                    <div><i className="fa-solid fa-user"></i> Comprador: <strong style={{color: '#333'}}>{op.contato_nome || 'Sem Contato'}</strong></div>
                                    <div><i className="fa-solid fa-user-tie"></i> Vendedor: {op.vendedor_nome || '-'}</div>
                                    <div><i className="fa-regular fa-calendar"></i> Criado: {formatarData(op.criado_em)}</div>
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
                ) : null
              ) : (
                // =================================================
                // MODO FORMULÁRIO DE EDIÇÃO / CRIAÇÃO
                // =================================================
                <form onSubmit={salvarEmpresa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome da Prefeitura *</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Estado (UF)</label>
                    <input type="text" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength="2" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Cidade</label>
                    <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Telefone Geral</label>
                    <input type="text" value={telefones} onChange={(e) => setTelefones(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Horário de Funcionamento</label>
                    <input type="text" value={horarioFuncionamento} onChange={(e) => setHorarioFuncionamento(e.target.value)} placeholder="Ex: 08:00 às 17:00" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  
                  <div style={{ gridColumn: 'span 2', padding: '15px', background: assessorada ? '#fff3cd' : '#f8f9fa', border: assessorada ? '1px solid #ffeeba' : '1px solid #ddd', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s' }}>
                    <input type="checkbox" id="chkAssessorada" checked={assessorada} onChange={e => setAssessorada(e.target.checked)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#ffc107' }} />
                    <label htmlFor="chkAssessorada" style={{ fontWeight: 'bold', color: assessorada ? '#856404' : '#555', cursor: 'pointer', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-star" style={{ color: assessorada ? '#ffc107' : '#ccc', fontSize: '1.2rem' }}></i> 
                      Marcar como Prefeitura Assessorada (Cliente Fixo / Funil Quente)
                    </label>
                  </div>

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <button type="button" onClick={() => editandoId ? setModoEdicaoEmpresa(false) : setMostrarModalEmpresa(false)} style={{ background: '#eee', color: '#333', padding: '12px 25px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                    <button type="submit" style={{ background: '#007bff', color: '#fff', padding: '12px 25px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-save"></i> {editandoId ? 'Atualizar Empresa' : 'Salvar Empresa'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL: VISUALIZAR E EDITAR CONTATO (Z-INDEX 9999)    */}
      {/* ======================================================== */}
      {mostrarModalContato && contatoSelecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalContato(false)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '15px 20px', background: '#1F4E79', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fa-solid fa-user-pen"></i> Detalhes do Contato</h3>
              <button onClick={() => setMostrarModalContato(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              {!editandoContatoRapido ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                      <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>NOME COMPLETO</label>
                      <div style={{ fontSize: '1rem', color: '#333' }}>{contatoNome}</div>
                    </div>
                    <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                      <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>CARGO</label>
                      <div style={{ fontSize: '1rem', color: '#333' }}>{contatoCargo || '-'}</div>
                    </div>
                    <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', border: '1px solid #ddd', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}><i className="fa-regular fa-envelope"></i> E-MAILS (Lista de Disparo)</label>
                      <div style={{ fontSize: '1rem', color: '#007bff' }}>{contatoEmails || '-'}</div>
                    </div>
                    <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', border: '1px solid #ddd', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}><i className="fa-solid fa-phone"></i> TELEFONES (WhatsApp)</label>
                      <div style={{ fontSize: '1rem', color: '#333' }}>{contatoTelefonesRapido || '-'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={() => setMostrarModalContato(false)} style={{ background: '#eee', color: '#333', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Voltar</button>
                    <button onClick={() => setEditandoContatoRapido(true)} style={{ background: '#ffc107', color: '#333', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-pen"></i> Editar Contato</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={salvarContatoRapido}>
                  <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome *</label>
                      <input type="text" required value={contatoNome} onChange={e => setContatoNome(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Cargo</label>
                      <input type="text" value={contatoCargo} onChange={e => setContatoCargo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}><i className="fa-regular fa-envelope"></i> E-mails (Separe por vírgula)</label>
                      <input type="text" value={contatoEmails} onChange={e => setContatoEmails(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #007bff' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}><i className="fa-solid fa-phone"></i> Telefones (Separe por vírgula)</label>
                      <input type="text" value={contatoTelefonesRapido} onChange={e => setContatoTelefonesRapido(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #28a745' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <button type="button" onClick={() => setEditandoContatoRapido(false)} style={{ background: '#eee', color: '#333', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: '#007bff', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-save"></i> Salvar Alterações</button>
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