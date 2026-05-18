import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import { TarefasOportunidade } from '../componentes/TarefasOportunidade.jsx';
import { listarMinhasTarefas, classificarTarefa } from '../utils/tarefasService.js';

// --- UTILITÁRIOS ---
const parseJSONSeguro = (dadoString, fallback = []) => {
  if (!dadoString) return fallback;
  if (typeof dadoString !== 'string') return dadoString;
  try { return JSON.parse(dadoString); } catch { return fallback; }
};

export function Funil() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- ESTADOS BASE ---
  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [equipe, setEquipe] = useState([]);

  // --- CONTROLES DE TELA E BUSCA ---
  const [carregando, setCarregando] = useState(false);
  const [filtroCampanha, setFiltroCampanha] = useState('');
  const [buscaGeral, setBuscaGeral] = useState(''); 
  const [dropdownCampanhaAberto, setDropdownCampanhaAberto] = useState(false);
  const dropdownCampanhaRef = useRef(null);

  // --- DADOS DO USUÁRIO ---
  const perfilUsuario = localStorage.getItem('perfil');
  const meuUsuarioId = localStorage.getItem('usuarioId');
  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

  // --- ESTADOS DA OPORTUNIDADE (MODAL PRINCIPAL) ---
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
  const [vendedorOriginal, setVendedorOriginal] = useState(''); 
  const [desconto, setDesconto] = useState(0);
  const [descontoReais, setDescontoReais] = useState(0);

  // --- ESTADOS DE MÓDULOS ---
  const [modulosCampanha, setModulosCampanha] = useState([]);
  const [modulosSelecionados, setModulosSelecionados] = useState([]);

  // --- ESTADOS DE NOTAS ---
  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [textoNotaEditada, setTextoNotaEditada] = useState('');

  // --- ESTADOS DE TAREFAS ---
  const [tarefasPorOp, setTarefasPorOp] = useState({});

  // --- ESTADOS DO SUB-MODAL DE CONTATO ---
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState(null);
  const [editandoContatoRapido, setEditandoContatoRapido] = useState(false);
  const [contatoNome, setContatoNome] = useState('');
  const [contatoCargo, setContatoCargo] = useState('');
  const [contatoEmails, setContatoEmails] = useState('');
  const [contatoTelefones, setContatoTelefones] = useState('');

  // --- ESTADOS DO SUB-MODAL DE EMPRESA ---
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [editandoEmpresaRapida, setEditandoEmpresaRapida] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaEstado, setEmpresaEstado] = useState('');
  const [empresaCidade, setEmpresaCidade] = useState('');
  const [empresaTelefones, setEmpresaTelefones] = useState('');
  const [empresaClassificacao, setEmpresaClassificacao] = useState('nao_assessorada');
  const [empresaEstrelas, setEmpresaEstrelas] = useState(0);

  // --- AUTOCOMPLETES ---
  const [buscaEmpresaNoModal, setBuscaEmpresaNoModal] = useState('');
  const [mostrarDropdownEmpresa, setMostrarDropdownEmpresa] = useState(false);
  const dropdownEmpresaRef = useRef(null);

  const [buscaContatoNoModal, setBuscaContatoNoModal] = useState('');
  const [mostrarDropdownContato, setMostrarDropdownContato] = useState(false);
  const dropdownContatoRef = useRef(null);

  // --- DRAG TO SCROLL (KANBAN) ---
  const boardRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => { 
    carregarDadosBase(); 
  }, []);

  const carregarResumoTarefas = useCallback(async () => {
    try {
      const todas = await listarMinhasTarefas();
      const mapa = {};
      todas.filter(t => !t.concluida).forEach(t => {
        const opId = t.oportunidade_id;
        if (!mapa[opId]) mapa[opId] = { total: 0, urgente: 0 };
        mapa[opId].total += 1;
        const st = classificarTarefa(t);
        if (st === 'proxima' || st === 'vencida') mapa[opId].urgente += 1;
      });
      setTarefasPorOp(mapa);
    } catch {
      setTarefasPorOp({});
    }
  }, []);

  useEffect(() => {
    carregarResumoTarefas();
    const handler = () => carregarResumoTarefas();
    window.addEventListener('tarefasAtualizadas', handler);
    return () => window.removeEventListener('tarefasAtualizadas', handler);
  }, [carregarResumoTarefas, oportunidades]);

  useEffect(() => {
    const opId = location.state?.abrirOportunidadeId;
    if (!opId || oportunidades.length === 0) return;
    const op = oportunidades.find(o => Number(o.id) === Number(opId));
    if (op) {
      abrirModalEdicao(op);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state, oportunidades]);

  useEffect(() => {
    if (filtroCampanha) {
      carregarFunilDaCampanha(filtroCampanha);
      carregarModulosDaCampanha(filtroCampanha);
    } else {
      setEtapas([]); 
      setOportunidades([]); 
      setModulosCampanha([]);
    }
  }, [filtroCampanha]);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownEmpresaRef.current && !dropdownEmpresaRef.current.contains(event.target)) {
        setMostrarDropdownEmpresa(false);
        if (empresaId) { 
          const atual = empresas.find(e => e.id === parseInt(empresaId)); 
          if (atual) setBuscaEmpresaNoModal(atual.nome); 
        } else { 
          setBuscaEmpresaNoModal(''); 
        }
      }
      if (dropdownContatoRef.current && !dropdownContatoRef.current.contains(event.target)) {
        setMostrarDropdownContato(false);
        if (contatoId) { 
          const atual = contatos.find(c => c.id === parseInt(contatoId)); 
          if (atual) setBuscaContatoNoModal(atual.nome); 
        } else { 
          setBuscaContatoNoModal(''); 
        }
      }
      if (dropdownCampanhaRef.current && !dropdownCampanhaRef.current.contains(event.target)) {
        setDropdownCampanhaAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [empresaId, empresas, contatoId, contatos]);

  useEffect(() => {
    const lidarComBotaoVoltar = () => {
      // Se apertar voltar no celular, a gente apenas fecha o modal que estiver aberto
      if (mostrarModal) {
        setMostrarModal(false);
      } else if (mostrarModalContato) {
        setMostrarModalContato(false);
      } else if (mostrarModalEmpresa) {
        setMostrarModalEmpresa(false);
      }
    };

    // Só "engana" o histórico se algum modal estiver aberto
    if (mostrarModal || mostrarModalContato || mostrarModalEmpresa) {
      window.history.pushState(null, null, window.location.pathname);
      window.addEventListener('popstate', lidarComBotaoVoltar);
    }

    return () => {
      window.removeEventListener('popstate', lidarComBotaoVoltar);
    };
  }, [mostrarModal, mostrarModalContato, mostrarModalEmpresa]);

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

  async function carregarDadosBase() {
    setCarregando(true);
    try {
      const config = getHeaders();
      const [resEmp, resC, resCamp, resEquipe] = await Promise.all([
        axios.get(`${API_URL}/empresas`, config),
        axios.get(`${API_URL}/contatos`, config),
        axios.get(`${API_URL}/campanhas`, config),
        axios.get(`${API_URL}/usuarios/equipe`, config)
      ]);
      
      setEmpresas(resEmp.data); 
      setContatos(resC.data); 
      
      const todasCampanhas = resCamp.data;
      setCampanhas(todasCampanhas); 
      setEquipe(resEquipe.data);

      if (todasCampanhas.length > 0) {
        const primeiraAtiva = todasCampanhas.find(c => c.arquivada !== true);
        setFiltroCampanha(primeiraAtiva ? String(primeiraAtiva.id) : String(todasCampanhas[0].id));
      }
    } catch (erro) { 
      console.error('Erro ao buscar dados base do Funil:', erro); 
      alert('Falha ao carregar dados. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarFunilDaCampanha(campanhaId) {
    setCarregando(true);
    try {
      const config = getHeaders();
      const [resEtapas, resOps] = await Promise.all([
        axios.get(`${API_URL}/campanhas/${campanhaId}/etapas`, config),
        axios.get(`${API_URL}/oportunidades`, config)
      ]);
      
      setEtapas(resEtapas.data);
      const opsDestaCampanha = resOps.data.filter(op => Number(op.campanha_id) === Number(campanhaId));
      setOportunidades(opsDestaCampanha);
    } catch (erro) { 
      console.error(erro); 
    } finally { 
      setCarregando(false); 
    }
  }

  async function carregarModulosDaCampanha(campanhaId) {
    try {
      const res = await axios.get(`${API_URL}/campanhas/${campanhaId}/modulos`, getHeaders());
      setModulosCampanha(res.data);
    } catch (e) { console.error('Erro ao buscar módulos', e); }
  }

  const oportunidadesPorEtapa = useMemo(() => {
    const mapa = {};
    etapas.forEach(e => mapa[e.id] = []);
    
    const termoBusca = buscaGeral.toLowerCase();
    const opsFiltradasBusca = oportunidades.filter(op => {
      const tituloMatch = (op.titulo || '').toLowerCase().includes(termoBusca);
      const empresaMatch = (op.empresa_nome || '').toLowerCase().includes(termoBusca);
      const contatoMatch = (op.contato_nome || '').toLowerCase().includes(termoBusca);
      return tituloMatch || empresaMatch || contatoMatch;
    });

    const opsEnriquecidas = opsFiltradasBusca.map(op => {
      const emp = empresas.find(e => e.id === op.empresa_id) || {};
      return {
        ...op,
        classificacao: emp.classificacao || 'nao_assessorada',
        estrelas: emp.estrelas !== undefined ? emp.estrelas : 0 
      };
    });

    opsEnriquecidas.sort((a, b) => {
      if (b.estrelas !== a.estrelas) return b.estrelas - a.estrelas;
      
      const pesos = { assessorada: 3, lead_quente: 2, nao_assessorada: 1 };
      const pesoA = pesos[a.classificacao] || 1;
      const pesoB = pesos[b.classificacao] || 1;
      if (pesoA !== pesoB) return pesoB - pesoA;
      
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    opsEnriquecidas.forEach(op => {
      if (!mapa[op.etapa_id]) mapa[op.etapa_id] = [];
      mapa[op.etapa_id].push(op);
    });
    return mapa;
  }, [etapas, oportunidades, buscaGeral, empresas]);

  const empresasFiltradasParaSelect = useMemo(() => {
    const busca = buscaEmpresaNoModal.toLowerCase();
    return empresas.filter(e => e.nome.toLowerCase().includes(busca));
  }, [empresas, buscaEmpresaNoModal]);

  const contatosFiltradosParaSelect = useMemo(() => {
    const busca = buscaContatoNoModal.toLowerCase();
    const base = empresaId ? contatos.filter(c => c.empresa_id === parseInt(empresaId)) : contatos;
    return base.filter(c => c.nome.toLowerCase().includes(busca));
  }, [contatos, empresaId, buscaContatoNoModal]);

  const { subtotalModulos, valorFinalCalculado } = useMemo(() => {
    const sub = modulosSelecionados.reduce((acc, idMod) => {
      const m = modulosCampanha.find(mod => mod.id === Number(idMod));
      return acc + (m ? Number(m.valor || 0) : 0);
    }, 0);
    
    // Calcula primeiro a porcentagem e depois subtrai o desconto em reais
    let final = sub * (1 - (Number(desconto) / 100)) - Number(descontoReais);
    if (final < 0) final = 0; // Trava de segurança para não ficar negativo
    
    return { subtotalModulos: sub, valorFinalCalculado: final };
  }, [modulosSelecionados, modulosCampanha, desconto, descontoReais]);

  const campanhaSelecionadaObj = useMemo(() => {
    return campanhas.find(c => c.id === parseInt(filtroCampanha));
  }, [campanhas, filtroCampanha]);

  const renderStarsLocal = (rating, readonly = true) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fa-solid fa-star ${i <= rating ? 'active' : ''}`}
          onClick={!readonly ? () => setEmpresaEstrelas(rating === i ? 0 : i) : undefined}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        ></i>
      );
    }
    return <StarsContainer $readonly={readonly}>{stars}</StarsContainer>;
  };

  async function carregarNotas(opId) {
    try { 
      const res = await axios.get(`${API_URL}/oportunidades/${opId}/notas`, getHeaders()); 
      setNotas(res.data); 
    } catch (e) { console.error('Erro ao buscar notas', e); }
  }

  async function adicionarNota() {
    if (!novaNota.trim() || !editandoId) return;
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

  function abrirDetalheContato() {
    if (!contatoId) return;
    const contato = contatos.find(c => c.id === parseInt(contatoId));
    if (!contato) return;

    setContatoSelecionado(contato);
    setContatoNome(contato.nome);
    setContatoCargo(contato.cargo || '');
    
    const emails = parseJSONSeguro(contato.emails_json, []);
    setContatoEmails(emails.join(', '));

    const tels = parseJSONSeguro(contato.telefones_json, []);
    setContatoTelefones(tels.join(', '));

    setEditandoContatoRapido(false);
    setMostrarModalContato(true);
  }

  async function salvarContatoRapido(e) {
    e.preventDefault();
    const emailsArr = contatoEmails.split(',').map(m => m.trim()).filter(m => m);
    const telsArr = contatoTelefones.split(',').map(t => t.trim()).filter(t => t);
    
    try {
      await axios.put(`${API_URL}/contatos/${contatoSelecionado.id}`, {
        nome: contatoNome, cargo: contatoCargo, emails_json: emailsArr, telefones_json: telsArr, empresa_id: empresaId || contatoSelecionado.empresa_id 
      }, getHeaders());
      
      setMostrarModalContato(false);
      const resC = await axios.get(`${API_URL}/contatos`, getHeaders());
      setContatos(resC.data);
      setBuscaContatoNoModal(contatoNome); 
      alert('Contato atualizado com sucesso!');
    } catch(error) {
      alert(error.response?.data?.erro || 'Erro ao atualizar contato.');
    }
  }

  function abrirDetalheEmpresa() {
    if (!empresaId) return;
    const emp = empresas.find(e => e.id === parseInt(empresaId));
    if (!emp) return;

    setEmpresaSelecionada(emp);
    setEmpresaNome(emp.nome || '');
    setEmpresaEstado(emp.estado || '');
    setEmpresaCidade(emp.cidade || '');
    setEmpresaTelefones(emp.telefones || '');
    setEmpresaClassificacao(emp.classificacao || 'nao_assessorada');
    setEmpresaEstrelas(emp.estrelas !== undefined ? emp.estrelas : 0);

    setEditandoEmpresaRapida(false);
    setMostrarModalEmpresa(true);
  }

  async function salvarEmpresaRapido(e) {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/empresas/${empresaSelecionada.id}`, {
        nome: empresaNome, estado: empresaEstado, cidade: empresaCidade,
        telefones: empresaTelefones, classificacao: empresaClassificacao, estrelas: empresaEstrelas
      }, getHeaders());

      setMostrarModalEmpresa(false);
      const resE = await axios.get(`${API_URL}/empresas`, getHeaders());
      setEmpresas(resE.data);
      setBuscaEmpresaNoModal(empresaNome);
      alert('Empresa atualizada com sucesso!');
    } catch(error) {
      alert(error.response?.data?.erro || 'Erro ao atualizar empresa.');
    }
  }

  function toggleModulo(id) {
    const numId = Number(id);
    setModulosSelecionados(prev => {
      const arrNumeric = prev.map(Number);
      return arrNumeric.includes(numId) ? arrNumeric.filter(m => m !== numId) : [...arrNumeric, numId];
    });
  }

  function abrirModalNovo() {
    if (!filtroCampanha) return alert("Selecione uma campanha no topo da tela antes de criar uma negociação!");
    
    setEditandoId(null); setTitulo(''); setEmpresaId(''); setContatoId(''); setObservacoes('');
    setStatusOp('aberto'); setEtapaId(etapas.length > 0 ? etapas[0].id : '');
    setVendedorId(meuUsuarioId || ''); setVendedorOriginal(meuUsuarioId || ''); 
    setDesconto(0); setDescontoReais(0);
    
    if (modulosCampanha.length > 0) {
      const todosIds = modulosCampanha.map(m => Number(m.id));
      setModulosSelecionados(todosIds); setValor(''); 
    } else {
      setModulosSelecionados([]); setValor(990.00); 
    }

    setBuscaEmpresaNoModal(''); setBuscaContatoNoModal(''); setNotas([]); setNovaNota(''); cancelarEdicaoNota();
    setMostrarModal(true);
  }

  function abrirModalEdicao(op) {
    setEditandoId(op.id); setTitulo(op.titulo); setValor(op.valor);
    setEmpresaId(op.empresa_id || ''); setContatoId(op.contato_id || '');
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto'); setVendedorId(op.vendedor_id || '');
    setVendedorOriginal(op.vendedor_id || ''); 
    setDesconto(op.desconto || 0);

    // Lógica para resgatar os módulos e descobrir o desconto em Reais
    const mods = parseJSONSeguro(op.modulos_ids, []).map(Number);
    const sub = mods.reduce((acc, idMod) => {
      const m = modulosCampanha.find(m => Number(m.id) === idMod);
      return acc + (m ? Number(m.valor || 0) : 0);
    }, 0);
    
    const descPerc = Number(op.desconto || 0);
    const valorComDescontoPerc = sub * (1 - (descPerc / 100));
    const diff = valorComDescontoPerc - Number(op.valor || 0);
    
    setDescontoReais(diff > 0.01 ? diff.toFixed(2) : 0);
    setModulosSelecionados(mods);

    setBuscaEmpresaNoModal(op.empresa_nome || ''); setBuscaContatoNoModal(op.contato_nome || '');
    setNotas([]); cancelarEdicaoNota(); carregarNotas(op.id);
    setMostrarModal(true);
  }

  async function salvarOportunidade(e) {
    e.preventDefault();
    const valorEnviar = modulosSelecionados.length > 0 
      ? valorFinalCalculado 
      : (valor ? parseFloat(valor.toString().replace(/\./g, '').replace(',', '.')) : 0);

    const dados = {
      titulo, valor: valorEnviar, empresa_id: empresaId || null, contato_id: contatoId || null,
      etapa_id: etapaId, observacoes, campanha_id: filtroCampanha, status: statusOp,
      vendedor_id: vendedorId || null, modulos_ids: modulosSelecionados.map(Number), 
      desconto: modulosSelecionados.length > 0 ? Number(desconto) : 0
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/oportunidades/${editandoId}`, dados, getHeaders());
        if (String(vendedorId) !== String(vendedorOriginal)) {
          const nomeNovo = equipe.find(u => String(u.id) === String(vendedorId))?.nome || 'Sem dono';
          const nomeVelho = equipe.find(u => String(u.id) === String(vendedorOriginal))?.nome || 'Sem dono';
          await axios.post(`${API_URL}/oportunidades/${editandoId}/notas`, { 
            nota: `🔄 Transferência de Responsável: A negociação foi alterada de "${nomeVelho}" para "${nomeNovo}".` 
          }, getHeaders());
        }
      } else {
        await axios.post(`${API_URL}/oportunidades`, dados, getHeaders());
      }
      setMostrarModal(false); 
      carregarFunilDaCampanha(filtroCampanha);
    } catch (erro) { 
      alert('Erro ao salvar oportunidade.'); 
    }
  }

  async function deletarOportunidade() {
    if (!window.confirm('Excluir este negócio? O histórico de notas também será apagado.')) return;
    try { 
      await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders()); 
      setMostrarModal(false); carregarFunilDaCampanha(filtroCampanha); 
    } catch (error) { alert("Falha ao excluir o negócio."); }
  }

  const formatarMoeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarTelefoneParaLink = (t) => t ? t.replace(/[^0-9]/g, '') : '';

  return (
    <PageContainer>
      <TopSection>
        <div>
          <Title>Gestão de Pipeline</Title>
          
        </div>

        <ActionsContainer>
          <SearchInputWrapper>
            <i className="fa-solid fa-search"></i>
            <input 
              type="text" 
              placeholder="Buscar cliente, prefeitura..." 
              value={buscaGeral} 
              onChange={e => setBuscaGeral(e.target.value)} 
            />
          </SearchInputWrapper>

          <FilterPillWrapper ref={dropdownCampanhaRef}>
            <FilterButton 
              $hasValue={!!filtroCampanha} 
              onClick={() => setDropdownCampanhaAberto(!dropdownCampanhaAberto)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-layer-group icon"></i> 
                <span>Funil: <strong>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  {campanhaSelecionadaObj ? (
                    <>
                      {campanhaSelecionadaObj.nome.split(' ').slice(0,2).join(' ')+' ...'}
                      {campanhaSelecionadaObj.apenas_admin && <span style={{marginLeft: '8px', color: '#dc3545', fontSize: '0.8rem'}}><i className="fa-solid fa-lock"></i> </span>}
                    </>
                  ) : '-- Selecione --'}
                  </div>
                </strong></span>
              </div>
              <i className="fa-solid fa-chevron-down arrow" style={{ transform: dropdownCampanhaAberto ? 'rotate(180deg)' : 'rotate(0)' }}></i>
            </FilterButton>
            
            {dropdownCampanhaAberto && (
              <CustomDropdownMenu>
                {campanhas.map(c => (
                  <CustomDropdownItem 
                    key={c.id} 
                    $active={filtroCampanha === String(c.id)} 
                    onClick={() => { setFiltroCampanha(String(c.id)); setDropdownCampanhaAberto(false); }}
                  >
                    {c.nome} 
                    {c.apenas_admin && <span style={{marginLeft: '8px', color: '#dc3545', fontSize: '0.75rem', fontWeight: 'bold'}}><i className="fa-solid fa-lock"></i> </span>}
                    {c.arquivada && <span style={{marginLeft: '8px', color: '#6c757d', fontSize: '0.75rem'}}>(Arquivada)</span>}
                  </CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>

          {filtroCampanha && (
            <PrimaryButton onClick={abrirModalNovo} className="btn-novo">
              <i className="fa-solid fa-plus-circle"></i> Nova Oportunidade
            </PrimaryButton>
          )}
        </ActionsContainer>
      </TopSection>

      {!filtroCampanha ? (
        <EmptyState>
          <i className="fa-solid fa-filter-circle-xmark"></i>
          <h2>Nenhum Funil Selecionado</h2>
          <p>Selecione uma campanha no topo da tela para carregar as etapas e negócios.</p>
        </EmptyState>
      ) : carregando ? (
        <LoadingContainer>
          <i className="fa-solid fa-spinner fa-spin"></i><br />Carregando seu Funil...
        </LoadingContainer>
      ) : (
        <KanbanBoard ref={boardRef} onMouseDown={onBoardMouseDown} onMouseLeave={onBoardMouseLeave} onMouseUp={onBoardMouseUp} onMouseMove={onBoardMouseMove}>
          {etapas.map((etapa) => {
            const cardsDestaColuna = oportunidadesPorEtapa[etapa.id] || [];
            
            return (
              <KanbanColumn key={etapa.id}>
                <ColumnHeader>
                  <span className="title">{etapa.nome}</span>
                  <span className="badge">{cardsDestaColuna.length}</span>
                </ColumnHeader>
                
                <CardsContainer>
                  {cardsDestaColuna.length === 0 && buscaGeral && (
                     <div style={{textAlign: 'center', color: '#a0aec0', fontSize: '0.85rem', marginTop: '20px'}}>Nenhum resultado</div>
                  )}
                  {cardsDestaColuna.map(op => {
                    let statusConfig = { border: '#cbd5e1', bg: '#ffffff' };
                    if (op.status === 'naofunciona') statusConfig = { border: '#f1c40f', bg: '#fff9db' };
                    if (op.status === 'naoatendeu') statusConfig = { border: '#e67e22', bg: '#fff4e6' };
                    if (op.status === 'tarefa') statusConfig = { border: '#6f42c1', bg: '#f3e8ff' };
                    if (op.status === 'ganho' ) statusConfig = { border: '#0e3115', bg: '#e7f3ff' };
                    if (op.status === 'interessada') statusConfig = { border: '#36ad52', bg: '#e7f3ff' };
                    if (op.status === 'avaliar') statusConfig = { border: '#9fe069', bg: '#e9f7ef' };
                    if (op.status === 'perdido') statusConfig = { border: '#dc3545', bg: '#fdecea' };
                    
                    const idsModsCard = parseJSONSeguro(op.modulos_ids, []).map(Number);
                    const nomesModsCard = idsModsCard.map(id => { 
                      const m = modulosCampanha.find(mod => Number(mod.id) === id); 
                      return m ? m.nome : null; 
                    }).filter(Boolean);

                    return (
                      <KanbanCard key={op.id} className="kanban-card" $status={statusConfig} onClick={() => abrirModalEdicao(op)}>
                        
                        <div className="card-header">
                          <div className="card-title">{op.titulo}</div>
                          {op.estrelas > 0 && (
                            <div className="stars" title={`Temperatura: ${op.estrelas} Estrelas`}>
                              {[1,2,3,4,5].map(n => <i key={n} className={`fa-solid fa-star ${n <= op.estrelas ? 'active' : ''}`}></i>)}
                            </div>
                          )}
                        </div>

                        <div className="card-value">{formatarMoeda(op.valor)}</div>

                        {nomesModsCard.length > 0 && (
                          <CardModules>
                            {nomesModsCard.map((nome, idx) => (
                              <span key={idx}><i className="fa-solid fa-calendar-check"></i> {nome}</span>
                            ))}
                          </CardModules>
                        )}

                        {op.empresa_nome && (
                          <div className="card-company">
                            <i className="fa-solid fa-building"></i> {op.empresa_nome}
                            {op.classificacao === 'assessorada' && <span className="badge-vip" title="Prefeitura Assessorada VIP"><i className="fa-solid fa-crown"></i> VIP</span>}
                            {op.classificacao === 'lead_quente' && <span className="badge-hot" title="Lead Quente e Engajado"><i className="fa-solid fa-fire"></i> Hot</span>}
                            {(op.classificacao === 'nao_assessorada' || !op.classificacao) && <span className="badge-cold" title="Lead Frio"><i className="fa-solid fa-snowflake text-blue"></i> Frio</span>}
                          </div>
                        )}
                        
                        <SellerBadge>
                          <i className="fa-solid fa-user-tie"></i> {op.vendedor_nome || 'Sem dono'}
                        </SellerBadge>

                        {tarefasPorOp[op.id]?.total > 0 && (
                          <TaskBadge $urgente={tarefasPorOp[op.id].urgente > 0}>
                            <i className="fa-solid fa-list-check"></i>
                            {tarefasPorOp[op.id].urgente > 0
                              ? `${tarefasPorOp[op.id].urgente} tarefa(s) urgente(s)`
                              : `${tarefasPorOp[op.id].total} tarefa(s)`}
                          </TaskBadge>
                        )}
                      </KanbanCard>
                    );
                  })}
                </CardsContainer>
              </KanbanColumn>
            )
          })}
        </KanbanBoard>
      )}

      {/* MODAL DE EDIÇÃO DE OPORTUNIDADE E SUB-MODAIS */}
      {mostrarModal && (
        <ModalOverlay onClick={() => setMostrarModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                <div className="subtitle" title={campanhaSelecionadaObj?.nome}>
                  <i className="fa-solid fa-bullhorn"></i> Vinculado à campanha: {campanhaSelecionadaObj?.nome}
                </div>
              </div>
              <CloseButton onClick={() => setMostrarModal(false)}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={salvarOportunidade} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <FormGrid $columns="1fr 1fr">
                <FormGroup className="span-2">
                  <label>Título da Negociação *</label>
                  <Input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                </FormGroup>

                <FormGroup>
                  <label>Etapa no Funil *</label>
                  <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required className="highlight">
                    {etapas.map(etp => <option key={etp.id} value={etp.id}>{etp.nome}</option>)}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <label>Status da Negociação</label>
                  <Select value={statusOp} onChange={(e) => setStatusOp(e.target.value)} $status={statusOp}>
                    <option value="aberto">⚪ Em Aberto</option>
                    <option value="avaliar">🟢 Avaliar</option>
                    <option value="interessada">🟢 Interessada</option>
                    <option value="ganho">🏆 Vendido </option>
                    <option value="tarefa">🟣 Tarefa</option>
                    <option value="naoatendeu">🟠 Não Atendeu</option>
                    <option value="naofunciona">🟡 Não Funciona</option>
                    <option value="perdido">🔴 Perdido</option>
                  </Select>
                </FormGroup>
              </FormGrid>

              <SectionCard>
                <FormGrid $columns="1fr 1fr">
                  <FormGroup>
                    <label><i className="fa-solid fa-building text-blue"></i> Empresa/Prefeitura Alvo</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <AutocompleteContainer ref={dropdownEmpresaRef} style={{ flex: 1 }}>
                        <Input 
                          type="text" 
                          placeholder="🔍 Buscar..." 
                          value={buscaEmpresaNoModal} 
                          onFocus={() => { setBuscaEmpresaNoModal(''); setMostrarDropdownEmpresa(true); }} 
                          onChange={(e) => {
                            setBuscaEmpresaNoModal(e.target.value); setMostrarDropdownEmpresa(true);
                            if (e.target.value === '') { setEmpresaId(''); setContatoId(''); setBuscaContatoNoModal(''); }
                          }} 
                        />
                        {mostrarDropdownEmpresa && (
                          <AutocompleteList>
                            <AutocompleteOption className="danger" onClick={() => { setEmpresaId(''); setBuscaEmpresaNoModal(''); setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownEmpresa(false); }}>
                              <i className="fa-solid fa-eraser"></i> Limpar Seleção
                            </AutocompleteOption>
                            {empresasFiltradasParaSelect.map(emp => (
                              <AutocompleteOption key={emp.id} onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoModal(emp.nome); setMostrarDropdownEmpresa(false); }}>
                                {emp.nome}
                              </AutocompleteOption>
                            ))}
                          </AutocompleteList>
                        )}
                      </AutocompleteContainer>

                      {empresaId && (
                        <IconButton type="button" onClick={abrirDetalheEmpresa} title="Visualizar ou Editar Empresa">
                          <i className="fa-solid fa-building-user"></i>
                        </IconButton>
                      )}
                    </div>
                  </FormGroup>

                  <FormGroup>
                    <label><i className="fa-solid fa-address-book text-green"></i> Contato Principal</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <AutocompleteContainer ref={dropdownContatoRef} style={{ flex: 1 }}>
                        <Input 
                          type="text" 
                          placeholder={empresaId ? "🔍 Buscar contato desta empresa..." : "🔍 Buscar contato..."} 
                          value={buscaContatoNoModal} 
                          onFocus={() => { setBuscaContatoNoModal(''); setMostrarDropdownContato(true); }} 
                          onChange={(e) => { setBuscaContatoNoModal(e.target.value); setMostrarDropdownContato(true); }} 
                        />
                        {mostrarDropdownContato && (
                          <AutocompleteList>
                            <AutocompleteOption className="danger" onClick={() => { setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownContato(false); }}>
                              <i className="fa-solid fa-eraser"></i> Limpar Seleção
                            </AutocompleteOption>
                            {contatosFiltradosParaSelect.length > 0 ? (
                              contatosFiltradosParaSelect.map(cont => (
                                <AutocompleteOption key={cont.id} onClick={() => { setContatoId(cont.id); setBuscaContatoNoModal(cont.nome); setMostrarDropdownContato(false); }}>
                                  <strong>{cont.nome}</strong>
                                </AutocompleteOption>
                              ))
                            ) : (
                              <AutocompleteOption className="no-results">Nenhum contato encontrado.</AutocompleteOption>
                            )}
                          </AutocompleteList>
                        )}
                      </AutocompleteContainer>
                      
                      {contatoId && (
                        <IconButton type="button" onClick={abrirDetalheContato} title="Visualizar ou Editar Contato">
                          <i className="fa-solid fa-user-pen"></i>
                        </IconButton>
                      )}
                    </div>
                  </FormGroup>
                </FormGrid>
              </SectionCard>

              <SectionCard $bgColor="#f4fbf5" $borderColor="#c3e6cb">
                <label style={{ display: 'block', marginBottom: '15px', color: '#28a745', fontSize: '0.95rem', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-cart-shopping"></i> Composição do Pacote (Turmas / Módulos)
                </label>

                {modulosCampanha.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Este curso não possui módulos. O valor deverá ser inserido manualmente abaixo.</div>
                ) : (
                  <ModulesGrid>
                    {modulosCampanha.map(mod => {
                      const isSelected = modulosSelecionados.includes(Number(mod.id));
                      return (
                        <ModuleCard key={mod.id} $active={isSelected} onClick={() => toggleModulo(mod.id)}>
                          <div className={`custom-checkbox ${isSelected ? 'active' : ''}`}>
                             {isSelected && <i className="fa-solid fa-check"></i>}
                          </div>
                          <div className="mod-info">
                            <span className="mod-name">{mod.nome}</span>
                            <span className="mod-price">{formatarMoeda(mod.valor)}</span>
                          </div>
                        </ModuleCard>
                      )
                    })}
                  </ModulesGrid>
                )}

                {modulosSelecionados.length > 0 && (
                  <TotalsBox>
                    <div>
                      <label>Subtotal</label>
                      <div className="val bg-gray">{formatarMoeda(subtotalModulos)}</div>
                    </div>
                    <div>
                      <label className="text-blue">Desconto (%)</label>
                      <Input type="number" min="0" max="100" value={desconto} onChange={e => setDesconto(e.target.value)} className="highlight-blue" style={{width: '90px'}} />
                    </div>
                    <div>
                      <label style={{color: '#fd7e14'}}>Desconto (R$)</label>
                      <Input type="number" min="0" step="0.01" value={descontoReais} onChange={e => setDescontoReais(e.target.value)} style={{width: '110px', backgroundColor: '#fff4e6', borderColor: '#fd7e14'}} />
                    </div>
                    <div>
                      <label className="text-green">Valor a Cobrar</label>
                      <div className="val bg-green">{formatarMoeda(valorFinalCalculado)}</div>
                    </div>
                  </TotalsBox>
                )}

                <FormGroup style={{marginTop: '15px'}}>
                  <label>Valor Final da Negociação (R$)</label>
                  <Input
                    type="number" step="0.01"
                    value={modulosSelecionados.length > 0 ? valorFinalCalculado : valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={modulosSelecionados.length > 0}
                    placeholder={modulosSelecionados.length > 0 ? "Calculado pelos módulos" : "Digite o valor..."}
                    className={modulosSelecionados.length > 0 ? 'disabled' : ''}
                  />
                </FormGroup>
              </SectionCard>

              <FormGrid $columns="1fr">
                <FormGroup>
                  <label><i className="fa-solid fa-user-tie text-purple"></i> Vendedor Responsável</label>
                  <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                    <option value="">-- Sem dono definido --</option>
                    {equipe
                      .filter(user => user.ativo !== false || String(user.id) === String(vendedorOriginal))
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.nome} {user.ativo === false ? '(Inativo)' : `(${user.perfil})`}
                        </option>
                      ))
                    }
                  </Select>
                </FormGroup>

                <FormGroup>
                  <label>Resumo Geral do Negócio</label>
                  <TextArea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows="2" />
                </FormGroup>

                <SectionCard>
                  <label style={{ display: 'block', marginBottom: '15px', color: '#333', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-comments text-blue"></i> Histórico de Interações (Notas)
                  </label>

                  <NotesFeed>
                    {notas.length === 0 ? (
                      <div className="empty-notes">Nenhuma nota registrada nesta negociação.</div>
                    ) : (
                      notas.map(n => (
                        <NoteItem key={n.id}>
                          {editandoNotaId === n.id ? (
                            <>
                              <TextArea value={textoNotaEditada} onChange={e => setTextoNotaEditada(e.target.value)} rows="2" className="highlight-blue" />
                              <div className="note-actions">
                                <button type="button" className="btn-cancel" onClick={cancelarEdicaoNota}>Cancelar</button>
                                <button type="button" className="btn-save" onClick={() => salvarNotaEditada(n.id)}>Salvar</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <NoteHeader>
                                <strong className="user"><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong>
                                <div className="meta">
                                  <span>{new Date(n.criado_em).toLocaleString('pt-BR')}</span>
                                  <button type="button" className="btn-edit" onClick={() => iniciarEdicaoNota(n)}><i className="fa-solid fa-pen"></i></button>
                                </div>
                              </NoteHeader>
                              <NoteBody>{n.nota}</NoteBody>
                            </>
                          )}
                        </NoteItem>
                      ))
                    )}
                  </NotesFeed>

                  {editandoId && (
                    <AddNoteBox>
                      <Input type="text" value={novaNota} onChange={e => setNovaNota(e.target.value)} placeholder="Escreva o que conversou hoje..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarNota(); } }} />
                      <button type="button" onClick={adicionarNota} className="btn-send"><i className="fa-solid fa-paper-plane"></i></button>
                    </AddNoteBox>
                  )}
                </SectionCard>

                {editandoId && (
                  <SectionCard $bgColor="#faf5ff" $borderColor="#d6bcfa">
                    <TarefasOportunidade
                      oportunidadeId={editandoId}
                      oportunidadeTitulo={titulo}
                    />
                  </SectionCard>
                )}
              </FormGrid>

              <ModalFooter>
                {editandoId ? <DangerButton type="button" onClick={deletarOportunidade}><i className="fa-solid fa-trash-can"></i> Excluir</DangerButton> : <div></div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <SecondaryButton type="button" onClick={() => setMostrarModal(false)}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Negócio</PrimaryButton>
                </div>
              </ModalFooter>

            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* SUB-MODAL DE CONTATO RÁPIDO */}
      {mostrarModalContato && contatoSelecionado && (
        <ModalOverlay onClick={() => setMostrarModalContato(false)} style={{zIndex: 9999}}>
          <ModalContent $small onClick={e => e.stopPropagation()}>
            <ModalHeader $bg="#1F4E79" $color="#fff">
              <div>
                <h3 style={{color: '#fff'}}><i className="fa-solid fa-user-pen"></i> Detalhes do Contato</h3>
              </div>
              <CloseButton $color="#fff" onClick={() => setMostrarModalContato(false)}>&times;</CloseButton>
            </ModalHeader>

            <div style={{ padding: '20px' }}>
              {!editandoContatoRapido ? (
                <>
                  <FormGrid $columns="1fr 1fr" style={{marginBottom: '20px'}}>
                    <InfoBox>
                      <label>NOME COMPLETO</label>
                      <div>{contatoNome}</div>
                    </InfoBox>
                    <InfoBox>
                      <label>CARGO</label>
                      <div>{contatoCargo || '-'}</div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label><i className="fa-regular fa-envelope"></i> E-MAILS (Lista de Disparo)</label>
                      <div className="text-blue">{contatoEmails || '-'}</div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label><i className="fa-solid fa-phone"></i> TELEFONES (WhatsApp)</label>
                      <div className="phones">
                        {contatoTelefones ? contatoTelefones.split(',').map((tel, idx) => (
                          <a key={idx} href={`tel:${formatarTelefoneParaLink(tel)}`} title="Clique para ligar" className="phone-pill">
                            <i className="fa-solid fa-phone text-green"></i> {tel.trim()}
                          </a>
                        )) : '-'}
                      </div>
                    </InfoBox>
                  </FormGrid>
                  <ModalFooter $justify="flex-end">
                    <SecondaryButton onClick={() => setMostrarModalContato(false)}>Voltar</SecondaryButton>
                    <WarningButton onClick={() => setEditandoContatoRapido(true)}>
                      <i className="fa-solid fa-pen"></i> Editar Contato
                    </WarningButton>
                  </ModalFooter>
                </>
              ) : (
                <form onSubmit={salvarContatoRapido}>
                  <FormGrid $columns="1fr" style={{marginBottom: '20px'}}>
                    <FormGroup>
                      <label>Nome *</label>
                      <Input type="text" required value={contatoNome} onChange={e => setContatoNome(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                      <label>Cargo</label>
                      <Input type="text" value={contatoCargo} onChange={e => setContatoCargo(e.target.value)} placeholder="Ex: Secretário da Fazenda" />
                    </FormGroup>
                    <FormGroup>
                      <label><i className="fa-regular fa-envelope"></i> E-mails (Separe por vírgula)</label>
                      <Input type="text" value={contatoEmails} onChange={e => setContatoEmails(e.target.value)} placeholder="email1@teste.com, email2@teste.com" className="highlight-blue" />
                    </FormGroup>
                    <FormGroup>
                      <label><i className="fa-solid fa-phone"></i> Telefones (Separe por vírgula)</label>
                      <Input type="text" value={contatoTelefones} onChange={e => setContatoTelefones(e.target.value)} placeholder="51999999999, 5133333333" className="highlight-green" />
                    </FormGroup>
                  </FormGrid>

                  <ModalFooter $justify="flex-end">
                    <SecondaryButton type="button" onClick={() => setEditandoContatoRapido(false)}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Alterações</PrimaryButton>
                  </ModalFooter>
                </form>
              )}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* SUB-MODAL DE EMPRESA RÁPIDO */}
      {mostrarModalEmpresa && empresaSelecionada && (
        <ModalOverlay onClick={() => setMostrarModalEmpresa(false)} style={{zIndex: 9999}}>
          <ModalContent $small onClick={e => e.stopPropagation()}>
            <ModalHeader $bg="#1F4E79" $color="#fff">
              <div>
                <h3 style={{color: '#fff'}}><i className="fa-solid fa-building-user"></i> Detalhes da Empresa</h3>
              </div>
              <CloseButton $color="#fff" onClick={() => setMostrarModalEmpresa(false)}>&times;</CloseButton>
            </ModalHeader>

            <div style={{ padding: '20px' }}>
              {!editandoEmpresaRapida ? (
                <>
                  <FormGrid $columns="1fr 1fr" style={{marginBottom: '20px'}}>
                    <InfoBox className="span-2">
                      <label>NOME DA EMPRESA / PREFEITURA</label>
                      <div>{empresaNome}</div>
                    </InfoBox>
                    <InfoBox>
                      <label>ESTADO (UF)</label>
                      <div>{empresaEstado || '-'}</div>
                    </InfoBox>
                    <InfoBox>
                      <label>CIDADE</label>
                      <div>{empresaCidade || '-'}</div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label><i className="fa-solid fa-phone"></i> TELEFONES GERAIS</label>
                      <div className="phones">
                        {empresaTelefones ? empresaTelefones.split(',').map((tel, idx) => (
                          <a key={idx} href={`tel:${formatarTelefoneParaLink(tel)}`} className="phone-pill">
                            <i className="fa-solid fa-phone text-green"></i> {tel.trim()}
                          </a>
                        )) : '-'}
                      </div>
                    </InfoBox>
                    <InfoBox>
                      <label><i className="fa-solid fa-fire"></i> CLASSIFICAÇÃO</label>
                      <div style={{marginTop: '5px'}}>
                        {empresaClassificacao === 'assessorada' ? <span style={{color: '#856404', fontWeight: 'bold'}}>👑 VIP (Assessorada)</span> : 
                         empresaClassificacao === 'lead_quente' ? <span style={{color: '#dc3545', fontWeight: 'bold'}}>🔥 Lead Quente</span> : 
                         <span style={{color: '#475569', fontWeight: 'bold'}}>❄️ Frio Padrão</span>}
                      </div>
                    </InfoBox>
                    <InfoBox>
                      <label><i className="fa-solid fa-star"></i> TEMPERATURA</label>
                      <div style={{marginTop: '5px'}}>
                        {renderStarsLocal(empresaEstrelas, true)}
                      </div>
                    </InfoBox>
                  </FormGrid>
                  <ModalFooter $justify="flex-end">
                    <SecondaryButton onClick={() => setMostrarModalEmpresa(false)}>Voltar</SecondaryButton>
                    <WarningButton onClick={() => setEditandoEmpresaRapida(true)}>
                      <i className="fa-solid fa-pen"></i> Editar Empresa
                    </WarningButton>
                  </ModalFooter>
                </>
              ) : (
                <form onSubmit={salvarEmpresaRapido}>
                  <FormGrid $columns="1fr 1fr" style={{marginBottom: '20px'}}>
                    <FormGroup className="span-2">
                      <label>Nome da Empresa *</label>
                      <Input type="text" required value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                      <label>Estado (UF)</label>
                      <Input type="text" value={empresaEstado} onChange={e => setEmpresaEstado(e.target.value.toUpperCase())} maxLength="2" style={{textTransform: 'uppercase'}} />
                    </FormGroup>
                    <FormGroup>
                      <label>Cidade</label>
                      <Input type="text" value={empresaCidade} onChange={e => setCidade(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-phone text-green"></i> Telefones</label>
                      <Input type="text" value={empresaTelefones} onChange={e => setEmpresaTelefones(e.target.value)} />
                    </FormGroup>

                    {/* LEAD SCORING DENTRO DO QUICK EDIT */}
                    <div className="span-2" style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px'}}>
                      <label style={{ display: 'block', marginBottom: '15px', color: '#1F4E79', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-fire"></i> Qualificação e Temperatura
                      </label>
                      <FormGrid $columns="1fr 1fr">
                        <FormGroup>
                          <label>Classificação no Funil</label>
                          <Select 
                            value={empresaClassificacao} 
                            onChange={e => setEmpresaClassificacao(e.target.value)} 
                            $status={empresaClassificacao}
                          >
                            <option value="nao_assessorada">❄️ Frio (Padrão)</option>
                            <option value="lead_quente">🔥 Quente</option>
                            <option value="assessorada">👑 VIP (Assessorada)</option>
                          </Select>
                        </FormGroup>
                        <FormGroup>
                          <label>Temperatura (Avaliação)</label>
                          {renderStarsLocal(empresaEstrelas, false)}
                        </FormGroup>
                      </FormGrid>
                    </div>

                  </FormGrid>

                  <ModalFooter $justify="flex-end">
                    <SecondaryButton type="button" onClick={() => setEditandoEmpresaRapida(false)}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Alterações</PrimaryButton>
                  </ModalFooter>
                </form>
              )}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

    </PageContainer>
  );
}

// ==========================================
// STYLED COMPONENTS (Design Premium)
// ==========================================

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
  @media (max-width: 768px) { padding: 15px; }
`;

const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; .btn-novo { width: 100%; justify-content: center; } }
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

const ActionsContainer = styled.div`
  display: flex; align-items: center; gap: 15px; flex-wrap: wrap;
  @media (max-width: 768px) { width: 100%; }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  @media (max-width: 768px) { width: 100%; }
  i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #a0aec0; }
  input {
    padding: 10px 15px 10px 38px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; width: 280px; transition: 0.2s; box-sizing: border-box;
    &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
    @media (max-width: 768px) { width: 100%; }
  }
`;

/* === ÁREA DE FILTROS MODERNIZADA === */
const FilterPillWrapper = styled.div`
  position: relative; display: inline-block; max-width: 380px;
  @media (max-width: 768px) { width: 100%; }
`;

const FilterButton = styled.button`
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: ${props => props.$hasValue ? '#f0f7ff' : '#ffffff'};
  border: 1px solid ${props => props.$hasValue ? '#007bff' : '#e2e8f0'};
  color: #334155; padding: 10px 20px; border-radius: 10px; max-width: 380px; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease-in-out; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  @media (max-width: 768px) { width: 100%; }

  &:hover { 
    background: #f8fafc; border-color: #007bff; box-shadow: 0 4px 12px rgba(0,123,255,0.1); transform: translateY(-1px);
  }

  span { display: flex; align-items: center; gap: 6px; color: #64748b; margin: 0;
    strong { color: ${props => props.$hasValue ? '#007bff' : '#0f172a'}; font-weight: 700;} 
  }
  .icon { color: ${props => props.$hasValue ? '#007bff' : '#94a3b8'}; font-size: 1.1rem; }
  .arrow { color: #94a3b8; font-size: 0.8rem; transition: transform 0.3s ease; }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 10px); right: 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15); min-width: 260px; max-height: 300px; overflow-y: auto; z-index: 1000; padding: 10px; list-style: none; margin: 0; animation: fadeInDown 0.2s ease-out forwards;
  @media (max-width: 768px) { width: 100%; left: 0; }
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
const CustomDropdownItem = styled.li`
  padding: 12px 16px; font-size: 0.95rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; margin-bottom: 2px;
  color: ${props => props.$active ? '#007bff' : '#475569'}; 
  background: ${props => props.$active ? '#f0f7ff' : 'transparent'}; 
  font-weight: ${props => props.$active ? '700' : '500'}; 

  &:hover { background: #f8fafc; color: #0f172a; transform: translateX(4px); }
`;

// --- STATUS E ESTADOS VAZIOS ---
const EmptyState = styled.div`
  text-align: center; padding: 80px 20px; background: #ffffff; border-radius: 12px; border: 2px dashed #cbd5e1; margin-top: 20px;
  i { font-size: 3rem; color: #a0aec0; margin-bottom: 15px; }
  h2 { color: #475569; margin: 0 0 10px 0; }
  p { color: #64748b; margin: 0; }
`;
const LoadingContainer = styled.div`
  text-align: center; padding: 60px; color: #6c757d; font-size: 1.1rem; i { font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1; }
`;

// --- KANBAN BOARD ---
const KanbanBoard = styled.div`
  display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; align-items: flex-start; min-height: 60vh; user-select: none;
  scrollbar-width: thin; 
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 8px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  
  /* SÓ APLICA O SNAP NO MOBILE PARA FLUIDEZ NO PC */
  @media (max-width: 768px) {
    scroll-snap-type: x mandatory;
  }
`;

const KanbanColumn = styled.div`
  min-width: 320px; max-width: 320px; min-height: 350px; background-color: #f4f5f7; border-radius: 10px; display: flex; flex-direction: column; gap: 10px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); padding: 10px;
  
  @media (max-width: 768px) {
    min-width: 85vw; 
    max-width: 85vw;
    scroll-snap-align: start; /* FAZ O SNAP APENAS NO MOBILE */
  }
`;

const ColumnHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 5px 5px 10px 5px;
  .title { font-weight: 700; color: #444; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge { background: #e2e4e9; color: #555; padding: 4px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }
`;

const CardsContainer = styled.div`
  display: flex; flex-direction: column; gap: 12px; flex: 1; overflow-y: auto; padding-bottom: 40px;
  max-height: 60vh;
  &::-webkit-scrollbar { display: none; }
`;

const KanbanCard = styled.div`
  background: ${props => props.$status.bg}; padding: 15px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); border-left: 4px solid ${props => props.$status.border}; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; gap: 6px; cursor: grab;
  &:hover { transform: translateY(-3px); box-shadow: 0 6px 15px rgba(0,0,0,0.08); }
  &:active { cursor: grabbing; opacity: 0.9; transform: scale(0.98); }

  .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .card-title { font-weight: 700; font-size: 1rem; color: #2c3e50; line-height: 1.3; }
  .stars { display: flex; gap: 2px; flex-shrink: 0; margin-top: 3px; i { font-size: 0.65rem; color: #cbd5e1; &.active { color: #f59e0b; } } }

  .card-value { color: ${props => props.$status.border}; font-weight: 800; font-size: 1.1rem; }
  
  .card-company { font-size: 0.8rem; color: #6c757d; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;}
  .badge-vip { background: #fff3cd; color: #856404; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; border: 1px solid #ffeeba;}
  .badge-hot { background: #fdf2f2; color: #dc3545; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; border: 1px solid #f8d7da;}
  .badge-cold { background: #f0f7ff; color: #1F4E79; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; border: 1px solid #b8daff;}
`;

const CardModules = styled.div`
  display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;
  span { font-size: 0.7rem; color: #28a745; font-weight: 700; background: #e6f4ea; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
`;

const SellerBadge = styled.div`
  display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; background: #f8f9fa; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; color: #495057; border: 1px solid #e2e8f0; width: fit-content;
  i { color: #722ed1; }
`;

const TaskBadge = styled.div`
  display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 4px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700; width: fit-content;
  background: ${p => (p.$urgente ? '#fdecea' : '#f3e8ff')};
  color: ${p => (p.$urgente ? '#dc3545' : '#6f42c1')};
  border: 1px solid ${p => (p.$urgente ? '#f5c6cb' : '#d6bcfa')};
  i { font-size: 0.7rem; }
`;

// --- MODAIS GERAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box;
`;

const ModalContent = styled.div`
  background: white; border-radius: 12px; width: 100%; max-width: ${props => props.$small ? '600px' : '900px'}; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: modalSobe 0.3s ease-out;
  @keyframes modalSobe { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #edf2f9; background: ${props => props.$bg || '#fff'}; color: ${props => props.$color || '#333'};
  h3 { margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 8px;}
  .subtitle { font-size: 0.85rem; color: ${props => props.$color ? 'rgba(255,255,255,0.8)' : '#007bff'}; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
  
  @media (max-width: 600px) {
    h3 { font-size: 1.15rem; padding-right: 30px; }
  }
`;

const ModalFooter = styled.div`
  display: flex; justify-content: ${props => props.$justify || 'space-between'}; align-items: center; padding: 20px 25px; border-top: 1px solid #edf2f9; background: #fbfbfc;
  @media (max-width: 600px) { flex-direction: column; gap: 15px; button { width: 100%; justify-content: center; } div { width: 100%; flex-direction: column; } }
`;

const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; cursor: pointer; color: ${props => props.$color || '#94a3b8'}; transition: 0.2s;
  &:hover { color: #dc3545; }
  @media (max-width: 600px) { position: absolute; right: 15px; top: 15px; }
`;

// --- FORMS & INPUTS ---
const FormGrid = styled.div`
  display: grid; grid-template-columns: ${props => props.$columns || '1fr'}; gap: 15px;
  .span-2 { grid-column: span 2; }
  @media (max-width: 768px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  label { font-weight: 700; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 6px;}
  .text-blue { color: #007bff; } .text-green { color: #28a745; } .text-purple { color: #722ed1; }
`;

const Input = styled.input`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; transition: 0.2s; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { border-color: #007bff; background: #f0f7ff; font-weight: 700;}
  &.highlight-green { border-color: #28a745; background: #f4fbf5; font-weight: 700;}
  &.disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

const Select = styled.select`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; cursor: pointer; transition: 0.2s; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight { background: #f8f9fa; border-color: #007bff; font-weight: 600;}
  &.disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
  
  background-color: ${props => {
    switch(props.$status) {
      case 'naofunciona': return '#fff9db';
      case 'naoatendeu' : return '#fff4e6';
      case 'tarefa'     : return '#f3e8ff';
      case 'ganho'      : return '#e6f4ea';
      case 'interessada': return '#e9f7ef';
      case 'avaliar'    : return '#e9f7ef';
      case 'perdido'    : return '#fdecea';
      case 'assessorada': return '#fff3cd';
      case 'lead_quente': return '#fdf2f2';
      case 'nao_assessorada': return '#f8fafc';
      default           : return '#fff';
    }
  }};
`;

const TextArea = styled.textarea`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; resize: vertical; transition: 0.2s; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { border-color: #007bff; background: #f0f7ff; }
`;

const SectionCard = styled.div`
  background: ${props => props.$bgColor || '#f8fafc'}; border: 1px solid ${props => props.$borderColor || '#e2e8f0'}; padding: 20px; border-radius: 12px; margin-bottom: 20px;
  @media (max-width: 600px) { padding: 15px; }
`;

// --- AUTOCOMPLETE CUSTOMIZADO ---
const AutocompleteContainer = styled.div`
  position: relative; width: 100%;
`;
const AutocompleteList = styled.ul`
  position: absolute; top: calc(100% + 5px); left: 0; width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15); max-height: 300px; overflow-y: auto; z-index: 1000; padding: 10px; list-style: none; margin: 0; animation: fadeInDown 0.2s ease-out forwards;
`;
const AutocompleteOption = styled.li`
  padding: 12px 16px; font-size: 0.95rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; margin-bottom: 2px;
  &:hover { background: #f8fafc; color: #0f172a; transform: translateX(4px); }
  &.danger { color: #dc3545; font-weight: 700; &:hover { background: #fff5f5; color: #dc3545; } }
  &.no-results { color: #94a3b8; font-style: italic; cursor: default; &:hover { background: transparent; transform: none; } }
`;

const IconButton = styled.button`
  background: #e7f3ff; color: #007bff; border: 1px solid #b8daff; border-radius: 8px; padding: 0 15px; cursor: pointer; font-size: 1.1rem; transition: 0.2s;
  &:hover { background: #007bff; color: #fff; }
`;

// --- MÓDULOS E CÁLCULOS ---
const ModulesGrid = styled.div`
  display: flex; gap: 10px; flex-wrap: wrap;
`;
const ModuleCard = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 10px 15px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; width: 100%;
  background: ${props => props.$active ? '#e6f4ea' : '#ffffff'};
  border: 1px solid ${props => props.$active ? '#28a745' : '#cbd5e1'};
  
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

  .custom-checkbox {
    width: 20px; height: 20px; border-radius: 4px; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center;
    &.active { background: #28a745; border-color: #28a745; color: #fff; }
  }
  
  .mod-info { display: flex; flex-direction: column; }
  .mod-name { font-size: 0.85rem; color: #333; font-weight: ${props => props.$active ? '700' : '600'}; }
  .mod-price { font-size: 0.8rem; color: #28a745; font-weight: 700; }
`;

const TotalsBox = styled.div`
  margin-top: 20px; padding-top: 15px; border-top: 1px dashed #c3e6cb; display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end;
  
  label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 6px; }
  .text-blue { color: #007bff; } .text-green { color: #28a745; }
  
  .val { padding: 10px 15px; border-radius: 8px; font-weight: 800; font-size: 1.1rem; border: 1px solid transparent; }
  .bg-gray { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
  .bg-green { background: #d4edda; color: #155724; border-color: #c3e6cb; }

  @media (max-width: 600px) {
    div { width: 100%; }
    .val { text-align: right; }
    input { width: 100% !important; }
  }
`;

// --- FEED DE NOTAS ---
const NotesFeed = styled.div`
  display: flex; flex-direction: column; gap: 12px; max-height: 250px; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;
  &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  .empty-notes { text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 20px; font-style: italic; }
`;
const NoteItem = styled.div`
  background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #007bff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  
  .note-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  .btn-cancel { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 4px; color: #475569; font-weight: 600; cursor: pointer; }
  .btn-save { background: #007bff; border: none; padding: 6px 12px; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer; }
`;
const NoteHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
  .user { display: flex; align-items: center; gap: 6px; color: #2c3e50; font-size: 0.9rem; }
  .meta { display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 0.8rem; font-weight: 600; }
  .btn-edit { background: none; border: none; color: #007bff; cursor: pointer; opacity: 0.5; transition: 0.2s; &:hover{ opacity: 1; transform: scale(1.1); } }
`;
const NoteBody = styled.div`
  color: #475569; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;
`;

const AddNoteBox = styled.div`
  display: flex; gap: 10px;
  .btn-send { background: #28a745; color: #fff; border: none; padding: 0 20px; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.2s; &:hover{ background: #218838; } }
`;

// --- BOTÕES GENÉRICOS ---
const ButtonBase = styled.button`
  padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
  &:active { transform: scale(0.98); }
`;
const PrimaryButton = styled(ButtonBase)`
  background: #007bff; color: #fff; &:hover { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }
`;
const SecondaryButton = styled(ButtonBase)`
  background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; }
`;
const DangerButton = styled(ButtonBase)`
  background: #fff5f5; color: #dc3545; border: 1px solid #f8d7da; &:hover { background: #dc3545; color: #fff; box-shadow: 0 4px 10px rgba(220,53,69,0.2); }
`;
const WarningButton = styled(ButtonBase)`
  background: #ffc107; color: #333; &:hover { background: #e0a800; box-shadow: 0 4px 10px rgba(255,193,7,0.2); }
`;

const InfoBox = styled.div`
  background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;
  &.span-2 { grid-column: span 2; }
  label { font-size: 0.75rem; color: #64748b; font-weight: 800; display: block; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;}
  div { font-size: 1rem; color: #2c3e50; font-weight: 600; }
  .text-blue { color: #007bff; }
  .phones { display: flex; gap: 10px; flex-wrap: wrap; }
  .phone-pill { display: inline-flex; align-items: center; gap: 6px; background: #e6f4ea; color: #155724; padding: 6px 12px; border-radius: 10px; text-decoration: none; font-size: 0.9rem; border: 1px solid #c3e6cb; transition: 0.2s; &:hover{ background: #28a745; color: #fff; .text-green{color:#fff;} } }
  .text-green { color: #28a745; }
`;

// --- COMPONENTE DE ESTRELAS NO FUNIL ---
const StarsContainer = styled.div`
  display: flex; gap: 5px; align-items: center;
  i {
    font-size: 1.2rem;
    color: #cbd5e1;
    transition: 0.2s;
    &.active { color: #f59e0b; }
  }
  ${props => !props.$readonly && `
    i:hover { transform: scale(1.2); color: #fbbf24; }
  `}
`;