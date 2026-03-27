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

  // Controle de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;
  
  // === CONTROLE DO FORMULÁRIO DE CADASTRO/EDIÇÃO ===
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefones, setTelefones] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');

  // === CONTROLE DO MODAL DE DETALHES 360º ===
  const [mostrarModalDetalhes, setMostrarModalDetalhes] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);

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

  // === ABRIR MODAL 360º (DETALHES DA EMPRESA) ===
  async function abrirDetalhes(id) {
    setMostrarModalDetalhes(true);
    setCarregandoDetalhes(true);
    try {
      const resposta = await axios.get(`${API_URL}/empresas/${id}/detalhes`, getHeaders());
      setDetalhesEmpresa(resposta.data);
    } catch (erro) {
      alert('Erro ao carregar os detalhes desta prefeitura.');
      setMostrarModalDetalhes(false);
    } finally {
      setCarregandoDetalhes(false);
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

  const empresasOrdenadas = [...empresasFiltradas].sort((a, b) => {
    const estadoA = a.estado || '';
    const estadoB = b.estado || '';
    if (estadoA === estadoB) return (a.cidade || '').localeCompare(b.cidade || '');
    return estadoA.localeCompare(estadoB);
  });

  const totalPaginas = Math.ceil(empresasOrdenadas.length / itensPorPagina);
  const itensAtuais = empresasOrdenadas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  // === FUNÇÕES DE CRUD (FORMULÁRIO) ===
  function abrirFormularioNovo() {
    setEditandoId(null); setNome(''); setEstado(''); setCidade(''); setTelefones(''); setHorarioFuncionamento('');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prepararEdicao(empresa) {
    setEditandoId(empresa.id); 
    setNome(empresa.nome); 
    setEstado(empresa.estado || ''); 
    setCidade(empresa.cidade || ''); 
    setTelefones(empresa.telefones || '');
    setHorarioFuncionamento(empresa.horario_funcionamento || '');
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fecharFormulario() {
    setMostrarForm(false); setEditandoId(null);
  }

  async function salvarEmpresa(e) {
    e.preventDefault();
    const dados = { nome, estado, cidade, telefones, horario_funcionamento: horarioFuncionamento };
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

  // === CÁLCULOS DO MODAL DE DETALHES ===
  // Agrupadores de status alinhados com o Dashboard e o Funil
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
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome da Prefeitura *</label>
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
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Telefone Geral</label>
                <input type="text" value={telefones} onChange={(e) => setTelefones(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Horário de Funcionamento</label>
                <input type="text" value={horarioFuncionamento} onChange={(e) => setHorarioFuncionamento(e.target.value)} placeholder="Ex: 08:00 às 17:00" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
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

        {/* === TABELA PRINCIPAL === */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Prefeitura / UF</th>
                  <th style={{ textAlign: 'center' }}>Negociações</th>
                  <th style={{ textAlign: 'center' }}>Último Contato</th>
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
                      <td>
                        <div style={{ fontWeight: 600, color: '#1c1e21', fontSize: '1.05rem' }}>{empresa.nome}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          <i className="fa-solid fa-location-dot"></i> {empresa.cidade || '-'} {empresa.estado ? `(${empresa.estado})` : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ background: '#e9ecef', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', color: '#495057' }}>
                          {empresa.total_negociacoes || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                        {formatarData(empresa.ultimo_contato)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => abrirDetalhes(empresa.id)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }} title="Visão 360º">
                          <i className="fa-solid fa-eye"></i>
                        </button>

                        <button onClick={() => prepararEdicao(empresa)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', fontSize: '1.2rem', marginRight: '10px' }} title="Editar Dados">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        
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
                {empresasOrdenadas.length} prefeituras encontradas
              </div>
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
      {/* MODAL 360º: DETALHES COMPLETOS DA EMPRESA E HISTÓRICO    */}
      {/* ======================================================== */}
      {mostrarModalDetalhes && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalDetalhes(false)}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '1000px', height: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            
            {/* Header do Modal */}
            <div style={{ background: '#fff', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
              <div>
                <h2 style={{ margin: 0, color: '#007bff', fontSize: '1.5rem' }}>
                  <i className="fa-solid fa-building-columns"></i> {detalhesEmpresa?.empresa?.nome || 'Carregando...'}
                </h2>
                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                  {detalhesEmpresa?.empresa?.cidade} - {detalhesEmpresa?.empresa?.estado}
                </p>
              </div>
              <button onClick={() => setMostrarModalDetalhes(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#aaa' }}>&times;</button>
            </div>

            {/* Corpo Scrollável do Modal */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              {carregandoDetalhes ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Buscando histórico...</div>
              ) : detalhesEmpresa ? (
                <>
                  {/* CARDS DE RESUMO FINANCEIRO */}
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

                  {/* GRID: INFORMAÇÕES DA PREFEITURA & CONTATOS VINCULADOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                    
                    <div className="panel" style={{ margin: 0, padding: '20px' }}>
                      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-circle-info"></i> Informações Cadastrais</h4>
                      <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Telefone:</strong> {detalhesEmpresa.empresa.telefones || 'Não informado'}</p>
                      <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Horário de Func.:</strong> {detalhesEmpresa.empresa.horario_funcionamento || 'Não informado'}</p>
                      <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>Cadastrada em:</strong> {formatarData(detalhesEmpresa.empresa.criado_em)}</p>
                    </div>

                    <div className="panel" style={{ margin: 0, padding: '20px' }}>
                      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-address-book"></i> Contatos Vinculados ({detalhesEmpresa.contatos.length})</h4>
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {detalhesEmpresa.contatos.length === 0 ? (
                          <p style={{ color: '#999', fontSize: '0.9rem' }}>Nenhum contato atrelado a esta prefeitura.</p>
                        ) : (
                          <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                            {detalhesEmpresa.contatos.map(c => (
                              <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px dashed #eee', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <strong style={{ color: '#333', fontSize: '0.95rem' }}>{c.nome}</strong><br/>
                                  <small style={{ color: '#777' }}>{c.cargo || 'Cargo não definido'}</small>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* HISTÓRICO DE NEGOCIAÇÕES (LINHA DO TEMPO COM COMPRADOR E VENDEDOR) */}
                  <div className="panel" style={{ margin: 0, padding: '20px' }}>
                    <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color: '#333' }}><i className="fa-solid fa-clock-rotate-left"></i> Histórico de Negociações e Campanhas</h4>
                    
                    {detalhesEmpresa.oportunidades.length === 0 ? (
                      <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Não há histórico de negociações registradas.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        {detalhesEmpresa.oportunidades.map(op => {
                          // CORES Mapeadas do CRM Funil.jsx
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
                            <div key={op.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderLeft: `4px solid ${corBorda}`, borderRadius: '6px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#555' }}>
                                {formatarMoeda(op.valor)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}