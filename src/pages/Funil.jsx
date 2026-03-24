// src/pages/Funil.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Funil() {
  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [campanhas, setCampanhas] = useState([]); 
  const [carregando, setCarregando] = useState(true);

  const [filtroCampanha, setFiltroCampanha] = useState('');

  // Estados do Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Campos do Formulário
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contatoId, setContatoId] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [campanhaId, setCampanhaId] = useState(''); 
  const [statusOp, setStatusOp] = useState('aberto');

  // === ESTADOS DO HISTÓRICO DE NOTAS ===
  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null); 
  const [textoNotaEditada, setTextoNotaEditada] = useState(''); 

  // Estados dos Dropdowns
  const [buscaEmpresaNoModal, setBuscaEmpresaNoModal] = useState('');
  const [mostrarDropdownEmpresa, setMostrarDropdownEmpresa] = useState(false);
  const dropdownEmpresaRef = useRef(null);

  const [buscaContatoNoModal, setBuscaContatoNoModal] = useState('');
  const [mostrarDropdownContato, setMostrarDropdownContato] = useState(false);
  const dropdownContatoRef = useRef(null);

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => { carregarQuadro(); }, []);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownEmpresaRef.current && !dropdownEmpresaRef.current.contains(event.target)) {
        setMostrarDropdownEmpresa(false);
        if (empresaId) {
          const atual = empresas.find(e => e.id === parseInt(empresaId));
          if (atual) setBuscaEmpresaNoModal(atual.nome);
        } else { setBuscaEmpresaNoModal(''); }
      }
      if (dropdownContatoRef.current && !dropdownContatoRef.current.contains(event.target)) {
        setMostrarDropdownContato(false);
        if (contatoId) {
          const atual = contatos.find(c => c.id === parseInt(contatoId));
          if (atual) setBuscaContatoNoModal(atual.nome);
        } else { setBuscaContatoNoModal(''); }
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [empresaId, empresas, contatoId, contatos]);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarQuadro() {
    setCarregando(true);
    try {
      const [resE, resO, resEmp, resC, resCamp] = await Promise.all([
        axios.get(`${API_URL}/etapas`, getHeaders()),
        axios.get(`${API_URL}/oportunidades`, getHeaders()),
        axios.get(`${API_URL}/empresas`, getHeaders()),
        axios.get(`${API_URL}/contatos`, getHeaders()),
        axios.get(`${API_URL}/campanhas`, getHeaders()) 
      ]);
      setEtapas(resE.data);
      setOportunidades(resO.data);
      setEmpresas(resEmp.data);
      setContatos(resC.data);
      setCampanhas(resCamp.data);
    } catch (erro) { console.error(erro); } finally { setCarregando(false); }
  }

  async function carregarNotas(opId) {
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${opId}/notas`, getHeaders());
      setNotas(res.data);
    } catch (e) { console.error('Erro ao buscar notas', e); }
  }

  async function adicionarNota() {
    if (!novaNota.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/oportunidades/${editandoId}/notas`, { nota: novaNota }, getHeaders());
      setNotas([res.data, ...notas]); 
      setNovaNota(''); 
    } catch (e) { alert('Erro ao adicionar nota.'); }
  }

  function iniciarEdicaoNota(nota) {
    setEditandoNotaId(nota.id);
    setTextoNotaEditada(nota.nota);
  }

  function cancelarEdicaoNota() {
    setEditandoNotaId(null);
    setTextoNotaEditada('');
  }

  async function salvarNotaEditada(id) {
    if (!textoNotaEditada.trim()) return;
    try {
      const res = await axios.put(`${API_URL}/notas/${id}`, { nota: textoNotaEditada }, getHeaders());
      setNotas(notas.map(n => n.id === id ? res.data : n));
      cancelarEdicaoNota();
    } catch (e) { alert('Erro ao editar a nota.'); }
  }

  const oportunidadesExibidas = filtroCampanha ? oportunidades.filter(op => op.campanha_id === parseInt(filtroCampanha)) : oportunidades;
  const empresasFiltradasParaSelect = empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresaNoModal.toLowerCase()));
  const contatosFiltradosParaSelect = contatos.filter(c => c.nome.toLowerCase().includes(buscaContatoNoModal.toLowerCase()));

  function abrirModalNovo() {
    setEditandoId(null); setTitulo(''); setValor(''); setEmpresaId(''); setContatoId(''); setObservacoes('');
    setCampanhaId(''); setStatusOp('aberto'); setEtapaId(etapas.length > 0 ? etapas[0].id : ''); 
    setBuscaEmpresaNoModal(''); setBuscaContatoNoModal('');
    setNotas([]); setNovaNota(''); 
    cancelarEdicaoNota(); 
    setMostrarModal(true);
  }

  function abrirModalEdicao(op) {
    setEditandoId(op.id); setTitulo(op.titulo); setValor(op.valor);
    setEmpresaId(op.empresa_id || ''); setContatoId(op.contato_id || '');
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setCampanhaId(op.campanha_id || ''); setStatusOp(op.status || 'aberto');
    setBuscaEmpresaNoModal(op.empresa_nome || ''); setBuscaContatoNoModal(op.contato_nome || '');
    
    setNotas([]); 
    cancelarEdicaoNota(); 
    carregarNotas(op.id); 
    setMostrarModal(true);
  }

  function fecharModal() { setMostrarModal(false); }

  function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function salvarOportunidade(e) {
    e.preventDefault();
    const valorFormatado = valor ? parseFloat(valor.toString().replace(/\./g, '').replace(',', '.')) : 0;

    const dados = {
      titulo, valor: valorFormatado, empresa_id: empresaId || null, 
      contato_id: contatoId || null, etapa_id: etapaId, observacoes,
      campanha_id: campanhaId, status: statusOp
    };

    try {
      if (editandoId) await axios.put(`${API_URL}/oportunidades/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/oportunidades`, dados, getHeaders());
      fecharModal();
      carregarQuadro();
    } catch (erro) { alert('Erro ao salvar oportunidade.'); }
  }

  async function deletarOportunidade() {
    if(!window.confirm('Excluir este negócio? O histórico de notas também será apagado.')) return;
    try {
      await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders());
      fecharModal(); carregarQuadro();
    } catch (error) { console.error(error); }
  }

  function onDragStart(e, idDoCartao) { e.dataTransfer.setData('card_id', idDoCartao.toString()); }

  async function onDrop(e, idDaNovaEtapa) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('card_id');
    if (!cardId) return;

    const oportunidade = oportunidades.find(op => op.id === parseInt(cardId));
    if (!oportunidade || oportunidade.etapa_id === idDaNovaEtapa) return; 

    const opsAtualizadas = oportunidades.map(op => {
      if (op.id === parseInt(cardId)) return { ...op, etapa_id: idDaNovaEtapa };
      return op;
    });
    setOportunidades(opsAtualizadas);

    try {
      await axios.put(`${API_URL}/oportunidades/${cardId}`, { ...oportunidade, etapa_id: idDaNovaEtapa }, getHeaders());
    } catch (error) { carregarQuadro(); }
  }

  return (
    <div>
      <Header titulo="Funil de Vendas" />

      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Pipeline B2B / Governo</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>Arraste os cartões entre as colunas ou clique para editar.</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '5px 10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <label style={{ color: '#555', fontWeight: 'bold', fontSize: '0.9rem' }}><i className="fa-solid fa-filter"></i> Campanha:</label>
              <select value={filtroCampanha} onChange={(e) => setFiltroCampanha(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: '#007bff', cursor: 'pointer' }}>
                <option value="">Todas as Campanhas</option>
                {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <button onClick={abrirModalNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              <i className="fa-solid fa-plus-circle"></i>  Nova Oportunidade
            </button>
          </div>
        </div>

        {mostrarModal && (
          /* AQUI ESTÁ A CORREÇÃO: alignItems: 'center' (padrão) com padding 20px no overlay e overflowY: 'auto' no modal-content */
          <div className="modal-overlay" onClick={fecharModal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            
            {/* O modal agora respeita a altura da tela (maxHeight 90vh) e rola internamente (overflowY) */}
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ color: '#333', margin: 0 }}>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                <button onClick={fecharModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', padding: 0 }}>&times;</button>
              </div>
              
              <form onSubmit={salvarOportunidade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Título da Negociação *</label>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Valor Estimado (R$)</label>
                  <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Etapa do Funil *</label>
                  <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    {etapas.map(etp => <option key={etp.id} value={etp.id}>{etp.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Status da Negociação</label>
                  <select value={statusOp} onChange={(e) => setStatusOp(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: statusOp === 'ganho' ? '#e6f4ea' : statusOp === 'perdido' ? '#fce8e6' : '#fff' }}>
                    <option value="aberto">⏳ Em Aberto / Negociando</option>
                    <option value="ganho">✅ Ganho (Fechado)</option>
                    <option value="perdido">❌ Perdido</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#dc3545', fontSize: '0.9rem', fontWeight: 'bold' }}>Vincular a Campanha *</label>
                  <select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #007bff', background: '#f8f9fa' }}>
                    <option value="" disabled>-- Selecione --</option>
                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Prefeitura Alvo</label>
                  <div className="custom-select-container" ref={dropdownEmpresaRef}>
                    <input type="text" className="custom-select-input" placeholder="🔍 Buscar prefeitura..." value={buscaEmpresaNoModal} autoComplete="off" onFocus={() => { setBuscaEmpresaNoModal(''); setMostrarDropdownEmpresa(true); }} onChange={(e) => { setBuscaEmpresaNoModal(e.target.value); setMostrarDropdownEmpresa(true); }} />
                    {mostrarDropdownEmpresa && (
                      <div className="custom-select-dropdown">
                        <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold' }} onClick={() => { setEmpresaId(''); setBuscaEmpresaNoModal(''); setMostrarDropdownEmpresa(false); }}><i className="fa-solid fa-eraser"></i> Limpar</div>
                        {empresasFiltradasParaSelect.map(emp => (
                          <div key={emp.id} className="custom-select-option" onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoModal(emp.nome); setMostrarDropdownEmpresa(false); }}>{emp.nome}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Contato Principal</label>
                  <div className="custom-select-container" ref={dropdownContatoRef}>
                    <input type="text" className="custom-select-input" placeholder="🔍 Buscar contato..." value={buscaContatoNoModal} autoComplete="off" onFocus={() => { setBuscaContatoNoModal(''); setMostrarDropdownContato(true); }} onChange={(e) => { setBuscaContatoNoModal(e.target.value); setMostrarDropdownContato(true); }} />
                    {mostrarDropdownContato && (
                      <div className="custom-select-dropdown">
                        <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold' }} onClick={() => { setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownContato(false); }}><i className="fa-solid fa-eraser"></i> Limpar</div>
                        {contatosFiltradosParaSelect.map(cont => (
                          <div key={cont.id} className="custom-select-option" onClick={() => { setContatoId(cont.id); setBuscaContatoNoModal(cont.nome); setMostrarDropdownContato(false); }}>{cont.nome}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Resumo Geral do Negócio</label>
                  <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" placeholder="Descreva de forma geral o objetivo desta oportunidade..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
                </div>

                {/* HISTÓRICO DE NOTAS */}
                <div style={{ gridColumn: 'span 2', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#333', fontSize: '0.95rem', fontWeight: 'bold' }}><i className="fa-solid fa-comments"></i> Histórico de Interações (Notas)</label>
                  
                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                    {notas.length === 0 ? (
                      <div style={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>Nenhuma nota registada nesta negociação.</div>
                    ) : (
                      notas.map(n => (
                        <div key={n.id} style={{ background: '#fff', borderLeft: '4px solid #007bff', padding: '12px', borderRadius: '6px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          {editandoNotaId === n.id ? (
                            <div>
                              <textarea value={textoNotaEditada} onChange={e => setTextoNotaEditada(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #007bff', resize: 'vertical' }} rows="2" />
                              <div style={{ display: 'flex', gap: '5px', marginTop: '5px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={cancelarEdicaoNota} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                                <button type="button" onClick={() => salvarNotaEditada(n.id)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem', color: '#666' }}>
                                <strong style={{ color: '#333' }}><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span>{formatarDataHora(n.criado_em)}</span>
                                  <button type="button" onClick={() => iniciarEdicaoNota(n)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }} title="Editar nota"><i className="fa-solid fa-pen"></i></button>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.9rem', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{n.nota}</div>
                              {n.atualizado_em && (
                                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px', fontStyle: 'italic' }}>
                                  (Editado em: {formatarDataHora(n.atualizado_em)})
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {editandoId ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" value={novaNota} onChange={e => setNovaNota(e.target.value)} placeholder="Escreva o que conversou hoje..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); adicionarNota(); } }} />
                      <button type="button" onClick={adicionarNota} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        <i className="fa-solid fa-paper-plane"></i>
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#dc3545', fontStyle: 'italic' }}>* Guarde a negociação a primeira vez para poder começar a adicionar notas diárias.</div>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  {editandoId ? <button type="button" onClick={deletarOportunidade} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-trash-can"></i> Excluir</button> : <div></div>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={fecharModal} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-save"></i> Salvar Negócio
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* === O QUADRO KANBAN === */}
        {carregando ? (
          <div style={{textAlign: 'center', padding: '50px'}}>A carregar o Funil de Vendas...</div>
        ) : (
          <div className="kanban-board">
            {etapas.map((etapa, indexEtapa) => {
              const cardsDestaColuna = oportunidadesExibidas.filter(op => op.etapa_id === etapa.id);
              return (
                <div key={etapa.id} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, etapa.id)}>
                  <div className="kanban-column-header">
                    <span className="kanban-column-title">{etapa.nome}</span>
                    <span className="kanban-column-badge">{cardsDestaColuna.length}</span>
                  </div>
                  {cardsDestaColuna.map(op => {
                    let corBorda = '#007bff'; let bgCard = '#fff';
                    if (op.status === 'ganho') { corBorda = '#28a745'; bgCard = '#f4fbf5'; }
                    if (op.status === 'perdido') { corBorda = '#dc3545'; bgCard = '#fff5f5'; }
                    return (
                      <div key={op.id} className={`kanban-card ${indexEtapa > 3 ? 'quente' : indexEtapa > 1 ? 'morno' : 'frio'}`} style={{ borderLeft: `5px solid ${corBorda}`, backgroundColor: bgCard }} draggable="true" onDragStart={(e) => onDragStart(e, op.id)} onClick={() => abrirModalEdicao(op)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div className="kanban-card-title">{op.titulo}</div>
                          {op.status === 'ganho' && <i className="fa-solid fa-check-circle" style={{color: '#28a745'}}></i>}
                          {op.status === 'perdido' && <i className="fa-solid fa-circle-xmark" style={{color: '#dc3545'}}></i>}
                        </div>
                        <div className="kanban-card-value" style={{ color: corBorda }}>{formatarMoeda(op.valor)}</div>
                        {!filtroCampanha && op.campanha_nome && (
                          <div style={{ display: 'inline-block', background: '#e9ecef', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#444', marginBottom: '8px', fontWeight: 'bold' }}><i className="fa-solid fa-bullhorn"></i> {op.campanha_nome}</div>
                        )}
                        {op.empresa_nome && <div className="kanban-card-info"><i className="fa-solid fa-building"></i> {op.empresa_nome}</div>}
                        {op.contato_nome && <div className="kanban-card-info"><i className="fa-solid fa-user"></i> {op.contato_nome}</div>}
                      </div>
                    );
                  })}
                  {cardsDestaColuna.length === 0 && ( <div style={{textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '0.85rem', border: '1px dashed #ddd', borderRadius: '8px'}}>Solte aqui</div> )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}