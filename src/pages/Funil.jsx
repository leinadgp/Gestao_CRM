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

  const [equipe, setEquipe] = useState([]);
  const perfilUsuario = localStorage.getItem('perfil');
  const meuUsuarioId = localStorage.getItem('usuarioId');

  const [carregando, setCarregando] = useState(false);
  const [filtroCampanha, setFiltroCampanha] = useState('');

  const [modulosCampanha, setModulosCampanha] = useState([]);
  const [modulosSelecionados, setModulosSelecionados] = useState([]);

  const [desconto, setDesconto] = useState(0);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contatoId, setContatoId] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusOp, setStatusOp] = useState('aberto');
  const [vendedorId, setVendedorId] = useState('');

  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [textoNotaEditada, setTextoNotaEditada] = useState('');

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

  function onBoardMouseDown(e) {
    if (e.target.closest('.kanban-card')) return;
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
      carregarModulosDaCampanha(filtroCampanha);
    } else {
      setEtapas([]); setOportunidades([]); setModulosCampanha([]);
    }
  }, [filtroCampanha]);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownEmpresaRef.current && !dropdownEmpresaRef.current.contains(event.target)) {
        setMostrarDropdownEmpresa(false);
        if (empresaId) { const atual = empresas.find(e => e.id === parseInt(empresaId)); if (atual) setBuscaEmpresaNoModal(atual.nome); } else { setBuscaEmpresaNoModal(''); }
      }
      if (dropdownContatoRef.current && !dropdownContatoRef.current.contains(event.target)) {
        setMostrarDropdownContato(false);
        if (contatoId) { const atual = contatos.find(c => c.id === parseInt(contatoId)); if (atual) setBuscaContatoNoModal(atual.nome); } else { setBuscaContatoNoModal(''); }
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
      const [resEmp, resC, resCamp, resEquipe] = await Promise.all([
        axios.get(`${API_URL}/empresas`, getHeaders()),
        axios.get(`${API_URL}/contatos`, getHeaders()),
        axios.get(`${API_URL}/campanhas`, getHeaders()),
        axios.get(`${API_URL}/usuarios/equipe`, getHeaders())
      ]);
      setEmpresas(resEmp.data); setContatos(resC.data); setCampanhas(resCamp.data); setEquipe(resEquipe.data);
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

  async function carregarModulosDaCampanha(campanhaId) {
    try {
      const res = await axios.get(`${API_URL}/campanhas/${campanhaId}/modulos`, getHeaders());
      setModulosCampanha(res.data);
    } catch (e) { console.error('Erro ao buscar módulos', e); }
  }

  async function carregarNotas(opId) {
    try { const res = await axios.get(`${API_URL}/oportunidades/${opId}/notas`, getHeaders()); setNotas(res.data); }
    catch (e) { console.error('Erro ao buscar notas', e); }
  }

  async function adicionarNota() {
    if (!novaNota.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/oportunidades/${editandoId}/notas`, { nota: novaNota }, getHeaders());
      setNotas([res.data, ...notas]); setNovaNota('');
    } catch (e) { alert('Erro ao adicionar nota.'); }
  }

  function iniciarEdicaoNota(nota) { setEditandoNotaId(nota.id); setTextoNotaEditada(nota.nota); }
  function cancelarEdicaoNota() { setEditandoNotaId(null); setTextoNotaEditada(''); }

  async function salvarNotaEditada(id) {
    if (!textoNotaEditada.trim()) return;
    try {
      const res = await axios.put(`${API_URL}/notas/${id}`, { nota: textoNotaEditada }, getHeaders());
      setNotas(notas.map(n => n.id === id ? res.data : n)); cancelarEdicaoNota();
    } catch (e) { alert('Erro ao editar a nota.'); }
  }

  const empresasFiltradasParaSelect = empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresaNoModal.toLowerCase()));
  let baseContatosFiltrados = contatos;
  if (empresaId) baseContatosFiltrados = contatos.filter(c => c.empresa_id === parseInt(empresaId));
  const contatosFiltradosParaSelect = baseContatosFiltrados.filter(c => c.nome.toLowerCase().includes(buscaContatoNoModal.toLowerCase()));

  async function salvarContatoInline(e) {
    e.preventDefault();
    try {
      const payload = { nome: inlineNome, cargo: inlineCargo, empresa_id: empresaId || null, telefones_json: inlineTelefone ? [inlineTelefone] : [], emails_json: [] };
      const res = await axios.post(`${API_URL}/contatos`, payload, getHeaders());
      const novoContato = res.data;
      setContatos([...contatos, novoContato]); setContatoId(novoContato.id); setBuscaContatoNoModal(novoContato.nome); setMostrarCriarContato(false);
    } catch (err) { alert("Erro ao criar contato."); }
  }

  function toggleModulo(id) {
    setModulosSelecionados(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }

  const subtotalModulos = modulosSelecionados.reduce((acc, idMod) => {
    const m = modulosCampanha.find(mod => mod.id === idMod);
    return acc + (m ? Number(m.valor || 0) : 0);
  }, 0);

  const valorFinalCalculado = subtotalModulos * (1 - (Number(desconto) / 100));

  function abrirModalNovo() {
    if (!filtroCampanha) return alert("Selecione uma campanha no topo da tela antes de criar uma negociação!");
    setEditandoId(null); setTitulo(''); setValor(''); setEmpresaId(''); setContatoId(''); setObservacoes('');
    setStatusOp('aberto'); setEtapaId(etapas.length > 0 ? etapas[0].id : '');
    setVendedorId(meuUsuarioId || ''); setModulosSelecionados([]); setDesconto(0);
    setBuscaEmpresaNoModal(''); setBuscaContatoNoModal(''); setNotas([]); setNovaNota(''); cancelarEdicaoNota();
    setMostrarModal(true);
  }

  function abrirModalEdicao(op) {
    setEditandoId(op.id); setTitulo(op.titulo); setValor(op.valor);
    setEmpresaId(op.empresa_id || ''); setContatoId(op.contato_id || '');
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto'); setVendedorId(op.vendedor_id || '');
    setDesconto(op.desconto || 0);

    let mods = [];
    try {
      if (op.modulos_ids) {
        mods = typeof op.modulos_ids === 'string' ? JSON.parse(op.modulos_ids) : op.modulos_ids;
        if (!Array.isArray(mods)) mods = [];
      }
    } catch (e) { mods = []; }

    setModulosSelecionados(mods);

    setBuscaEmpresaNoModal(op.empresa_nome || ''); setBuscaContatoNoModal(op.contato_nome || '');
    setNotas([]); cancelarEdicaoNota(); carregarNotas(op.id);
    setMostrarModal(true);
  }

  function fecharModal() { setMostrarModal(false); }

  function formatarMoeda(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function salvarOportunidade(e) {
    e.preventDefault();
    const valorEnviar = modulosSelecionados.length > 0 ? valorFinalCalculado : (valor ? parseFloat(valor.toString().replace(/\./g, '').replace(',', '.')) : 0);

    const dados = {
      titulo, valor: valorEnviar, empresa_id: empresaId || null, contato_id: contatoId || null,
      etapa_id: etapaId, observacoes, campanha_id: filtroCampanha, status: statusOp,
      vendedor_id: vendedorId || null, modulos_ids: modulosSelecionados,
      desconto: modulosSelecionados.length > 0 ? Number(desconto) : 0
    };

    try {
      if (editandoId) await axios.put(`${API_URL}/oportunidades/${editandoId}`, dados, getHeaders());
      else await axios.post(`${API_URL}/oportunidades`, dados, getHeaders());
      fecharModal(); carregarFunilDaCampanha(filtroCampanha);
    } catch (erro) { alert('Erro ao salvar oportunidade.'); }
  }

  async function deletarOportunidade() {
    if (!window.confirm('Excluir este negócio? O histórico de notas também será apagado.')) return;
    try { await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders()); fecharModal(); carregarFunilDaCampanha(filtroCampanha); }
    catch (error) { console.error(error); }
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#007bff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #0056b3', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '100%' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap' }}><i className="fa-solid fa-layer-group"></i> Funil Ativo:</label>
              <select
                value={filtroCampanha} onChange={(e) => setFiltroCampanha(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: '#fff', cursor: 'pointer', fontSize: '1rem', maxWidth: '220px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
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
                <div style={{ maxWidth: '80%' }}>
                  <h3 style={{ color: '#333', margin: 0 }}>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#007bff', fontWeight: 'bold', marginTop: '5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={campanhaSelecionadaObj?.nome}>
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
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Etapa no Funil *</label>
                  <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #007bff', background: '#f8f9fa' }}>
                    {etapas.map(etp => <option key={etp.id} value={etp.id}>{etp.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Status da Negociação
                  </label>

                  <select
                    value={statusOp}
                    onChange={(e) => setStatusOp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      background:
                        statusOp === 'naofunciona' ? '#fff9db' :
                          statusOp === 'naoatendeu' ? '#fff4e6' :
                            statusOp === 'tarefa' ? '#f3e8ff' :
                              statusOp === 'inscricao' || statusOp === 'ganho' ? '#e6f4ea' :
                                statusOp === 'interessada' ? '#e9f7ef' :
                                  statusOp === 'avaliar' ? '#e7f3ff' :
                                    statusOp === 'perdido' ? '#fdecea' :
                                      '#fff'
                    }}
                  >
                    <option value="aberto">⚪ Em Aberto</option>
                    <option value="avaliar">🔵 Avaliar</option>
                    <option value="interessada">🟢 Interessada</option>
                    <option value="inscricao">🏆 Inscrição (Ganho)</option>
                    <option value="ganho">🏆 Vendido (Ganho)</option>
                    <option value="tarefa">🟣 Tarefa</option>
                    <option value="naoatendeu">🟠 Não Atendeu</option>
                    <option value="naofunciona">🟡 Não Funciona</option>
                    <option value="perdido">🔴 Perdido</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2', background: '#f4fbf5', padding: '15px', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#28a745', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-cart-shopping"></i> Composição do Pacote (Turmas / Módulos)
                  </label>

                  {modulosCampanha.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Este curso não possui módulos. O valor deverá ser inserido manualmente abaixo.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {modulosCampanha.map(mod => (
                        <label
                          key={mod.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', background: modulosSelecionados.includes(mod.id) ? '#d4edda' : '#fff',
                            padding: '8px 12px', borderRadius: '6px', border: modulosSelecionados.includes(mod.id) ? '1px solid #28a745' : '1px solid #ccc',
                            cursor: 'pointer', transition: '0.2s'
                          }}
                        >
                          <input
                            type="checkbox" checked={modulosSelecionados.includes(mod.id)} onChange={() => toggleModulo(mod.id)}
                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                          <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: modulosSelecionados.includes(mod.id) ? 'bold' : 'normal' }}>
                            {mod.nome} <span style={{ color: '#28a745' }}>({formatarMoeda(mod.valor)})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {modulosSelecionados.length > 0 && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #c3e6cb', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>Subtotal</label>
                        <div style={{ padding: '8px 12px', background: '#e9ecef', borderRadius: '4px', fontWeight: 'bold', color: '#555' }}>{formatarMoeda(subtotalModulos)}</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#007bff', marginBottom: '4px' }}>Desconto (%)</label>
                        <input type="number" min="0" max="100" value={desconto} onChange={e => setDesconto(e.target.value)} style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #007bff', background: '#e7f3ff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#28a745', marginBottom: '4px' }}>Valor a Cobrar</label>
                        <div style={{ padding: '8px 12px', background: '#d4edda', borderRadius: '4px', fontWeight: 'bold', color: '#155724', border: '1px solid #c3e6cb' }}>{formatarMoeda(valorFinalCalculado)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Valor Final da Negociação (R$)</label>
                  <input
                    type="number" step="0.01"
                    value={modulosSelecionados.length > 0 ? valorFinalCalculado : valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={modulosSelecionados.length > 0}
                    placeholder={modulosSelecionados.length > 0 ? "Calculado automaticamente pelos módulos acima" : "Digite o valor manualmente..."}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: modulosSelecionados.length > 0 ? '#e9ecef' : '#fff' }}
                  />
                  {modulosSelecionados.length > 0 && <span style={{ fontSize: '0.75rem', color: '#888' }}>* O valor está sendo calculado automaticamente pelas opções marcadas acima.</span>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-user-tie" style={{ color: '#722ed1' }}></i> Vendedor Responsável
                  </label>
                  <select
                    value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} disabled={perfilUsuario === 'vendedor'}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: perfilUsuario === 'vendedor' ? '#eee' : '#fff' }}
                  >
                    <option value="">-- Sem dono definido --</option>
                    {equipe.map(user => <option key={user.id} value={user.id}>{user.nome} ({user.perfil})</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Prefeitura Alvo</label>
                  <div className="custom-select-container" ref={dropdownEmpresaRef}>
                    <input type="text" className="custom-select-input" placeholder="🔍 Buscar prefeitura..." value={buscaEmpresaNoModal} autoComplete="off" onFocus={() => { setBuscaEmpresaNoModal(''); setMostrarDropdownEmpresa(true); }} onChange={(e) => {
                      setBuscaEmpresaNoModal(e.target.value); setMostrarDropdownEmpresa(true);
                      if (e.target.value === '') { setEmpresaId(''); setContatoId(''); setBuscaContatoNoModal(''); }
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
                    Contato Principal
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
                            </div>
                          ))
                        ) : (
                          <div className="custom-select-no-results" style={{ fontStyle: 'italic', color: '#888' }}>Nenhum contato encontrado.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>Resumo Geral do Negócio</label>
                  <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
                </div>

                <div style={{ gridColumn: 'span 2', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#333', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-comments"></i> Histórico de Interações (Notas)
                  </label>

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
                                <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '8px', fontStyle: 'italic', textAlign: 'right' }}>
                                  Editado em: {formatarDataHora(n.atualizado_em)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {editandoId && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" value={novaNota} onChange={e => setNovaNota(e.target.value)} placeholder="Escreva o que conversou hoje..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarNota(); } }} />
                      <button type="button" onClick={adicionarNota} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        <i className="fa-solid fa-paper-plane"></i>
                      </button>
                    </div>
                  )}
                  {!editandoId && (
                    <div style={{ fontSize: '0.85rem', color: '#dc3545', fontStyle: 'italic' }}>* Guarde a negociação a primeira vez para poder adicionar notas diárias.</div>
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

        {!filtroCampanha ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '12px', border: '2px dashed #ccc', marginTop: '20px' }}>
            <h2 style={{ color: '#555' }}>Nenhum Funil Selecionado</h2>
          </div>
        ) : carregando ? (
          <div style={{ textAlign: 'center', padding: '50px' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br />Carregando seu Funil...</div>
        ) : (
          <div className="kanban-board" ref={boardRef} onMouseDown={onBoardMouseDown} onMouseLeave={onBoardMouseLeave} onMouseUp={onBoardMouseUp} onMouseMove={onBoardMouseMove} style={{ userSelect: 'none', marginTop: '20px' }}>
            {etapas.map((etapa) => {
              const cardsDestaColuna = oportunidades.filter(op => op.etapa_id === etapa.id);
              return (
                <div key={etapa.id} className="kanban-column">
                  <div className="kanban-column-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="kanban-column-title" style={{ fontWeight: 'bold', color: '#333' }}>{etapa.nome}</span>
                    </div>
                  </div>
                  <div className="kanban-cards-container">
                    {cardsDestaColuna.map(op => {
                      let corBorda = '#c9c5c5';
                      let bgCard = '#fff';

                      if (op.status === 'naofunciona') { corBorda = '#f1c40f'; bgCard = '#fff9db'; }
                      if (op.status === 'naoatendeu') { corBorda = '#e67e22'; bgCard = '#fff4e6'; }
                      if (op.status === 'tarefa') { corBorda = '#6f42c1'; bgCard = '#f3e8ff'; }
                      if (op.status === 'inscricao' || op.status === 'ganho') { corBorda = '#195326'; bgCard = '#e6f4ea'; }
                      if (op.status === 'interessada') { corBorda = '#28a745'; bgCard = '#e9f7ef'; }
                      if (op.status === 'avaliar') { corBorda = '#007bff'; bgCard = '#e7f3ff'; }
                      if (op.status === 'perdido') { corBorda = '#dc3545'; bgCard = '#fdecea'; }
                      
                      let idsModsCard = [];
                      try {
                        if (op.modulos_ids) {
                          idsModsCard = typeof op.modulos_ids === 'string' ? JSON.parse(op.modulos_ids) : op.modulos_ids;
                          if (!Array.isArray(idsModsCard)) idsModsCard = [];
                        }
                      } catch (e) { idsModsCard = []; }

                      const nomesModsCard = idsModsCard.map(id => {
                        const m = modulosCampanha.find(mod => mod.id === id);
                        return m ? m.nome : null;
                      }).filter(Boolean);

                      return (
                        <div key={op.id} className="kanban-card" style={{ borderLeft: `5px solid ${corBorda}`, backgroundColor: bgCard, marginBottom: '12px', padding: '12px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => abrirModalEdicao(op)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '0.95rem' }}>{op.titulo}</div>
                          </div>
                          <div style={{ color: corBorda, fontSize: '0.9rem', fontWeight: 'bold' }}>{formatarMoeda(op.valor)}</div>

                          {nomesModsCard.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {nomesModsCard.map((nome, idx) => (
                                <span key={idx} style={{ fontSize: '0.7rem', color: '#28a745', fontWeight: 'bold', background: '#e6f4ea', padding: '2px 6px', borderRadius: '4px' }}>
                                  <i className="fa-solid fa-calendar-check"></i> {nome}
                                </span>
                              ))}
                            </div>
                          )}

                          {op.empresa_nome && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}><i className="fa-solid fa-building"></i> {op.empresa_nome}</div>}
                          {op.vendedor_nome && (
                            <div style={{ display: 'inline-block', marginTop: '10px', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#555', border: '1px solid #ddd' }}>
                              <i className="fa-solid fa-user-tie" style={{ color: '#722ed1', marginRight: '4px' }}></i> {op.vendedor_nome}
                            </div>
                          )}
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