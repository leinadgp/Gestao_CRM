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
  const [carregando, setCarregando] = useState(false);

  const [filtroCampanha, setFiltroCampanha] = useState('');

  // Estados do Modal Principal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contatoId, setContatoId] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusOp, setStatusOp] = useState('aberto');

  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null); 
  const [textoNotaEditada, setTextoNotaEditada] = useState(''); 

  // Estados para a Criação Rápida de Contato
  const [mostrarCriarContato, setMostrarCriarContato] = useState(false);
  const [inlineNome, setInlineNome] = useState('');
  const [inlineCargo, setInlineCargo] = useState('');
  const [inlineTelefone, setInlineTelefone] = useState('');

  const [buscaEmpresaNoModal, setBuscaEmpresaNoModal] = useState('');
  const [mostrarDropdownEmpresa, setMostrarDropdownEmpresa] = useState(false);
  const dropdownEmpresaRef = useRef(null);

  const [buscaContatoNoModal, setBuscaContatoNoModal] = useState('');
  const [mostrarDropdownContato, setMostrarDropdownContato] = useState(false);
  const dropdownContatoRef = useRef(null);

  const boardRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // === CORREÇÃO DO BUG: Impede arrastar a tela se clicar num cartão ===
  function onBoardMouseDown(e) {
    if (e.target.closest('.kanban-card')) return; // A MÁGICA ESTÁ NESTA LINHA!

    isDown.current = true;
    if (boardRef.current) {
      boardRef.current.style.cursor = 'grabbing';
      startX.current = e.pageX - boardRef.current.offsetLeft;
      scrollLeft.current = boardRef.current.scrollLeft;
    }
  }

  function onBoardMouseLeave() { isDown.current = false; if (boardRef.current) boardRef.current.style.cursor = 'auto'; }
  function onBoardMouseUp() { isDown.current = false; if (boardRef.current) boardRef.current.style.cursor = 'auto'; }

  function onBoardMouseMove(e) {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; 
    if (boardRef.current) { boardRef.current.scrollLeft = scrollLeft.current - walk; }
  }

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => { carregarDadosBase(); }, []);

  useEffect(() => {
    if (filtroCampanha) {
      carregarFunilDaCampanha(filtroCampanha);
    } else {
      setEtapas([]);
      setOportunidades([]);
    }
  }, [filtroCampanha]);

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

  async function carregarDadosBase() {
    try {
      const [resEmp, resC, resCamp] = await Promise.all([
        axios.get(`${API_URL}/empresas`, getHeaders()),
        axios.get(`${API_URL}/contatos`, getHeaders()),
        axios.get(`${API_URL}/campanhas`, getHeaders()) 
      ]);
      setEmpresas(resEmp.data);
      setContatos(resC.data);
      setCampanhas(resCamp.data);
    } catch (erro) { console.error(erro); }
  }

  async function carregarFunilDaCampanha(campanhaId) {
    setCarregando(true);
    try {
      const resEtapas = await axios.get(`${API_URL}/campanhas/${campanhaId}/etapas`, getHeaders());
      setEtapas(resEtapas.data);

      const resOps = await axios.get(`${API_URL}/oportunidades`, getHeaders());
      const opsDestaCampanha = resOps.data.filter(op => op.campanha_id === parseInt(campanhaId));
      setOportunidades(opsDestaCampanha);

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

  function iniciarEdicaoNota(nota) { setEditandoNotaId(nota.id); setTextoNotaEditada(nota.nota); }
  function cancelarEdicaoNota() { setEditandoNotaId(null); setTextoNotaEditada(''); }

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
  
  let baseContatosFiltrados = contatos;
  if (empresaId) {
    baseContatosFiltrados = contatos.filter(c => c.empresa_id === parseInt(empresaId));
  }
  const contatosFiltradosParaSelect = baseContatosFiltrados.filter(c => c.nome.toLowerCase().includes(buscaContatoNoModal.toLowerCase()));

  async function salvarContatoInline(e) {
    e.preventDefault();
    try {
      const payload = {
        nome: inlineNome,
        cargo: inlineCargo,
        empresa_id: empresaId || null, 
        telefones_json: inlineTelefone ? [inlineTelefone] : [],
        emails_json: []
      };
      
      const res = await axios.post(`${API_URL}/contatos`, payload, getHeaders());
      const novoContato = res.data;
      
      setContatos([...contatos, novoContato]);
      
      setContatoId(novoContato.id);
      setBuscaContatoNoModal(novoContato.nome);
      
      setMostrarCriarContato(false);
    } catch (err) {
      alert("Erro ao criar contato.");
    }
  }

  function abrirModalNovo() {
    if (!filtroCampanha) { alert("Selecione uma campanha no topo da tela antes de criar uma negociação!"); return; }
    
    setEditandoId(null); setTitulo(''); setValor(''); setEmpresaId(''); setContatoId(''); setObservacoes('');
    setStatusOp('aberto'); setEtapaId(etapas.length > 0 ? etapas[0].id : ''); 
    setBuscaEmpresaNoModal(''); setBuscaContatoNoModal('');
    setNotas([]); setNovaNota(''); 
    cancelarEdicaoNota(); 
    setMostrarModal(true);
  }

  function abrirModalEdicao(op) {
    setEditandoId(op.id); setTitulo(op.titulo); setValor(op.valor);
    setEmpresaId(op.empresa_id || ''); setContatoId(op.contato_id || '');
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto');
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
      campanha_id: filtroCampanha, 
      status: statusOp
    };

    try {
      if (editandoId) await axios.put(`${API_URL}/oportunidades/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/oportunidades`, dados, getHeaders());
      fecharModal();
      carregarFunilDaCampanha(filtroCampanha); 
    } catch (erro) { alert('Erro ao salvar oportunidade.'); }
  }

  async function deletarOportunidade() {
    if(!window.confirm('Excluir este negócio? O histórico de notas também será apagado.')) return;
    try {
      await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders());
      fecharModal(); carregarFunilDaCampanha(filtroCampanha);
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
    } catch (error) { carregarFunilDaCampanha(filtroCampanha); }
  }

  const campanhaSelecionadaObj = campanhas.find(c => c.id === parseInt(filtroCampanha));

  return (
    <div>
      <Header titulo="Funil de Vendas" />

      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Gestão de Pipeline</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>Selecione um Funil / Campanha abaixo para trabalhar.</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#007bff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #0056b3', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}><i className="fa-solid fa-layer-group"></i> Funil Ativo:</label>
              <select value={filtroCampanha} onChange={(e) => setFiltroCampanha(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>
                <option value="" style={{ color: '#333' }}>-- Selecione um Curso/Campanha --</option>
                {campanhas.map(c => <option key={c.id} value={c.id} style={{ color: '#333' }}>{c.nome}</option>)}
              </select>
            </div>
            
            {filtroCampanha && (
              <button onClick={abrirModalNovo} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-plus-circle"></i>  Nova Oportunidade
              </button>
            )}
          </div>
        </div>

        {mostrarModal && (
          <div className="modal-overlay" onClick={fecharModal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ color: '#333', margin: 0 }}>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#007bff', fontWeight: 'bold', marginTop: '5px' }}>
                    <i className="fa-solid fa-bullhorn"></i> Vinculado à campanha: {campanhaSelecionadaObj?.nome}
                  </div>
                </div>
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
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Etapa no Funil *</label>
                  <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #007bff', background: '#f8f9fa' }}>
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

                {/* Preenche a lacuna do grid */}
                <div></div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Prefeitura Alvo</label>
                  <div className="custom-select-container" ref={dropdownEmpresaRef}>
                    <input type="text" className="custom-select-input" placeholder="🔍 Buscar prefeitura..." value={buscaEmpresaNoModal} autoComplete="off" onFocus={() => { setBuscaEmpresaNoModal(''); setMostrarDropdownEmpresa(true); }} onChange={(e) => { setBuscaEmpresaNoModal(e.target.value); setMostrarDropdownEmpresa(true); 
                    if(e.target.value === '') { setEmpresaId(''); setContatoId(''); setBuscaContatoNoModal(''); }
                    }} />
                    {mostrarDropdownEmpresa && (
                      <div className="custom-select-dropdown">
                        <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold' }} onClick={() => { setEmpresaId(''); setBuscaEmpresaNoModal(''); setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownEmpresa(false); }}><i className="fa-solid fa-eraser"></i> Limpar Seleção</div>
                        {empresasFiltradasParaSelect.map(emp => (
                          <div key={emp.id} className="custom-select-option" onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoModal(emp.nome); setMostrarDropdownEmpresa(false); }}>{emp.nome}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Contato Principal {empresaId && <span style={{ color: '#28a745', fontSize: '0.75rem' }}>(Filtrado)</span>}
                  </label>
                  <div className="custom-select-container" ref={dropdownContatoRef}>
                    <input type="text" className="custom-select-input" placeholder={empresaId ? "🔍 Buscar contato desta prefeitura..." : "🔍 Buscar contato..."} value={buscaContatoNoModal} autoComplete="off" onFocus={() => { setBuscaContatoNoModal(''); setMostrarDropdownContato(true); }} onChange={(e) => { setBuscaContatoNoModal(e.target.value); setMostrarDropdownContato(true); }} />
                    
                    {mostrarDropdownContato && (
                      <div className="custom-select-dropdown">
                        <div className="custom-select-option" style={{ color: '#dc3545', fontWeight: 'bold' }} onClick={() => { setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownContato(false); }}><i className="fa-solid fa-eraser"></i> Limpar Seleção</div>
                        
                        {contatosFiltradosParaSelect.length > 0 ? (
                          contatosFiltradosParaSelect.map(cont => (
                            <div key={cont.id} className="custom-select-option" onClick={() => { setContatoId(cont.id); setBuscaContatoNoModal(cont.nome); setMostrarDropdownContato(false); }}>
                              <strong style={{ color: '#333' }}>{cont.nome}</strong>
                              {cont.cargo && <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '6px' }}>- {cont.cargo}</span>}
                            </div>
                          ))
                        ) : (
                          <div className="custom-select-no-results" style={{ fontStyle: 'italic', color: '#888' }}>
                            Nenhum contato encontrado {empresaId ? 'nesta prefeitura' : ''}.
                          </div>
                        )}

                        <div 
                          className="custom-select-option" 
                          style={{ borderTop: '1px solid #eee', background: '#e7f3ff', color: '#007bff', fontWeight: 'bold', textAlign: 'center' }}
                          onClick={() => {
                            setMostrarDropdownContato(false);
                            setInlineNome(buscaContatoNoModal);
                            setInlineCargo('');
                            setInlineTelefone('');
                            setMostrarCriarContato(true);
                          }}
                        >
                          <i className="fa-solid fa-user-plus"></i> + Adicionar Novo Contato
                        </div>
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

        {/* MINI-MODAL PARA CRIAÇÃO DE CONTATO RÁPIDO */}
        {mostrarCriarContato && (
          <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-content" style={{ maxWidth: '400px', width: '100%', padding: '25px', borderRadius: '12px' }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>
                <i className="fa-solid fa-user-plus" style={{ color: '#007bff' }}></i> Cadastro Rápido
              </h3>
              
              {empresaId ? (
                <p style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 'bold', marginBottom: '15px' }}>
                  <i className="fa-solid fa-link"></i> Será vinculado à prefeitura selecionada.
                </p>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#dc3545', marginBottom: '15px' }}>
                  Sem prefeitura selecionada (Contato Avulso).
                </p>
              )}

              <form onSubmit={salvarContatoInline} style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Nome do Contato *</label>
                  <input type="text" value={inlineNome} onChange={e => setInlineNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Cargo / Função</label>
                  <input type="text" value={inlineCargo} onChange={e => setInlineCargo(e.target.value)} placeholder="Ex: Prefeito, Secretário..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Telefone (Opcional)</label>
                  <input type="text" value={inlineTelefone} onChange={e => setInlineTelefone(e.target.value)} placeholder="(XX) 99999-9999" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarCriarContato(false)} style={{ background: '#eee', color: '#333', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Contato</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TELA DE CARREGAMENTO OU MENSAGEM PARA SELECIONAR FUNIL */}
        {!filtroCampanha ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '12px', border: '2px dashed #ccc', marginTop: '20px' }}>
            <i className="fa-solid fa-arrow-up" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '20px' }}></i>
            <h2 style={{ color: '#555' }}>Nenhum Funil Selecionado</h2>
            <p style={{ color: '#888', fontSize: '1.1rem' }}>Use o menu azul no topo da tela para escolher qual campanha/curso você deseja gerenciar.</p>
          </div>
        ) : carregando ? (
          <div style={{textAlign: 'center', padding: '50px'}}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Carregando seu Funil...</div>
        ) : (
          <div className="kanban-board" ref={boardRef} onMouseDown={onBoardMouseDown} onMouseLeave={onBoardMouseLeave} onMouseUp={onBoardMouseUp} onMouseMove={onBoardMouseMove} style={{ userSelect: 'none', marginTop: '20px' }}>
            {etapas.map((etapa, indexEtapa) => {
              const cardsDestaColuna = oportunidades.filter(op => op.etapa_id === etapa.id);
              return (
                <div key={etapa.id} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, etapa.id)}>
                  <div className="kanban-column-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="kanban-column-title" style={{ fontWeight: 'bold', color: '#333' }}>{etapa.nome}</span>
                      <span className="kanban-column-badge" style={{ background: '#ddd', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>{cardsDestaColuna.length}</span>
                    </div>
                  </div>
                  <div className="kanban-cards-container">
                    {cardsDestaColuna.map(op => {
                      let corBorda = '#007bff'; let bgCard = '#fff';
                      if (op.status === 'ganho') { corBorda = '#28a745'; bgCard = '#f4fbf5'; }
                      if (op.status === 'perdido') { corBorda = '#dc3545'; bgCard = '#fff5f5'; }
                      return (
                        <div key={op.id} className="kanban-card" style={{ borderLeft: `5px solid ${corBorda}`, backgroundColor: bgCard, marginBottom: '12px', padding: '12px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }} draggable="true" onDragStart={(e) => onDragStart(e, op.id)} onClick={() => abrirModalEdicao(op)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '0.95rem' }}>{op.titulo}</div>
                            {op.status === 'ganho' && <i className="fa-solid fa-check-circle" style={{color: '#28a745', fontSize: '1rem'}}></i>}
                            {op.status === 'perdido' && <i className="fa-solid fa-circle-xmark" style={{color: '#dc3545', fontSize: '1rem'}}></i>}
                          </div>
                          <div style={{ color: corBorda, fontSize: '0.9rem', fontWeight: 'bold' }}>{formatarMoeda(op.valor)}</div>
                          {op.empresa_nome && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}><i className="fa-solid fa-building"></i> {op.empresa_nome}</div>}
                          {op.contato_nome && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}><i className="fa-solid fa-user"></i> {op.contato_nome}</div>}
                        </div>
                      );
                    })}
                    <div style={{ height: '40px' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}