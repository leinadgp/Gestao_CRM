import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import { TarefasOportunidade } from '../componentes/TarefasOportunidade.jsx';
import { BotaoExportar } from '../componentes/BotaoExportar.jsx';
import { listarMinhasTarefas, classificarTarefa } from '../utils/tarefasService.js';

import { normalizarCargosJson, normalizarListaJson, cargosParaTexto } from '../utils/jsonHelpers.js';
import { normalizarClassificacoesPorCargo, resolverScoringEmpresa, PESOS_CLASSIFICACAO } from '../utils/classificacaoEmpresa.js';
import { estaForaDoHorario } from '../utils/horarioFuncionamento.js';
import {
  calcularTotaisPacote,
  inscritosUsamModulosPorPessoa,
  uniaoModulosInscritos,
  somarValorModulos,
} from '../utils/calculoPacote.js';
import { UFS_BRASIL } from '../constants/ufsBrasil.js';
import { normalizarTexto } from '../utils/normalizarTexto.js';
import { exportarLinhasComoCsv } from '../utils/exportarCsv.js';
import { useBloqueioEdicao } from '../hooks/useBloqueioEdicao.js';

const inscritoVazio = (modulosPadrao = []) => ({
  nome: '', email: '', telefone: '', formacao: '', cargo: '', contato_id: null,
  modulos_ids: [...(modulosPadrao || [])],
});

const parseJSONSeguro = (dado, fallback = []) => {
  if (dado == null || dado === '') return fallback;
  if (typeof dado !== 'string') return dado;
  try { return JSON.parse(dado); } catch { return fallback; }
};

const extrairCargosAssessorados = (dado) => {
  return normalizarClassificacoesPorCargo(dado)
    .filter((item) => item.classificacao === 'assessorada')
    .map((item) => item.cargo);
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
  const [ultimaAtualizacaoFunil, setUltimaAtualizacaoFunil] = useState(null);
  const [filtroCampanha, setFiltroCampanha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { tentarAbrir: tentarAbrirTravaOportunidade, liberar: liberarTravaOportunidade } = useBloqueioEdicao('oportunidade', {
    onTravaPerdida: () => {
      alert('Sua edição expirou por inatividade — esta negociação foi liberada para outro usuário.');
      fecharModalPrincipal(false);
    },
  });
  useEffect(() => () => { liberarTravaOportunidade(); }, [liberarTravaOportunidade]);
  const [mostrarModalDiagnostico, setMostrarModalDiagnostico] = useState(false);
  const [diagnostico, setDiagnostico] = useState({ com_negociacao: [], sem_negociacao: [] });
  const [carregandoDiagnostico, setCarregandoDiagnostico] = useState(false);
  const [abaDiagnostico, setAbaDiagnostico] = useState('criadas');
  const [buscaDiagnostico, setBuscaDiagnostico] = useState('');
  const [estadoDiagnostico, setEstadoDiagnostico] = useState('');
  const [buscaGeral, setBuscaGeral] = useState('');
  const [mostrarSugestoesBusca, setMostrarSugestoesBusca] = useState(false);
  const [ultimasBuscasGeral, setUltimasBuscasGeral] = useState(() => {
    try {
      const saved = localStorage.getItem('ultimasBuscasGeral');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dropdownCampanhaAberto, setDropdownCampanhaAberto] = useState(false);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroFaixaAlfabetica, setFiltroFaixaAlfabetica] = useState('');
  const [filtroEstrelasMin, setFiltroEstrelasMin] = useState(0);
  const dropdownCampanhaRef = useRef(null);

  const FAIXAS_ALFABETICAS = [
    { valor: 'A-M', label: 'A – M' },
    { valor: 'N-Z', label: 'N – Z' },
  ];
  function letraDentroDaFaixa(letra, faixa) {
    if (!faixa) return true;
    const [ini, fim] = faixa.split('-');
    return letra >= ini && letra <= fim;
  }
  // Nome do órgão quase sempre começa com "Prefeitura"/"Câmara Municipal"/etc,
  // então cortar só a 1ª letra do nome inteiro faz tudo cair na mesma faixa
  // (ex: quase tudo em "N-Z" por causa do "P" de "Prefeitura"). Usar a cidade
  // (campo próprio, mais confiável) e, na falta dela, tirar o prefixo
  // institucional do nome antes de pegar a letra.
  const PREFIXO_ORGAO_REGEX = /^(prefeitura( municipal)?( de)?|c[aâ]mara( municipal)?( de)?|autarquia( municipal)?( de)?|cons[oó]rcio( intermunicipal)?( de)?)\s+/i;
  function letraInicialFaixa(op, empresaObj) {
    const cidade = (empresaObj?.cidade || '').trim();
    if (cidade) return cidade.charAt(0).toUpperCase();
    const nome = (op.empresa_nome || empresaObj?.nome || op.titulo || '').trim();
    const semPrefixo = nome.replace(PREFIXO_ORGAO_REGEX, '').trim();
    return (semPrefixo || nome).charAt(0).toUpperCase();
  }
  const buscaWrapperRef = useRef(null);

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
  const [contatosVinculadosIds, setContatosVinculadosIds] = useState([]);
  const [qtdInscritos, setQtdInscritos] = useState(0);
  const [inscritos, setInscritos] = useState([inscritoVazio()]);
  const [etapaId, setEtapaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusOp, setStatusOp] = useState('aberto');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [motivosPerda, setMotivosPerda] = useState([]);
  const [mostrarModalMotivos, setMostrarModalMotivos] = useState(false);
  const [novoMotivoNome, setNovoMotivoNome] = useState('');
  const [editandoMotivoId, setEditandoMotivoId] = useState(null);
  const [editandoMotivoNome, setEditandoMotivoNome] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [vendedorOriginal, setVendedorOriginal] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [descontoReais, setDescontoReais] = useState(0);

  // --- ESTADOS DE MÓDULOS ---
  const [modulosCampanha, setModulosCampanha] = useState([]);
  const [modulosSelecionados, setModulosSelecionados] = useState([]);
  /** 'igual' = mesmo pacote × qtd inscritos | 'por_inscrito' = módulo(s) por pessoa */
  const [modoPacoteInscricao, setModoPacoteInscricao] = useState('igual');

  // --- ESTADOS DE NOTAS ---
  const [notas, setNotas] = useState([]);
  const [novaNota, setNovaNota] = useState('');
  const [editandoNotaId, setEditandoNotaId] = useState(null);
  const [textoNotaEditada, setTextoNotaEditada] = useState('');

  // --- HISTÓRICO DA PREFEITURA (empresa-level) ---
  const [historicoEmpresa, setHistoricoEmpresa] = useState([]);
  const [observacoesEmpresa, setObservacoesEmpresa] = useState('');
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoOpSelecionada, setHistoricoOpSelecionada] = useState(null);
  const [notasHistorico, setNotasHistorico] = useState([]);

  // --- ÚLTIMA INTERAÇÃO ---
  const [ultimaInteracao, setUltimaInteracao] = useState(null);
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const [cooldownContato, setCooldownContato] = useState(0);
  const [abrindoNegociacaoId, setAbrindoNegociacaoId] = useState(null);
  const [salvandoOportunidade, setSalvandoOportunidade] = useState(false);

  // --- ESTADOS DE TAREFAS ---
  const [tarefasPorOp, setTarefasPorOp] = useState({});

  // --- ESTADOS DO SUB-MODAL DE CONTATO ---
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [modoContatoModal, setModoContatoModal] = useState('ver'); // ver | editar | novo
  const [contatoSelecionado, setContatoSelecionado] = useState(null);
  const [editandoContatoRapido, setEditandoContatoRapido] = useState(false);
  const [contatoNome, setContatoNome] = useState('');
  const [contatoCargos, setContatoCargos] = useState(['']);
  const [listaCargos, setListaCargos] = useState([]);
  const [mostrarModalNovoCargo, setMostrarModalNovoCargo] = useState(false);
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [cargoIndexAtual, setCargoIndexAtual] = useState(null);
  const [cargoAnteriorParaCancelamento, setCargoAnteriorParaCancelamento] = useState('');
  const [contatoEmails, setContatoEmails] = useState(['']);
  const [contatoTelefones, setContatoTelefones] = useState(['']);
  const [contatoWhatsapp, setContatoWhatsapp] = useState('');
  const [contatoNaoQuerEmail, setContatoNaoQuerEmail] = useState(false);
  const [contatoNaoQuerLigacao, setContatoNaoQuerLigacao] = useState(false);
  const [contatoCongeladoAte, setContatoCongeladoAte] = useState('');
  const [contatoObservacoes, setContatoObservacoes] = useState('');

  // --- ESTADOS DO SUB-MODAL DE EMPRESA ---
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [editandoEmpresaRapida, setEditandoEmpresaRapida] = useState(false);
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaEstado, setEmpresaEstado] = useState('');
  const [empresaCidade, setEmpresaCidade] = useState('');
  const [empresaTelefones, setEmpresaTelefones] = useState('');
  const [empresaHorario, setEmpresaHorario] = useState('');
  const [empresaClassificacao, setEmpresaClassificacao] = useState('nao_assessorada');
  const [empresaEstrelas, setEmpresaEstrelas] = useState(0);
  const [empresaAssessoradasCargos, setEmpresaAssessoradasCargos] = useState([]);
  const [empresaClassificacoesPorCargo, setEmpresaClassificacoesPorCargo] = useState([]);
  const [ultimasEmpresasPesquisadas, setUltimasEmpresasPesquisadas] = useState([]);

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
    try {
      localStorage.setItem('ultimasBuscasGeral', JSON.stringify(ultimasBuscasGeral));
    } catch {
      // silencioso
    }
  }, [ultimasBuscasGeral]);

  const registrarBuscaGeral = (termo) => {
    const texto = String(termo || '').trim();
    if (!texto) return;
    setUltimasBuscasGeral((prev) => [texto, ...prev.filter((item) => item.toLowerCase() !== texto.toLowerCase())].slice(0, 8));
  };

  useEffect(() => {
    const opId = location.state?.abrirOportunidadeId;
    if (!opId || oportunidades.length === 0) return;
    const op = oportunidades.find(o => Number(o.id) === Number(opId));
    if (op) {
      abrirModalEdicao(op);
      // Precisa limpar via navigate (não window.history.replaceState) — o
      // react-router mantém seu PRÓPRIO estado de location, então mexer só
      // na History API do navegador não zera location.state pro react-router.
      // Sem isso, "abrirOportunidadeId" continuava vivo pra sempre, e QUALQUER
      // atualização de "oportunidades" (ex: clicar em "Registrar Contato
      // Agora", que atualiza o array) fazia esse efeito rodar de novo e reabrir
      // à força a negociação antiga por cima da que a pessoa estava editando —
      // exatamente o "troca de negociação sozinha" relatado.
      navigate(location.pathname, { replace: true, state: {} });
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
    if (!filtroCampanha) return;
    const intervalo = setInterval(() => {
      if (!mostrarModal && !carregando) {
        carregarFunilDaCampanha(filtroCampanha, true);
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, [filtroCampanha, mostrarModal, carregando]);

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
      if (buscaWrapperRef.current && !buscaWrapperRef.current.contains(event.target)) {
        setMostrarSugestoesBusca(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [empresaId, empresas, contatoId, contatos]);

  useEffect(() => {
    const empresaSelecionada = empresas.find(e => e.id === parseInt(empresaId));
    if (empresaSelecionada) {
      setEmpresaTelefones(empresaSelecionada.telefones || '');
      setEmpresaHorario(empresaSelecionada.horario_funcionamento || '');
    } else {
      setEmpresaTelefones('');
      setEmpresaHorario('');
    }
  }, [empresaId, empresas]);

  useEffect(() => {
    setEmpresaAssessoradasCargos(
      empresaClassificacoesPorCargo
        .filter((item) => item.classificacao === 'assessorada')
        .map((item) => item.cargo)
    );
  }, [empresaClassificacoesPorCargo]);

  useEffect(() => {
    const lidarComBotaoVoltar = () => {
      // Se apertar voltar no celular, a gente apenas fecha o modal que estiver aberto
      if (mostrarModal) {
        fecharModalPrincipal(false);
      } else if (mostrarModalContato) {
        fecharModalContato();
      } else if (mostrarModalEmpresa) {
        setMostrarModalEmpresa(false);
      } else if (mostrarModalNovoCargo) {
        setMostrarModalNovoCargo(false);
      }
    };

    // Só "engana" o histórico se algum modal estiver aberto
    if (mostrarModal || mostrarModalContato || mostrarModalEmpresa || mostrarModalNovoCargo) {
      window.history.pushState(null, null, window.location.pathname);
      window.addEventListener('popstate', lidarComBotaoVoltar);
    }

    return () => {
      window.removeEventListener('popstate', lidarComBotaoVoltar);
    };
  }, [mostrarModal, mostrarModalContato, mostrarModalEmpresa, mostrarModalNovoCargo]);

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
      const [resEmp, resC, resCamp, resEquipe, resCargos, resMotivos] = await Promise.all([
        axios.get(`${API_URL}/empresas`, config),
        axios.get(`${API_URL}/contatos`, config),
        axios.get(`${API_URL}/campanhas`, config),
        axios.get(`${API_URL}/usuarios/equipe`, config),
        axios.get(`${API_URL}/cargos`, config).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/motivos-perda`, config).catch(() => ({ data: [] })),
      ]);

      setEmpresas(resEmp.data);
      setContatos(resC.data);
      if (resCargos.data?.length) {
        setListaCargos(resCargos.data.map((c) => c.nome).sort((a, b) => a.localeCompare(b)));
      }
      setMotivosPerda(resMotivos.data || []);

      const todasCampanhas = resCamp.data;
      const campanhasAtivas = todasCampanhas.filter((camp) => camp.arquivada !== true);
      setCampanhas(campanhasAtivas);
      setEquipe(resEquipe.data);

      if (campanhasAtivas.length > 0) {
        setFiltroCampanha(String(campanhasAtivas[0].id));
      } else {
        setFiltroCampanha('');
      }
    } catch (erro) {
      console.error('Erro ao buscar dados base do Funil:', erro);
      if (!erro.sessaoExpirada) alert('Falha ao carregar dados. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarFunilDaCampanha(campanhaId, quiet = false) {
    if (!quiet) setCarregando(true);
    try {
      const config = getHeaders();
      const [resEtapas, resOps] = await Promise.all([
        axios.get(`${API_URL}/campanhas/${campanhaId}/etapas`, config),
        axios.get(`${API_URL}/oportunidades`, { ...config, params: { campanha_id: campanhaId } })
      ]);

      setEtapas(resEtapas.data);
      setOportunidades(resOps.data);
      setUltimaAtualizacaoFunil(new Date());
    } catch (erro) {
      console.error(erro);
    } finally {
      if (!quiet) setCarregando(false);
    }
  }

  async function carregarModulosDaCampanha(campanhaId) {
    try {
      const res = await axios.get(`${API_URL}/campanhas/${campanhaId}/modulos`, getHeaders());
      setModulosCampanha(res.data);
    } catch (e) { console.error('Erro ao buscar módulos', e); }
  }

  async function carregarDiagnostico(estadoFiltro) {
    setCarregandoDiagnostico(true);
    try {
      const uf = estadoFiltro !== undefined ? estadoFiltro : estadoDiagnostico;
      const params = uf ? `?estado=${uf}` : '';
      const res = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/diagnostico-negociacoes${params}`, getHeaders());
      setDiagnostico(res.data);
    } catch {
      alert('Erro ao carregar diagnóstico.');
    } finally {
      setCarregandoDiagnostico(false);
    }
  }

  function motivoDiagnostico(row) {
    if (row.total_contatos === 0) return 'Sem contatos cadastrados';
    if (row.contatos_com_cargo === 0) return 'Sem contato com cargo alvo';
    if (row.contatos_disponiveis === 0) return 'Contatos congelados';
    return '—';
  }

  function exportarDiagnosticoCsv() {
    const aba = abaDiagnostico === 'criadas' ? diagnostico.com_negociacao : diagnostico.sem_negociacao;
    if (!aba.length) return alert('Nenhum dado para exportar.');
    if (abaDiagnostico === 'criadas') {
      exportarLinhasComoCsv(aba.map(r => ({
        empresa: r.empresa_nome,
        estado: r.estado,
        status: r.status,
        etapa: r.etapa_nome,
        valor: r.valor,
      })), 'diagnostico_criadas');
    } else {
      exportarLinhasComoCsv(aba.map(r => ({
        empresa: r.empresa_nome,
        estado: r.estado,
        total_contatos: r.total_contatos,
        contatos_com_cargo: r.contatos_com_cargo,
        motivo: motivoDiagnostico(r),
      })), 'diagnostico_nao_criadas');
    }
  }

  const campanhaSelecionadaObj = useMemo(() => {
    return campanhas.find(c => c.id === parseInt(filtroCampanha));
  }, [campanhas, filtroCampanha]);

  const cargosAlvoCampanha = useMemo(() => {
    if (!campanhaSelecionadaObj?.cargos_alvo) return [];
    const raw = campanhaSelecionadaObj.cargos_alvo;
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }, [campanhaSelecionadaObj]);

  const empresasPorId = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas]);

  const oportunidadesPorEtapa = useMemo(() => {
    const mapa = {};
    etapas.forEach(e => mapa[e.id] = []);

    const opsFiltradasEstado = oportunidades.filter(op => {
      if (filtroEstado) {
        const estadoOp = (op.empresa_estado || empresasPorId.get(op.empresa_id)?.estado || '').toUpperCase();
        if (estadoOp !== filtroEstado.toUpperCase()) return false;
      }
      if (filtroVendedor && String(op.vendedor_id) !== String(filtroVendedor)) return false;
      if (filtroFaixaAlfabetica) {
        const empresaObj = empresasPorId.get(op.empresa_id);
        const letra = letraInicialFaixa(op, empresaObj);
        if (!letra || !letraDentroDaFaixa(letra, filtroFaixaAlfabetica)) return false;
      }
      return true;
    });

    const agora = Date.now();
    const opsEnriquecidas = opsFiltradasEstado.map((op) => {
      const emp = empresasPorId.get(op.empresa_id) || {};
      const cargosCont = normalizarCargosJson(op.contato_cargos_json, []);
      const classificacoesJson = op.empresa_classificacoes_por_cargo_json ?? emp.classificacoes_por_cargo_json;
      const assessoradasCargos = extrairCargosAssessorados(classificacoesJson);
      const scoring = resolverScoringEmpresa(
        {
          classificacao: op.empresa_classificacao ?? emp.classificacao,
          estrelas: op.empresa_estrelas ?? emp.estrelas,
          classificacoes_por_cargo_json: classificacoesJson,
        },
        cargosAlvoCampanha,
        cargosCont
      );
      const dataRef = op.atualizado_em || op.criado_em;
      const diasNaEtapa = dataRef ? Math.floor((agora - new Date(dataRef).getTime()) / 86400000) : 0;
      const horarioFuncionamento = op.empresa_horario_funcionamento ?? emp.horario_funcionamento;
      return {
        ...op,
        classificacao: scoring.classificacao,
        estrelas: scoring.estrelas,
        cargoPrioridade: scoring.cargoRef,
        assessoradasCargos,
        diasNaEtapa,
        foraDoHorario: estaForaDoHorario(horarioFuncionamento),
      };
    });

    const opsPosFiltroEstrelas = filtroEstrelasMin > 0
      ? opsEnriquecidas.filter((op) => (op.estrelas || 0) >= filtroEstrelasMin)
      : opsEnriquecidas;

    opsPosFiltroEstrelas.sort((a, b) => {
      if (b.estrelas !== a.estrelas) return b.estrelas - a.estrelas;
      const pesoA = PESOS_CLASSIFICACAO[a.classificacao] || 1;
      const pesoB = PESOS_CLASSIFICACAO[b.classificacao] || 1;
      if (pesoA !== pesoB) return pesoB - pesoA;
      return new Date(b.criado_em) - new Date(a.criado_em);
    });

    // Ordem dentro de cada coluna é sempre por prioridade (estrelas → classificação
    // → mais recente primeiro) — sem alternativa de A-Z/Z-A por coluna. Separar
    // a carteira por região/consultor agora é feito pelo filtro "Faixa Alfabética"
    // (no modal de Filtros), que já resolve isso de forma mais confiável.
    opsPosFiltroEstrelas.forEach(op => {
      if (!mapa[op.etapa_id]) mapa[op.etapa_id] = [];
      mapa[op.etapa_id].push(op);
    });

    return mapa;
  }, [etapas, oportunidades, filtroEstado, filtroVendedor, filtroFaixaAlfabetica, filtroEstrelasMin, empresasPorId, cargosAlvoCampanha]);

  const sugestoesBusca = useMemo(() => {
    const termo = normalizarTexto(buscaGeral);
    if (!termo || termo.length < 2) return [];

    const base = (oportunidades || []).filter((op) => {
      if (filtroEstado) {
        const estadoOp = (op.empresa_estado || empresas.find(e => e.id === op.empresa_id)?.estado || '').toUpperCase();
        if (estadoOp !== filtroEstado.toUpperCase()) return false;
      }
      return true;
    });

    const scored = base
      .map((op) => {
        const titulo = normalizarTexto(op.titulo || '');
        const empresa = normalizarTexto(op.empresa_nome || '');
        const contato = normalizarTexto(op.contato_nome || '');
        const hit = titulo.includes(termo) || empresa.includes(termo) || contato.includes(termo);
        if (!hit) return null;
        const starts = empresa.startsWith(termo) || titulo.startsWith(termo) || contato.startsWith(termo);
        return { op, score: starts ? 2 : 1 };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.op.criado_em) - new Date(a.op.criado_em);
      })
      .slice(0, 12)
      .map((x) => x.op);

    return scored;
  }, [buscaGeral, oportunidades, filtroEstado, empresas]);

  const historicoBuscaGeral = useMemo(() => {
    if (buscaGeral.trim() !== '') return [];
    return ultimasBuscasGeral;
  }, [buscaGeral, ultimasBuscasGeral]);

  const contatosFiltradosParaSelect = useMemo(() => {
    const busca = buscaContatoNoModal.toLowerCase();
    const base = empresaId ? contatos.filter(c => c.empresa_id === parseInt(empresaId)) : contatos;
    return base.filter(c => c.nome.toLowerCase().includes(busca));
  }, [contatos, empresaId, buscaContatoNoModal]);

  const empresasFiltradasParaSelect = useMemo(() => {
    const busca = buscaEmpresaNoModal.toLowerCase().trim();
    if (!busca && ultimasEmpresasPesquisadas.length > 0) {
      return ultimasEmpresasPesquisadas
        .map((id) => empresas.find((emp) => emp.id === id))
        .filter(Boolean);
    }
    return empresas.filter(e => e.nome.toLowerCase().includes(busca));
  }, [empresas, buscaEmpresaNoModal, ultimasEmpresasPesquisadas]);

  const { subtotalModulos, valorFinalCalculado, detalheSubtotal, fatorInscritos, somaPacoteUnidade } = useMemo(() => {
    const totais = calcularTotaisPacote({
      modulosSelecionados,
      modulosCampanha,
      qtdInscritos,
      inscritos,
      modoPacote: modoPacoteInscricao,
      desconto,
      descontoReais,
    });
    return {
      subtotalModulos: totais.subtotal,
      valorFinalCalculado: totais.valorFinal,
      detalheSubtotal: totais.detalhe,
      fatorInscritos: totais.fator,
      somaPacoteUnidade: totais.somaUnidade,
    };
  }, [modulosSelecionados, modulosCampanha, qtdInscritos, inscritos, modoPacoteInscricao, desconto, descontoReais]);

  const contatosDaEmpresa = useMemo(() => {
    if (!empresaId) return [];
    return contatos.filter((c) => Number(c.empresa_id) === Number(empresaId));
  }, [contatos, empresaId]);

  const contatosDisponiveisDaEmpresa = useMemo(() => {
    return contatosDaEmpresa.filter((contato) => {
      if (!contato?.congelado_ate) return true;
      return new Date(contato.congelado_ate) <= new Date();
    });
  }, [contatosDaEmpresa]);

  useEffect(() => {
    if (!empresaId || editandoId) return;
    const idsAuto = contatosDisponiveisDaEmpresa
      .filter((c) => {
        if (!cargosAlvoCampanha.length) return true;
        const cargosCont = normalizarCargosJson(c.cargos_json, []);
        return cargosCont.some((cg) => cargosAlvoCampanha.includes(cg));
      })
      .map((c) => c.id);
    setContatosVinculadosIds(idsAuto);
    if (idsAuto.length && !contatoId) setContatoId(String(idsAuto[0]));
  }, [empresaId, contatosDisponiveisDaEmpresa, cargosAlvoCampanha, editandoId]);

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

  async function salvarObservacoesEmpresa() {
    if (!empresaId) return;
    try {
      await axios.patch(`${API_URL}/empresas/${empresaId}/observacoes`, { observacoes: observacoesEmpresa }, getHeaders());
    } catch (e) { console.error('Erro ao salvar observações da empresa', e); }
  }

  async function carregarHistoricoEmpresa(empresaId, opAtualId) {
    setCarregandoHistorico(true);
    setHistoricoEmpresa([]);
    setObservacoesEmpresa('');
    try {
      const res = await axios.get(`${API_URL}/empresas/${empresaId}/detalhes`, getHeaders());
      const outras = (res.data.oportunidades || []).filter(o => o.id !== opAtualId);
      setHistoricoEmpresa(outras);
      setObservacoesEmpresa(res.data.empresa?.observacoes || '');
    } catch (e) { console.error('Erro ao carregar histórico da empresa', e); }
    finally { setCarregandoHistorico(false); }
  }

  async function verNotasHistorico(op) {
    if (historicoOpSelecionada === op.id) { setHistoricoOpSelecionada(null); setNotasHistorico([]); return; }
    setHistoricoOpSelecionada(op.id);
    setNotasHistorico([]);
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${op.id}/notas`, getHeaders());
      setNotasHistorico(res.data);
    } catch (e) { console.error('Erro ao buscar notas do histórico', e); }
  }

  async function adicionarNota() {
    if (!novaNota.trim() || !editandoId) return;
    try {
      const res = await axios.post(
        `${API_URL}/oportunidades/${editandoId}/notas`,
        { nota: novaNota, criado_em: new Date().toISOString() },
        getHeaders()
      );
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

  function preencherFormContato(contato) {
    setContatoSelecionado(contato);
    setContatoNome(contato?.nome || '');
    const listaCargosContato = normalizarCargosJson(contato?.cargos_json, []);
    setContatoCargos(listaCargosContato.length ? listaCargosContato : ['']);
    const emails = normalizarListaJson(contato?.emails_json, []);
    setContatoEmails(emails.length ? emails : ['']);
    const tels = normalizarListaJson(contato?.telefones_json, []);
    setContatoTelefones(tels.length ? tels : ['']);
    setContatoWhatsapp(contato?.whatsapp_pessoal || '');
    setContatoNaoQuerEmail(!!contato?.nao_quero_email);
    setContatoNaoQuerLigacao(!!contato?.nao_quero_ligacao);
    setContatoCongeladoAte(contato?.congelado_ate ? String(contato.congelado_ate).slice(0, 10) : '');
    setContatoObservacoes(contato?.observacoes || '');
  }

  function abrirEditarContato(contato) {
    preencherFormContato(contato);
    setModoContatoModal('editar');
    setEditandoContatoRapido(true);
    setMostrarModalContato(true);
  }

  function abrirNovoContato() {
    if (!empresaId) {
      alert('Selecione a prefeitura antes de cadastrar um contato.');
      return;
    }
    setContatoSelecionado(null);
    setContatoNome('');
    setContatoCargos(['']);
    setContatoEmails(['']);
    setContatoTelefones(['']);
    setContatoWhatsapp('');
    setContatoNaoQuerEmail(false);
    setContatoNaoQuerLigacao(false);
    setContatoCongeladoAte('');
    setContatoObservacoes('');
    setModoContatoModal('novo');
    setEditandoContatoRapido(true);
    setMostrarModalContato(true);
  }

  function definirContatoPrincipal(id) {
    const numId = Number(id);
    if (!contatosVinculadosIds.includes(numId)) {
      setContatosVinculadosIds((prev) => [...prev, numId]);
    }
    setContatoId(String(numId));
    const c = contatos.find((x) => x.id === numId);
    setBuscaContatoNoModal(c?.nome || '');
  }

  function fecharModalContato() {
    setMostrarModalContato(false);
    setModoContatoModal('ver');
    setEditandoContatoRapido(false);
    setContatoSelecionado(null);
  }

  function gerenciarContatoCargos(acao, index, valor) {
    if (acao === 'add') setContatoCargos((prev) => [...prev, '']);
    if (acao === 'remove') setContatoCargos((prev) => prev.filter((_, i) => i !== index));
    if (acao === 'update') {
      setContatoCargos((prev) => {
        const nova = [...prev];
        nova[index] = valor;
        return nova;
      });
    }
  }

  function gerenciarContatoEmails(acao, index, valor) {
    if (acao === 'add') setContatoEmails((prev) => [...prev, '']);
    if (acao === 'remove') setContatoEmails((prev) => prev.filter((_, i) => i !== index));
    if (acao === 'update') {
      setContatoEmails((prev) => {
        const nova = [...prev];
        nova[index] = valor;
        return nova;
      });
    }
  }

  function gerenciarContatoTelefones(acao, index, valor) {
    if (acao === 'add') setContatoTelefones((prev) => [...prev, '']);
    if (acao === 'remove') setContatoTelefones((prev) => prev.filter((_, i) => i !== index));
    if (acao === 'update') {
      setContatoTelefones((prev) => {
        const nova = [...prev];
        nova[index] = valor;
        return nova;
      });
    }
  }

  function handleContatoCargoChange(e, idx) {
    const valor = e.target.value;
    if (valor === 'NOVO_CARGO_ACTION') {
      setCargoAnteriorParaCancelamento(contatoCargos[idx] || '');
      setCargoIndexAtual(idx);
      setNovoCargoNome('');
      setMostrarModalNovoCargo(true);
    } else {
      gerenciarContatoCargos('update', idx, valor);
    }
  }

  async function salvarNovoCargoFunil(e) {
    e.preventDefault();
    const nomeFormatado = novoCargoNome.trim();
    if (!nomeFormatado) return;
    try {
      await axios.post(`${API_URL}/cargos`, { nome: nomeFormatado }, getHeaders());
      if (!listaCargos.includes(nomeFormatado)) {
        setListaCargos((prev) => [...prev, nomeFormatado].sort((a, b) => a.localeCompare(b)));
      }
      gerenciarContatoCargos('update', cargoIndexAtual, nomeFormatado);
      setMostrarModalNovoCargo(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar novo cargo no banco.');
    }
  }

  function cancelarNovoCargoFunil() {
    gerenciarContatoCargos('update', cargoIndexAtual, cargoAnteriorParaCancelamento);
    setMostrarModalNovoCargo(false);
  }

  function atualizarEmpresaClassificacaoPorCargo(index, field, valor) {
    setEmpresaClassificacoesPorCargo((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: valor };
      return next;
    });
  }

  function adicionarEmpresaClassificacaoCargo() {
    setEmpresaClassificacoesPorCargo((prev) => [...prev, { cargo: '', classificacao: 'nao_assessorada', estrelas: 0 }]);
  }

  function removerEmpresaClassificacaoCargo(index) {
    setEmpresaClassificacoesPorCargo((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarContatoRapido(e) {
    e.preventDefault();
    const emailsArr = contatoEmails.map((e) => String(e).trim()).filter(Boolean);
    const telsArr = contatoTelefones.map((t) => String(t).trim()).filter(Boolean);
    const cargosArr = contatoCargos.map((c) => c.trim()).filter(Boolean);
    const payload = {
      nome: contatoNome,
      cargos_json: cargosArr,
      emails_json: emailsArr,
      telefones_json: telsArr,
      empresa_id: empresaId || contatoSelecionado?.empresa_id,
      whatsapp_pessoal: contatoWhatsapp,
      nao_quero_email: contatoNaoQuerEmail,
      nao_quero_ligacao: contatoNaoQuerLigacao,
      congelado_ate: contatoCongeladoAte || null,
      observacoes: contatoObservacoes || null,
    };

    try {
      if (modoContatoModal === 'novo') {
        const res = await axios.post(`${API_URL}/contatos`, payload, getHeaders());
        const novo = res.data;
        const resC = await axios.get(`${API_URL}/contatos`, getHeaders());
        setContatos(resC.data);
        setContatosVinculadosIds((prev) => [...new Set([...prev, novo.id])]);
        setContatoId(String(novo.id));
        setBuscaContatoNoModal(novo.nome || contatoNome);
        fecharModalContato();
        alert('Contato criado e vinculado à negociação.');
      } else {
        await axios.put(`${API_URL}/contatos/${contatoSelecionado.id}`, payload, getHeaders());
        const resC = await axios.get(`${API_URL}/contatos`, getHeaders());
        setContatos(resC.data);
        setBuscaContatoNoModal(contatoNome);
        fecharModalContato();
        alert('Contato atualizado com sucesso!');
      }
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao salvar contato.');
    }
  }

  async function deletarContato(id) {
    if (!id) return;
    if (!window.confirm('A exclusão é permanente e não poderá ser desfeita. Deseja continuar?')) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      setContatos((prev) => prev.filter((c) => Number(c.id) !== Number(id)));
      setContatosVinculadosIds((prev) => prev.filter((cid) => Number(cid) !== Number(id)));
      if (String(contatoId) === String(id)) setContatoId('');
      if (contatoSelecionado && Number(contatoSelecionado.id) === Number(id)) {
        fecharModalContato();
      }
      // Recarrega funil para refletir remoção em oportunidades vinculadas
      if (filtroCampanha) carregarFunilDaCampanha(filtroCampanha);
    } catch (error) {
      alert(error.response?.data?.erro || 'Falha ao excluir contato.');
    }
  }

  function abrirDetalheEmpresa() {
    if (!empresaId) return;
    const emp = empresas.find(e => e.id === parseInt(empresaId));
    if (!emp) return;

    const classificacoesJson = emp.classificacoes_por_cargo_json;
    const classificacoesList = normalizarClassificacoesPorCargo(classificacoesJson || []);
    const scoring = resolverScoringEmpresa(
      {
        classificacoes_por_cargo_json: classificacoesList,
      },
      [],
      []
    );

    const classificacaoPadrao = emp.classificacao || scoring.classificacao || 'nao_assessorada';
    const estrelasPadrao = emp.estrelas != null && emp.estrelas !== ''
      ? Number(emp.estrelas)
      : (scoring.estrelas !== undefined ? scoring.estrelas : 0);

    setEmpresaSelecionada(emp);
    setEmpresaNome(emp.nome || '');
    setEmpresaEstado(emp.estado || '');
    setEmpresaCidade(emp.cidade || '');
    setEmpresaTelefones(emp.telefones || '');
    setEmpresaHorario(emp.horario_funcionamento || '');
    setEmpresaClassificacao(classificacaoPadrao);
    setEmpresaEstrelas(estrelasPadrao);
    setEmpresaAssessoradasCargos(
      classificacoesList.filter((item) => item.classificacao === 'assessorada').map((item) => item.cargo)
    );
    setEmpresaClassificacoesPorCargo(
      classificacoesList.length > 0
        ? classificacoesList
        : [{ cargo: '', classificacao: 'nao_assessorada', estrelas: 0 }]
    );

    setEditandoEmpresaRapida(false);
    setMostrarModalEmpresa(true);
  }

  async function salvarEmpresaRapido(e) {
    e.preventDefault();
    try {
      const classificacoesPorCargo = empresaClassificacoesPorCargo
        .map((item) => ({
          cargo: String(item.cargo || '').trim(),
          classificacao: item.classificacao || 'nao_assessorada',
          estrelas: Number(item.estrelas) || 0,
        }))
        .filter((item) => item.cargo);

      const scoring = resolverScoringEmpresa(
        { classificacoes_por_cargo_json: classificacoesPorCargo },
        [],
        []
      );

      await axios.put(`${API_URL}/empresas/${empresaSelecionada.id}`, {
        nome: empresaNome,
        estado: empresaEstado,
        cidade: empresaCidade,
        telefones: empresaTelefones,
        horario_funcionamento: empresaHorario,
        classificacoes_por_cargo_json: classificacoesPorCargo,
        classificacao: empresaClassificacao,
        estrelas: Number(empresaEstrelas) || 0,
      }, getHeaders());

      setMostrarModalEmpresa(false);
      const resE = await axios.get(`${API_URL}/empresas`, getHeaders());
      setEmpresas(resE.data);
      setBuscaEmpresaNoModal(empresaNome);
      alert('Empresa atualizada com sucesso!');
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao atualizar empresa.');
    }
  }

  function toggleModulo(id) {
    const numId = Number(id);
    setModulosSelecionados((prev) => {
      const arrNumeric = prev.map(Number);
      const next = arrNumeric.includes(numId) ? arrNumeric.filter((m) => m !== numId) : [...arrNumeric, numId];
      if (modoPacoteInscricao === 'igual') {
        setInscritos((lista) => lista.map((ins) => ({ ...ins, modulos_ids: [...next] })));
      }
      return next;
    });
  }

  function toggleContatoVinculado(id) {
    const numId = Number(id);
    setContatosVinculadosIds((prev) => {
      const next = prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId];
      if (!next.includes(Number(contatoId))) {
        setContatoId(next[0] ? String(next[0]) : '');
        setBuscaContatoNoModal(next[0] ? (contatos.find((c) => c.id === next[0])?.nome || '') : '');
      }
      return next;
    });
  }

  function ajustarQtdInscritos(qtd) {
    const n = Math.max(0, Number(qtd) || 0);
    setQtdInscritos(n);
    setInscritos((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(inscritoVazio(modulosSelecionados));
      const sliced = n > 0 ? next.slice(0, n) : [];
      return sliced.map((ins) => ({
        ...ins,
        modulos_ids: ins.modulos_ids?.length ? ins.modulos_ids : [...modulosSelecionados],
      }));
    });
  }

  function toggleModuloInscrito(indexInscrito, idModulo) {
    const numId = Number(idModulo);
    setInscritos((prev) => prev.map((ins, i) => {
      if (i !== indexInscrito) return ins;
      const atual = (ins.modulos_ids || []).map(Number);
      const next = atual.includes(numId)
        ? atual.filter((id) => id !== numId)
        : [...atual, numId];
      return { ...ins, modulos_ids: next };
    }));
  }

  function aplicarPacoteGlobalAosInscritos() {
    setInscritos((prev) => prev.map((ins) => ({ ...ins, modulos_ids: [...modulosSelecionados] })));
  }

  function atualizarInscrito(index, campo, valor) {
    setInscritos((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function preencherInscritoDoContato(index, contatoRefId) {
    const c = contatos.find((x) => x.id === Number(contatoRefId));
    if (!c) return;
    const emails = normalizarListaJson(c.emails_json, []);
    const tels = normalizarListaJson(c.telefones_json, []);
    const cargosLista = normalizarCargosJson(c.cargos_json, []);
    setInscritos((prev) => prev.map((item, i) => (i === index ? {
      ...item,
      nome: c.nome || '',
      email: emails[0] || '',
      telefone: tels[0] || '',
      cargo: cargosLista.join(' | ') || '',
      contato_id: c.id,
    } : item)));
  }

  function abrirModalNovo() {
    if (!filtroCampanha) return alert("Selecione uma campanha no topo da tela antes de criar uma negociação!");

    setEditandoId(null); setTitulo(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId(etapas.length > 0 ? etapas[0].id : '');
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

  function fecharModalPrincipal(recarregar = true) {
    liberarTravaOportunidade();
    setMostrarModal(false);
    setEditandoId(null);
    setTitulo(''); setValor(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId('');
    setVendedorId(''); setVendedorOriginal('');
    setDesconto(0); setDescontoReais(0);
    setModulosSelecionados([]);
    setBuscaEmpresaNoModal(''); setBuscaContatoNoModal(''); setNotas([]); setNovaNota(''); cancelarEdicaoNota();
    if (recarregar && filtroCampanha) carregarFunilDaCampanha(filtroCampanha, true);
  }

  async function abrirModalEdicao(op) {
    if (abrindoNegociacaoId) return; // já tem uma verificação de trava em andamento
    setAbrindoNegociacaoId(op.id);
    let trava;
    try {
      trava = await tentarAbrirTravaOportunidade(op.id);
    } finally {
      setAbrindoNegociacaoId(null);
    }
    if (!trava.ok) {
      alert(`Esta negociação está sendo atendida agora por ${trava.usuario_nome || 'outro usuário'}. Tente novamente em instantes.`);
      return;
    }

    setEditandoId(op.id); setTitulo(op.titulo); setValor(op.valor);
    setEmpresaId(op.empresa_id || '');
    if (!op.empresa_id) {
      setEmpresaTelefones('');
      setEmpresaHorario('');
    }
    const vinc = op.contatos_vinculados || [];
    const idsVinc = vinc.length ? vinc.map((c) => c.id) : (op.contato_id ? [op.contato_id] : []);
    setContatosVinculadosIds(idsVinc);
    const principal = vinc.find((c) => c.is_principal) || vinc[0];
    setContatoId(principal?.id || op.contato_id || '');
    const mods = parseJSONSeguro(op.modulos_ids, []).map(Number);
    setQtdInscritos(op.qtd_inscritos || 0);
    const listaInscritos = (op.inscritos_json && op.inscritos_json.length)
      ? op.inscritos_json.map((i) => ({
        ...inscritoVazio(mods),
        ...i,
        modulos_ids: (i.modulos_ids?.length ? i.modulos_ids : mods).map(Number).filter(Boolean),
      }))
      : (op.qtd_inscritos > 0
        ? Array.from({ length: op.qtd_inscritos }, () => inscritoVazio(mods))
        : []);
    setInscritos(listaInscritos);
    setModoPacoteInscricao(
      inscritosUsamModulosPorPessoa(listaInscritos, mods) ? 'por_inscrito' : 'igual'
    );
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto'); setMotivoPerda(op.motivo_perda || ''); setVendedorId(op.vendedor_id || '');
    setVendedorOriginal(op.vendedor_id || '');
    setDesconto(op.desconto || 0);

    // Lógica para resgatar os módulos e descobrir o desconto em Reais
    const sub = calcularTotaisPacote({
      modulosSelecionados: mods,
      modulosCampanha,
      qtdInscritos: op.qtd_inscritos || 0,
      inscritos: listaInscritos,
      modoPacote: inscritosUsamModulosPorPessoa(listaInscritos, mods) ? 'por_inscrito' : 'igual',
      desconto: 0,
      descontoReais: 0,
    }).subtotal;

    const descPerc = Number(op.desconto || 0);
    const valorComDescontoPerc = sub * (1 - (descPerc / 100));
    const diff = valorComDescontoPerc - Number(op.valor || 0);

    setDescontoReais(diff > 0.01 ? diff.toFixed(2) : 0);
    setModulosSelecionados(mods);

    setBuscaEmpresaNoModal(op.empresa_nome || ''); setBuscaContatoNoModal(op.contato_nome || '');
    setUltimaInteracao(op.ultima_interacao || null);
    setCooldownContato(0);
    setNotas([]); cancelarEdicaoNota(); carregarNotas(op.id);
    setHistoricoEmpresa([]); setNotasHistorico([]); setHistoricoOpSelecionada(null); setObservacoesEmpresa('');
    if (op.empresa_id) carregarHistoricoEmpresa(op.empresa_id, op.id);
    setMostrarModal(true);
  }

  async function registrarInteracao() {
    if (!editandoId || cooldownContato > 0) return;
    setSalvandoInteracao(true);
    try {
      const res = await axios.patch(`${API_URL}/oportunidades/${editandoId}/interacao`, {}, getHeaders());
      setUltimaInteracao(res.data.ultima_interacao);
      setOportunidades(prev => prev.map(o =>
        o.id === editandoId ? { ...o, ultima_interacao: res.data.ultima_interacao } : o
      ));
      // Uma ligação de verdade não se repete em segundos — trava o botão por
      // 1 min (mesmo cooldown do backend) pra clique duplo/repetido não inflar
      // a contagem de produtividade.
      setCooldownContato(60);
    } catch (e) {
      console.error('Erro ao registrar interação', e);
    } finally {
      setSalvandoInteracao(false);
    }
  }

  useEffect(() => {
    if (cooldownContato <= 0) return;
    const t = setTimeout(() => setCooldownContato((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownContato]);

  async function adicionarMotivo() {
    if (!novoMotivoNome.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/motivos-perda`, { nome: novoMotivoNome.trim() }, getHeaders());
      setMotivosPerda(prev => [...prev, res.data]);
      setNovoMotivoNome('');
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao adicionar motivo.');
    }
  }

  async function salvarEdicaoMotivo(id) {
    if (!editandoMotivoNome.trim()) return;
    try {
      const res = await axios.put(`${API_URL}/motivos-perda/${id}`, { nome: editandoMotivoNome.trim() }, getHeaders());
      setMotivosPerda(prev => prev.map(m => m.id === id ? res.data : m));
      setEditandoMotivoId(null);
      setEditandoMotivoNome('');
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao renomear motivo.');
    }
  }

  async function excluirMotivo(id) {
    try {
      await axios.delete(`${API_URL}/motivos-perda/${id}`, getHeaders());
      setMotivosPerda(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir motivo.');
    }
  }

  async function salvarOportunidade(e) {
    e.preventDefault();
    if (salvandoOportunidade) return; // evita clique duplo/reenvio enquanto já está salvando
    const usaCalculoModulos = modulosSelecionados.length > 0
      || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0);
    const valorEnviar = usaCalculoModulos
      ? valorFinalCalculado
      : (valor ? parseFloat(valor.toString().replace(/\./g, '').replace(',', '.')) : 0);

    if (!empresaId) {
      alert('Selecione a prefeitura/empresa da negociação.');
      return;
    }
    if (contatosVinculadosIds.length === 0) {
      alert('Vincule pelo menos um contato da prefeitura.');
      return;
    }
    if (statusOp === 'perdido' && !motivoPerda.trim()) {
      alert('Informe o motivo da perda para registrar como Perdido.');
      return;
    }

    const tituloFinal = titulo.trim() || `Negociação - ${buscaEmpresaNoModal || 'Órgão'}`;
    const inscritosSalvar = inscritos
      .slice(0, Math.max(qtdInscritos, inscritos.length))
      .map((ins) => ({
        ...ins,
        modulos_ids: modoPacoteInscricao === 'por_inscrito'
          ? (ins.modulos_ids?.length ? ins.modulos_ids : modulosSelecionados).map(Number).filter(Boolean)
          : [...modulosSelecionados.map(Number).filter(Boolean)],
      }))
      .filter((i) => i.nome || i.email);

    const modulosGravacao = modoPacoteInscricao === 'por_inscrito'
      ? uniaoModulosInscritos(modulosSelecionados, inscritosSalvar)
      : modulosSelecionados.map(Number).filter(Boolean);

    const dados = {
      titulo: tituloFinal,
      valor: valorEnviar,
      empresa_id: empresaId || null,
      contato_id: contatoId || contatosVinculadosIds[0] || null,
      contatos_ids: contatosVinculadosIds,
      qtd_inscritos: qtdInscritos,
      inscritos_json: inscritosSalvar,
      etapa_id: etapaId,
      observacoes,
      campanha_id: filtroCampanha,
      status: statusOp,
      motivo_perda: statusOp === 'perdido' ? motivoPerda : null,
      vendedor_id: vendedorId || null,
      modulos_ids: modulosGravacao,
      desconto: modulosSelecionados.length > 0 ? Number(desconto) : 0,
    };

    setSalvandoOportunidade(true);
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
      if (empresaId) {
        await axios.patch(`${API_URL}/empresas/${empresaId}/observacoes`, { observacoes: observacoesEmpresa }, getHeaders());
      }
      fecharModalPrincipal();
    } catch (erro) {
      console.error('Erro ao salvar oportunidade.', erro);
      const msg = [erro.response?.data?.erro, erro.response?.data?.detalhe].filter(Boolean).join(' — ');
      if (!erro.sessaoExpirada) alert(msg || 'Erro ao salvar oportunidade.');
    } finally {
      setSalvandoOportunidade(false);
    }
  }

  async function deletarOportunidade() {
    if (!window.confirm('Excluir este negócio? O histórico de notas também será apagado.')) return;
    try {
      await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders());
      fecharModalPrincipal();
    } catch (error) { alert("Falha ao excluir o negócio."); }
  }

  const formatarMoeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarTelefoneParaLink = (t) => t ? t.replace(/[^0-9]/g, '') : '';
  const formatarTelefoneParaExibir = (t) => {
    const digits = t ? String(t).replace(/[^0-9]/g, '') : '';
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length > 0) return t.trim();
    return '-';
  };
  const formatarData = (value) => {
    if (!value) return '-';
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return value;
    return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };
  const formatarDataHora = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    const dLocal = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const hojeLocal = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const ontemLocal = ontem.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    if (dLocal === hojeLocal) return `Hoje às ${hora}`;
    if (dLocal === ontemLocal) return `Ontem às ${hora}`;
    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })} às ${hora}`;
  };
  const calcularDiasRestantes = (value) => {
    if (!value) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(value);
    data.setHours(0, 0, 0, 0);
    const diff = Math.ceil((data - hoje) / 86400000);
    return Number.isFinite(diff) ? diff : null;
  };
  const adicionarDias = (dias) => {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
  };
  const estaCongelado = (value) => {
    if (!value) return false;
    return new Date(value) > new Date();
  };
  const contatosComDescongelamentoProximo = useMemo(() => {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    return contatos
      .filter((contato) => contato.congelado_ate && contato.congelado_ate !== null)
      .filter((contato) => {
        const data = new Date(contato.congelado_ate);
        return data > hoje && data <= limite && (contato.nao_quero_email || contato.nao_quero_ligacao);
      })
      .sort((a, b) => new Date(a.congelado_ate) - new Date(b.congelado_ate));
  }, [contatos]);

  const telefonePrincipalPrefeitura = empresaTelefones
    ? empresaTelefones.split(',').map((tel) => tel.trim()).find(Boolean)
    : '';

  const filtrosAtivosCount = [filtroEstado, filtroVendedor, filtroFaixaAlfabetica, filtroEstrelasMin > 0 ? 'x' : '']
    .filter(Boolean).length;

  return (
    <PageContainer>
      <TopSection>
        <div>
          <Title>Gestão de Pipeline</Title>

        </div>

        <ActionsContainer>
          <SearchInputWrapper ref={buscaWrapperRef}>
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Buscar cliente, prefeitura..."
              value={buscaGeral}
              onFocus={() => setMostrarSugestoesBusca(true)}
              onChange={e => { setBuscaGeral(e.target.value); setMostrarSugestoesBusca(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  registrarBuscaGeral(buscaGeral);
                  setMostrarSugestoesBusca(true);
                }
              }}
            />
            {mostrarSugestoesBusca && (sugestoesBusca.length > 0 || historicoBuscaGeral.length > 0) && (
              <SugestoesBusca>
                {buscaGeral.trim() === '' && historicoBuscaGeral.length > 0 ? (
                  <>
                    <SugestaoItem className="no-results" type="button" disabled>
                      Últimas buscas
                    </SugestaoItem>
                    {historicoBuscaGeral.map((termo, idx) => (
                      <SugestaoItem
                        key={`hist-${idx}`}
                        type="button"
                        onClick={() => {
                          setBuscaGeral(termo);
                          registrarBuscaGeral(termo);
                          setMostrarSugestoesBusca(true);
                        }}
                      >
                        <div className="linha1">
                          <strong>{termo}</strong>
                        </div>
                      </SugestaoItem>
                    ))}
                  </>
                ) : (
                  sugestoesBusca.map((op) => (
                    <SugestaoItem
                      key={op.id}
                      type="button"
                      onClick={() => {
                        registrarBuscaGeral(buscaGeral);
                        setMostrarSugestoesBusca(false);
                        setBuscaGeral('');
                        abrirModalEdicao(op);
                      }}
                    >
                      <div className="linha1">
                        <strong>{op.empresa_nome || op.titulo || 'Negociação'}</strong>
                        {op.empresa_estado && <span className="uf">{String(op.empresa_estado).toUpperCase()}</span>}
                      </div>
                      <div className="linha2">
                        <span className="sub">{op.titulo || '—'}</span>
                        {op.contato_nome && <span className="sub"> · {op.contato_nome}</span>}
                      </div>
                    </SugestaoItem>
                  ))
                )}
              </SugestoesBusca>
            )}
          </SearchInputWrapper>

          <FilterPillWrapper ref={dropdownCampanhaRef}>
            <FilterButton
              $hasValue={!!filtroCampanha}
              onClick={() => setDropdownCampanhaAberto(!dropdownCampanhaAberto)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-layer-group icon"></i>
                <span>Campanha: <strong>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    {campanhaSelecionadaObj ? (
                      <>
                        {campanhaSelecionadaObj.nome.split(' ').slice(0, 2).join(' ') + ' ...'}
                        {campanhaSelecionadaObj.apenas_admin && <span style={{ marginLeft: '8px', color: '#dc3545', fontSize: '0.8rem' }}><i className="fa-solid fa-lock"></i> </span>}
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
                    {c.apenas_admin && <span style={{ marginLeft: '8px', color: '#dc3545', fontSize: '0.75rem', fontWeight: 'bold' }}><i className="fa-solid fa-lock"></i> </span>}
                    {c.arquivada && <span style={{ marginLeft: '8px', color: '#6c757d', fontSize: '0.75rem' }}>(Arquivada)</span>}
                  </CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>

          {filtroCampanha && (
            <FilterToggleButton
              type="button"
              $hasValue={filtrosAtivosCount > 0}
              onClick={() => setFiltrosAbertos(true)}
            >
              <i className="fa-solid fa-filter"></i>
              Filtros
              {filtrosAtivosCount > 0 && <FiltrosBadge>{filtrosAtivosCount}</FiltrosBadge>}
            </FilterToggleButton>
          )}
          {filtroCampanha && (
            <BotaoExportar
              tipo="oportunidades"
              params={{
                campanha_id: filtroCampanha,
                estado: filtroEstado || undefined,
              }}
              label="Exportar "
            />
          )}

          {filtroCampanha && (
            <DiagnosticoBtn onClick={() => { setMostrarModalDiagnostico(true); carregarDiagnostico(); }}>
              <i className="fa-solid fa-chart-pie"></i> Diagnóstico
            </DiagnosticoBtn>
          )}

          {filtroCampanha && (
            <PrimaryButton onClick={abrirModalNovo} className="btn-novo">
              <i className="fa-solid fa-plus-circle"></i> Nova Negociação
            </PrimaryButton>
          )}
        </ActionsContainer>
        {contatosComDescongelamentoProximo.length > 0 && (
          <AlertBanner>
            <strong>Alerta de descongelamento:</strong> {contatosComDescongelamentoProximo.length} cliente(s) marcaram que não querem e-mail ou ligação e estão prestes a sair do congelamento.
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {contatosComDescongelamentoProximo.slice(0, 3).map((contato) => (
                <span key={contato.id} style={{ background: '#f8fafc', color: '#0f172a', padding: '6px 10px', borderRadius: '999px', border: '1px solid #cbd5e1' }}>
                  {contato.nome} &mdash; {formatarData(contato.congelado_ate)}
                </span>
              ))}
            </div>
          </AlertBanner>
        )}
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

            const totalValorColuna = cardsDestaColuna.reduce((acc, op) => acc + (parseFloat(op.valor) || 0), 0);

            return (
              <KanbanColumn key={etapa.id}>
                <ColumnHeader>
                  <div className="header-top">
                    <span className="title">{etapa.nome}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BotaoExportar
                        compact
                        tipo="oportunidades"
                        params={{
                          campanha_id: filtroCampanha,
                          etapa_id: etapa.id,
                          estado: filtroEstado || undefined,
                        }}
                      />
                      <span className="badge">{cardsDestaColuna.length}</span>
                    </div>
                  </div>
                  {totalValorColuna > 0 && (
                    <div className="column-total">
                      {totalValorColuna.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                </ColumnHeader>

                <CardsContainer>
                  {cardsDestaColuna.map(op => {
                    let statusConfig = { border: '#cbd5e1', bg: '#ffffff' };
                    if (op.status === 'naofunciona') statusConfig = { border: '#f1c40f', bg: '#fff9db' };
                    if (op.status === 'naoatendeu') statusConfig = { border: '#e67e22', bg: '#fff4e6' };
                    if (op.status === 'ganho') statusConfig = { border: '#0e3115', bg: '#e7f3ff' };
                    if (op.status === 'interessada') statusConfig = { border: '#36ad52', bg: '#e7f3ff' };
                    if (op.status === 'avaliar') statusConfig = { border: '#9fe069', bg: '#e9f7ef' };
                    if (op.status === 'perdido') statusConfig = { border: '#dc3545', bg: '#fdecea' };

                    const idsModsCard = parseJSONSeguro(op.modulos_ids, []).map(Number);
                    const nomesModsCard = idsModsCard.map(id => {
                      const m = modulosCampanha.find(mod => Number(mod.id) === id);
                      return m ? m.nome : null;
                    }).filter(Boolean);

                    const carregandoEstaNegociacao = abrindoNegociacaoId === op.id;
                    return (
                      <KanbanCard
                        key={op.id}
                        className="kanban-card"
                        $status={statusConfig}
                        onClick={() => abrirModalEdicao(op)}
                        style={{
                          opacity: carregandoEstaNegociacao ? 0.6 : 1,
                          cursor: abrindoNegociacaoId ? 'wait' : 'pointer',
                          position: 'relative',
                        }}
                      >
                        {carregandoEstaNegociacao && (
                          <div style={{ position: 'absolute', top: 8, right: 8, color: '#3b82f6' }}>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          </div>
                        )}
                        <div className="card-header">
                          <div className="card-title">{op.titulo}</div>
                          {op.estrelas > 0 && (
                            <div className="stars" title={`Temperatura: ${op.estrelas} Estrelas`}>
                              {[1, 2, 3, 4, 5].map(n => <i key={n} className={`fa-solid fa-star ${n <= op.estrelas ? 'active' : ''}`}></i>)}
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
                            {(op.contatos_vinculados?.length > 0) && (
                              <span style={{ fontSize: '0.72rem' }}>· {op.contatos_vinculados.length} cont.</span>
                            )}
                            {(op.qtd_inscritos > 0) && (
                              <span style={{ fontSize: '0.72rem', color: '#198754' }}>· {op.qtd_inscritos} insc.</span>
                            )}
                            {(op.classificacao === 'assessorada' || (op.assessoradasCargos?.length > 0)) && (
                              <span className="badge-vip" title={op.assessoradasCargos?.length ? `Assessorada em ${op.assessoradasCargos.join(', ')}` : 'Órgão Assessorado VIP'}>
                                <i className="fa-solid fa-crown"></i>
                                {op.assessoradasCargos?.length ? op.assessoradasCargos.join(', ') : 'Assessorada'}
                              </span>
                            )}
                            {op.classificacao === 'lead_quente' && <span className="badge-hot" title="Lead Quente e Engajado"><i className="fa-solid fa-fire"></i></span>}
                            {(op.classificacao === 'nao_assessorada' || !op.classificacao) && <span className="badge-cold" title="Lead Frio"><i className="fa-solid fa-snowflake text-blue"></i></span>}
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
                        {op.diasNaEtapa >= 7 && (
                          <RottingBadge $critico={op.diasNaEtapa >= 14}>
                            <i className={op.diasNaEtapa >= 14 ? 'fa-solid fa-circle-exclamation' : 'fa-regular fa-clock'}></i>
                            {op.diasNaEtapa} {op.diasNaEtapa >= 14 ? 'dias parado' : 'dias'}
                          </RottingBadge>
                        )}
                        {op.foraDoHorario === true && (
                          <RottingBadge title="Fora do horário de atendimento deste órgão — ligar agora pode ser em vão">
                            <i className="fa-solid fa-moon"></i> Fora de horário
                          </RottingBadge>
                        )}
                        {op.ultima_interacao && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-phone" style={{ color: '#94a3b8', fontSize: '0.65rem' }}></i>
                            {formatarDataHora(op.ultima_interacao)}
                          </div>
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

      {/* MODAL DIAGNÓSTICO DE NEGOCIAÇÕES */}
      {filtrosAbertos && (
        <ModalOverlay onClick={() => setFiltrosAbertos(false)}>
          <ModalContent $small onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <ModalHeader>
              <h3><i className="fa-solid fa-filter" style={{ color: '#3b82f6' }}></i> Filtros</h3>
              <CloseButton onClick={() => setFiltrosAbertos(false)}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody style={{ padding: '20px' }}>
              <FiltroModalCampo>
                <label><i className="fa-solid fa-map-location-dot"></i> Estado</label>
                <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">Todos os Estados</option>
                  {UFS_BRASIL.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </Select>
              </FiltroModalCampo>

              {equipe.length > 0 && (
                <FiltroModalCampo>
                  <label><i className="fa-solid fa-user-tie"></i> Vendedor</label>
                  <Select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)}>
                    <option value="">Todos os Vendedores</option>
                    {equipe.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </Select>
                </FiltroModalCampo>
              )}

              <FiltroModalCampo>
                <label><i className="fa-solid fa-arrow-down-a-z"></i> Faixa alfabética</label>
                <Select value={filtroFaixaAlfabetica} onChange={(e) => setFiltroFaixaAlfabetica(e.target.value)}>
                  <option value="">Todas as Faixas</option>
                  {FAIXAS_ALFABETICAS.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                </Select>
                <span className="ajuda">Divide a carteira pela letra inicial da cidade do órgão (não pelo nome, que quase sempre começa com "Prefeitura"/"Câmara") — combine com Vendedor para separar quem trabalha cada faixa.</span>
              </FiltroModalCampo>

              <FiltroModalCampo>
                <label><i className="fa-solid fa-star"></i> Estrelas mínimas</label>
                <Select value={filtroEstrelasMin} onChange={(e) => setFiltroEstrelasMin(Number(e.target.value))}>
                  <option value={0}>Todas</option>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ou mais</option>)}
                </Select>
              </FiltroModalCampo>

              <FiltroModalRodape>
                <SecondaryButton
                  type="button"
                  onClick={() => { setFiltroEstado(''); setFiltroVendedor(''); setFiltroFaixaAlfabetica(''); setFiltroEstrelasMin(0); }}
                >
                  Limpar filtros
                </SecondaryButton>
                <PrimaryButton type="button" onClick={() => setFiltrosAbertos(false)}>Aplicar</PrimaryButton>
              </FiltroModalRodape>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {mostrarModalDiagnostico && (
        <ModalOverlay onClick={() => setMostrarModalDiagnostico(false)}>
          <ModalContent $small onClick={e => e.stopPropagation()} style={{ maxWidth: 780 }}>
            <ModalHeader>
              <h3><i className="fa-solid fa-chart-pie" style={{ color: '#3b82f6' }}></i> Diagnóstico de Negociações — {campanhaSelecionadaObj?.nome}</h3>
              <CloseButton onClick={() => setMostrarModalDiagnostico(false)}>&times;</CloseButton>
            </ModalHeader>

            <ModalBody style={{ padding: '16px 20px' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <DiagTab $active={abaDiagnostico === 'criadas'} onClick={() => setAbaDiagnostico('criadas')}>
                  <i className="fa-solid fa-circle-check"></i> Criadas ({diagnostico.com_negociacao.length})
                </DiagTab>
                <DiagTab $active={abaDiagnostico === 'nao_criadas'} onClick={() => setAbaDiagnostico('nao_criadas')}>
                  <i className="fa-solid fa-circle-xmark"></i> Não Criadas ({diagnostico.sem_negociacao.length})
                </DiagTab>
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <DiagInput
                  type="text"
                  placeholder="Buscar por nome..."
                  value={buscaDiagnostico}
                  onChange={e => setBuscaDiagnostico(e.target.value)}
                />
                <DiagSelect
                  value={estadoDiagnostico}
                  onChange={e => { setEstadoDiagnostico(e.target.value); carregarDiagnostico(e.target.value); }}
                >
                  <option value="">Todos os estados</option>
                  {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </DiagSelect>
              </div>

              {carregandoDiagnostico ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Carregando...
                </div>
              ) : (() => {
                const lista = abaDiagnostico === 'criadas'
                  ? diagnostico.com_negociacao
                  : diagnostico.sem_negociacao;
                const termo = normalizarTexto(buscaDiagnostico);
                const filtrada = termo
                  ? lista.filter(r => normalizarTexto(r.empresa_nome || '').includes(termo))
                  : lista;

                if (!filtrada.length) return (
                  <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
                    Nenhum resultado encontrado.
                  </div>
                );

                return (
                  <DiagTabela>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Órgão</th>
                        <th>UF</th>
                        {abaDiagnostico === 'criadas' ? (
                          <>
                            <th>Status</th>
                            <th>Etapa</th>
                          </>
                        ) : (
                          <>
                            <th>Contatos</th>
                            <th>Com cargo</th>
                            <th>Motivo</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((row, i) => (
                        <tr key={row.empresa_id}>
                          <td style={{ color: '#999', fontSize: '0.78rem' }}>{i + 1}</td>
                          <td><strong>{row.empresa_nome}</strong></td>
                          <td><span style={{ background: '#e2e8f0', borderRadius: 4, padding: '2px 6px', fontSize: '0.78rem', fontWeight: 600 }}>{row.estado}</span></td>
                          {abaDiagnostico === 'criadas' ? (
                            <>
                              <td><DiagStatusBadge $status={row.status}>{row.status}</DiagStatusBadge></td>
                              <td style={{ fontSize: '0.82rem', color: '#555' }}>{row.etapa_nome || '—'}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ textAlign: 'center' }}>{row.total_contatos}</td>
                              <td style={{ textAlign: 'center' }}>{row.contatos_com_cargo}</td>
                              <td><DiagMotivoTag $motivo={motivoDiagnostico(row)}>{motivoDiagnostico(row)}</DiagMotivoTag></td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </DiagTabela>
                );
              })()}
            </ModalBody>

            <ModalFooter>
              <span style={{ fontSize: '0.82rem', color: '#888' }}>
                {abaDiagnostico === 'criadas'
                  ? `${diagnostico.com_negociacao.length} negociações criadas`
                  : `${diagnostico.sem_negociacao.length} empresas sem negociação`}
              </span>
              <button
                type="button"
                onClick={exportarDiagnosticoCsv}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <i className="fa-solid fa-file-csv"></i> Exportar CSV
              </button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* MODAL DE EDIÇÃO DE OPORTUNIDADE E SUB-MODAIS */}
      {mostrarModal && (
        <ModalOverlay>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                <div className="subtitle" title={campanhaSelecionadaObj?.nome}>
                  <i className="fa-solid fa-bullhorn"></i> Vinculado à campanha: {campanhaSelecionadaObj?.nome}
                </div>
              </div>
              <CloseButton onClick={() => fecharModalPrincipal()}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={salvarOportunidade} style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
              <ModalBody>
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
                      <option value="naoatendeu">🟠 Não Atendeu</option>
                      <option value="naofunciona">🟡 Não Funciona</option>
                      <option value="perdido">🔴 Perdido</option>
                    </Select>
                  </FormGroup>
                </FormGrid>

                {statusOp === 'perdido' && (
                  <FormGroup style={{ marginTop: '10px' }}>
                    <label style={{ color: '#dc3545', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔴 Motivo da Perda *
                      <button
                        type="button"
                        onClick={() => setMostrarModalMotivos(true)}
                        style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccc', background: '#f8f9fa', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-gear"></i> Gerenciar
                      </button>
                    </label>
                    <Select
                      required
                      value={motivoPerda}
                      onChange={(e) => setMotivoPerda(e.target.value)}
                      style={{ border: '1px solid #f5c6cb', background: '#fff5f5' }}
                    >
                      <option value="">Selecione o motivo...</option>
                      {motivosPerda.map(m => (
                        <option key={m.id} value={m.nome}>{m.nome}</option>
                      ))}
                    </Select>
                  </FormGroup>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 4px' }}>
                  <button
                    type="button"
                    onClick={registrarInteracao}
                    disabled={salvandoInteracao || cooldownContato > 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: (salvandoInteracao || cooldownContato > 0) ? '#e0eaff' : '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.85rem', cursor: (salvandoInteracao || cooldownContato > 0) ? 'not-allowed' : 'pointer' }}
                  >
                    <i className="fa-solid fa-phone"></i>
                    {salvandoInteracao ? 'Salvando...' : cooldownContato > 0 ? `Aguarde ${cooldownContato}s` : 'Registrar Contato Agora'}
                  </button>
                  {ultimaInteracao && (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Último: <strong>{formatarDataHora(ultimaInteracao)}</strong>
                    </span>
                  )}
                </div>

                <SectionCard style={{ marginTop: '15px' }}>
                  <FormGrid $columns="1fr 1fr">
                    <FormGroup>
                      <label><i className="fa-solid fa-building text-blue"></i> Órgão Alvo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <AutocompleteContainer ref={dropdownEmpresaRef} style={{ flex: 1 }}>
                          <Input
                            type="text"
                            placeholder="🔍 Buscar..."
                            value={buscaEmpresaNoModal}
                            onFocus={() => setMostrarDropdownEmpresa(true)}
                            onChange={(e) => {
                              setBuscaEmpresaNoModal(e.target.value); setMostrarDropdownEmpresa(true);
                              if (e.target.value === '') { setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setBuscaContatoNoModal(''); }
                            }}
                          />
                          {mostrarDropdownEmpresa && (
                            <AutocompleteList>
                              <AutocompleteOption className="danger" onClick={() => { setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setBuscaEmpresaNoModal(''); setContatoId(''); setBuscaContatoNoModal(''); setMostrarDropdownEmpresa(false); }}>
                                <i className="fa-solid fa-eraser"></i> Limpar Seleção
                              </AutocompleteOption>
                              {!buscaEmpresaNoModal.trim() && ultimasEmpresasPesquisadas.length > 0 && (
                                <AutocompleteOption className="no-results">Últimas pesquisadas</AutocompleteOption>
                              )}
                              {empresasFiltradasParaSelect.map(emp => (
                                <AutocompleteOption key={emp.id} onClick={() => {
                                  setEmpresaId(emp.id);
                                  setBuscaEmpresaNoModal(emp.nome);
                                  setMostrarDropdownEmpresa(false);
                                  setUltimasEmpresasPesquisadas((prev) => [emp.id, ...prev.filter((id) => id !== emp.id)].slice(0, 5));
                                }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', margin: '10px' }}>
                        {empresaId && telefonePrincipalPrefeitura && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                            <i className="fa-solid fa-phone"></i>
                            {formatarTelefoneParaExibir(telefonePrincipalPrefeitura)}
                          </span>
                        )}
                        {empresaId && empresaHorario && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                            <i className="fa-solid fa-clock"></i>
                            {empresaHorario}
                            {estaForaDoHorario(empresaHorario) === true && (
                              <span style={{ color: '#b45309', background: '#fff4e5', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-moon"></i> Fora de horário agora
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </FormGroup>

                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-note-sticky" style={{ color: '#d97706' }}></i> Observações do Órgão <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#92400e' }}>(visível em todas as negociações deste órgão)</span></label>
                      <TextArea
                        value={observacoesEmpresa}
                        onChange={(e) => setObservacoesEmpresa(e.target.value)}
                        onBlur={() => { if (empresaId) salvarObservacoesEmpresa(); }}
                        rows="3"
                        placeholder="Resultado do contato, próximos passos, pendências..."
                        disabled={!empresaId}
                        style={{ resize: 'vertical', minHeight: 72, background: '#fffbeb', borderColor: '#fcd34d', opacity: empresaId ? 1 : 0.5 }}
                      />
                      {!empresaId && <small style={{ color: '#94a3b8' }}>Vincule uma prefeitura para habilitar este campo.</small>}
                    </FormGroup>

                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-users text-green"></i> Contatos vinculados à negociação</label>
                      {!empresaId ? (
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Selecione a prefeitura para listar os contatos.</p>
                      ) : (
                        <>
                          {contatosDisponiveisDaEmpresa.length === 0 ? (
                            <>
                              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px' }}>
                                Nenhum contato disponível nesta prefeitura para vincular — todos os contatos estão congelados ou indisponíveis.
                              </p>
                              {contatosDaEmpresa.length > 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0' }}>
                                  {contatosDaEmpresa.length} contato(s) cadastrado(s), mas nenhum está disponível no momento.
                                </p>
                              )}
                            </>
                          ) : (
                            <ContatosNegociacaoLista>
                              {contatosDisponiveisDaEmpresa.map((cont) => {
                                const vinculado = contatosVinculadosIds.includes(cont.id);
                                const isPrincipal = Number(contatoId) === cont.id;
                                const contatoNumeroPrincipal = cont.whatsapp_pessoal
                                  ? cont.whatsapp_pessoal
                                  : (cont.telefones_json && cont.telefones_json.length ? cont.telefones_json[0] : '');
                                const outrosTelefones = cont.telefones_json && cont.telefones_json.length > 1 ? cont.telefones_json.length - 1 : 0;

                                return (
                                  <ContatoNegociacaoRow key={cont.id} $vinculado={vinculado}>
                                    <label >
                                      <input
                                        type="checkbox"
                                        checked={vinculado}
                                        onChange={() => toggleContatoVinculado(cont.id)}
                                      />
                                    </label>
                                    <span className="info check-wrap">
                                      <div className="name-row">
                                        <strong>{cont.nome}</strong>

                                        {contatoNumeroPrincipal && (
                                          <small className="main-phone">
                                            <i className="fa-solid fa-phone"> </i> {formatarTelefoneParaExibir(contatoNumeroPrincipal)}
                                            <p>+ {outrosTelefones} outro(s)</p>
                                          </small>
                                        )}
                                      </div>
                                      <small>{cargosParaTexto(cont.cargos_json) || 'Sem cargo'}</small>
                                      {outrosTelefones > 0 && (
                                        <small style={{ color: '#475569' }}>

                                        </small>
                                      )}
                                      {isPrincipal && vinculado && (
                                        <span className="badge-principal"><i className="fa-solid fa-star" /> Principal</span>
                                      )}
                                      {cont.observacoes && (
                                        <small style={{ display: 'block', marginTop: 4, padding: '4px 8px', background: '#fffbeb', color: '#92400e', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                                          <i className="fa-solid fa-note-sticky"></i> {cont.observacoes}
                                        </small>
                                      )}
                                    </span>

                                    <ContatoNegociacaoAcoes>
                                      {cont.whatsapp_pessoal && (
                                        <IconButton
                                          as="a"
                                          href={`https://wa.me/55${cont.whatsapp_pessoal.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={`WhatsApp: ${cont.whatsapp_pessoal}`}
                                          className="whatsapp"
                                        >
                                          <i className="fa-brands fa-whatsapp" />
                                        </IconButton>
                                      )}
                                      <IconButton
                                        type="button"
                                        title="Editar contato"
                                        onClick={() => abrirEditarContato(cont)}
                                      >
                                        <i className="fa-solid fa-pen" />
                                      </IconButton>
                                      <IconButton
                                        type="button"
                                        className="danger"
                                        title="Excluir contato"
                                        onClick={() => deletarContato(cont.id)}
                                      >
                                        <i className="fa-solid fa-trash" />
                                      </IconButton>
                                      {vinculado && !isPrincipal && (
                                        <IconButton
                                          type="button"
                                          title="Definir como contato principal"
                                          onClick={() => definirContatoPrincipal(cont.id)}
                                        >
                                          <i className="fa-solid fa-star" />
                                        </IconButton>
                                      )}
                                    </ContatoNegociacaoAcoes>
                                  </ContatoNegociacaoRow>
                                );
                              })}
                            </ContatosNegociacaoLista>
                          )}
                          <BtnNovoContato type="button" onClick={abrirNovoContato}>
                            <i className="fa-solid fa-user-plus" /> Novo contato nesta prefeitura
                          </BtnNovoContato>
                        </>
                      )}
                    </FormGroup>

                    <FormGroup>
                      <label><i className="fa-solid fa-graduation-cap text-purple"></i> Qtd. pessoas inscritas no curso</label>
                      <Input
                        type="number"
                        min="0"
                        value={qtdInscritos}
                        onChange={(e) => ajustarQtdInscritos(e.target.value)}
                        placeholder="Ex: 4"
                      />
                    </FormGroup>
                  </FormGrid>

                  {qtdInscritos >= 2 && modulosCampanha.length > 0 && (
                    <ModoPacoteBox style={{ marginTop: 12 }}>
                      <label>
                        <input
                          type="radio"
                          name="modoPacote"
                          checked={modoPacoteInscricao === 'igual'}
                          onChange={() => {
                            setModoPacoteInscricao('igual');
                            aplicarPacoteGlobalAosInscritos();
                          }}
                        />
                        <span>
                          <strong>Mesmo pacote para todos</strong>
                          <small>Subtotal = soma dos módulos × {fatorInscritos} inscrito(s)</small>
                        </span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="modoPacote"
                          checked={modoPacoteInscricao === 'por_inscrito'}
                          onChange={() => setModoPacoteInscricao('por_inscrito')}
                        />
                        <span>
                          <strong>Módulo diferente por pessoa</strong>
                          <small>Ex.: contato 1 no módulo A, contato 2 no módulo B…</small>
                        </span>
                      </label>
                    </ModoPacoteBox>
                  )}
                </SectionCard>

                {qtdInscritos > 0 && (
                  <SectionCard $bgColor="#f8fafc" $borderColor="#cbd5e1">
                    <label style={{ display: 'block', marginBottom: 12, fontWeight: 'bold', fontSize: '0.95rem' }}>
                      <i className="fa-solid fa-id-card text-blue"></i> Dados de cada inscrito no curso
                    </label>
                    {inscritos.map((ins, idx) => (
                      <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong>Inscrito {idx + 1}</strong>
                          {contatosVinculadosIds.length > 0 && (
                            <Select
                              style={{ maxWidth: 220, fontSize: '0.8rem' }}
                              value={ins.contato_id || ''}
                              onChange={(e) => preencherInscritoDoContato(idx, e.target.value)}
                            >
                              <option value="">Preencher da base...</option>
                              {contatosVinculadosIds.map((idV) => {
                                const c = contatos.find((x) => x.id === idV);
                                return c ? <option key={c.id} value={c.id}>{c.nome}</option> : null;
                              })}
                            </Select>
                          )}
                        </div>
                        <FormGrid $columns="1fr 1fr">
                          <FormGroup>
                            <label>Nome</label>
                            <Input value={ins.nome} onChange={(e) => atualizarInscrito(idx, 'nome', e.target.value)} />
                          </FormGroup>
                          <FormGroup>
                            <label>E-mail</label>
                            <Input value={ins.email} onChange={(e) => atualizarInscrito(idx, 'email', e.target.value)} />
                          </FormGroup>
                          <FormGroup>
                            <label>Telefone</label>
                            <Input value={ins.telefone} onChange={(e) => atualizarInscrito(idx, 'telefone', e.target.value)} />
                          </FormGroup>
                          <FormGroup>
                            <label>Cargo</label>
                            <Input value={ins.cargo} onChange={(e) => atualizarInscrito(idx, 'cargo', e.target.value)} />
                          </FormGroup>
                          <FormGroup className="span-2">
                            <label>Formação</label>
                            <Input value={ins.formacao} onChange={(e) => atualizarInscrito(idx, 'formacao', e.target.value)} />
                          </FormGroup>
                        </FormGrid>
                        {modoPacoteInscricao === 'por_inscrito' && modulosCampanha.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#198754', display: 'block', marginBottom: 6 }}>
                              Turmas deste inscrito
                              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                                ({formatarMoeda(somarValorModulos(ins.modulos_ids, modulosCampanha))})
                              </span>
                            </label>
                            <ModulesGrid $compact>
                              {modulosCampanha.map((mod) => {
                                const sel = (ins.modulos_ids || []).map(Number).includes(Number(mod.id));
                                return (
                                  <ModuleCard
                                    key={mod.id}
                                    $active={sel}
                                    $compact
                                    onClick={() => toggleModuloInscrito(idx, mod.id)}
                                  >
                                    <div className={`custom-checkbox ${sel ? 'active' : ''}`}>
                                      {sel && <i className="fa-solid fa-check" />}
                                    </div>
                                    <div className="mod-info">
                                      <span className="mod-name">{mod.nome}</span>
                                      <span className="mod-price">{formatarMoeda(mod.valor)}</span>
                                    </div>
                                  </ModuleCard>
                                );
                              })}
                            </ModulesGrid>
                          </div>
                        )}
                      </div>
                    ))}
                  </SectionCard>
                )}

                <SectionCard $bgColor="#f4fbf5" $borderColor="#c3e6cb">
                  <label style={{ display: 'block', marginBottom: '15px', color: '#28a745', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-cart-shopping"></i> Composição do Pacote (Turmas / Módulos)
                  </label>

                  {modulosCampanha.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Este curso não possui módulos. O valor deverá ser inserido manualmente abaixo.</div>
                  ) : modoPacoteInscricao === 'por_inscrito' ? (
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                      <i className="fa-solid fa-circle-info" /> Marque as turmas de cada inscrito no bloco acima.
                    </p>
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

                  {(modulosSelecionados.length > 0 || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0)) && (
                    <TotalsBox>
                      <div>
                        <label>Subtotal</label>
                        <div className="val bg-gray">{formatarMoeda(subtotalModulos)}</div>
                        {modoPacoteInscricao === 'igual' && fatorInscritos > 1 && somaPacoteUnidade > 0 && (
                          <SubtotalHint>
                            {formatarMoeda(somaPacoteUnidade)} × {fatorInscritos} inscrito(s)
                          </SubtotalHint>
                        )}
                        {modoPacoteInscricao === 'por_inscrito' && detalheSubtotal && (
                          <SubtotalHint>{detalheSubtotal}</SubtotalHint>
                        )}
                      </div>
                      <div>
                        <label className="text-blue">Desconto (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={desconto}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setDesconto(v);
                          }}
                          className="highlight-blue"
                          style={{ width: '90px' }}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#fd7e14' }}>Desconto (R$)</label>
                        <Input type="number" min="0" step="0.01" value={descontoReais} onChange={e => setDescontoReais(e.target.value)} style={{ width: '110px', backgroundColor: '#fff4e6', borderColor: '#fd7e14' }} />
                      </div>
                      <div>
                        <label className="text-green">Valor a Cobrar</label>
                        <div className="val bg-green">{formatarMoeda(valorFinalCalculado)}</div>
                      </div>
                    </TotalsBox>
                  )}

                  <FormGroup style={{ marginTop: '15px' }}>
                    <label>Valor Final da Negociação (R$)</label>
                    <Input
                      type="number" step="0.01"
                      value={(modulosSelecionados.length > 0 || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0)) ? valorFinalCalculado : valor}
                      onChange={(e) => setValor(e.target.value)}
                      disabled={modulosSelecionados.length > 0 || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0)}
                      placeholder={(modulosSelecionados.length > 0 || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0)) ? "Calculado pelos módulos" : "Digite o valor..."}
                      className={(modulosSelecionados.length > 0 || (modoPacoteInscricao === 'por_inscrito' && subtotalModulos > 0)) ? 'disabled' : ''}
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
                                    <span>{new Date(n.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
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

                  <SectionCard $bgColor="#f8fafc" $borderColor="#e2e8f0">
                    <label style={{ display: 'block', marginBottom: '12px', color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ color: '#6f42c1' }}></i> Histórico de Negociações do Órgão
                    </label>
                    {carregandoHistorico ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Carregando histórico...</div>
                    ) : historicoEmpresa.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma negociação anterior registrada para esta prefeitura.</div>
                    ) : (
                      historicoEmpresa.map(op => {
                        const statusMap = { ganho: ['#28a745','Vendido'], perdido: ['#dc3545','Perdido'], interessada: ['#28a745','Interessada'], inscricao: ['#195326','Inscrição'], avaliar: ['#2e8b57','Avaliar'] };
                        const [cor, label] = statusMap[op.status] || ['#64748b','Em Aberto'];
                        const aberta = historicoOpSelecionada === op.id;
                        return (
                          <div key={op.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', cursor: 'pointer' }} onClick={() => verNotasHistorico(op)}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {op.titulo} <span style={{ background: cor + '20', color: cor, borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>{label}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                  <span><i className="fa-solid fa-graduation-cap" style={{ marginRight: '4px' }}></i>{op.campanha_nome || '-'}</span>
                                  <span style={{ margin: '0 8px' }}>·</span>
                                  <span><i className="fa-solid fa-user-tie" style={{ marginRight: '4px' }}></i>{op.vendedor_nome || '-'}</span>
                                </div>
                              </div>
                              <button type="button" style={{ background: aberta ? '#6f42c1' : '#ede9fe', color: aberta ? '#fff' : '#6f42c1', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                                <i className={`fa-solid fa-${aberta ? 'chevron-up' : 'eye'}`}></i> {aberta ? 'Fechar' : 'Ver Notas'}
                              </button>
                            </div>
                            {aberta && (
                              <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 14px', background: '#f8fafc' }}>
                                {notasHistorico.length === 0 ? (
                                  <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Nenhuma nota nesta negociação.</div>
                                ) : (
                                  notasHistorico.map(n => (
                                    <div key={n.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                                        <strong>{n.usuario_nome}</strong> · {new Date(n.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                      </div>
                                      <div style={{ fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{n.nota}</div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </SectionCard>
                </FormGrid>
              </ModalBody>

              <ModalFooter>
                {editandoId ? <DangerButton type="button" onClick={deletarOportunidade}><i className="fa-solid fa-trash-can"></i> Excluir</DangerButton> : <div></div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <SecondaryButton type="button" onClick={() => fecharModalPrincipal()} disabled={salvandoOportunidade}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit" disabled={salvandoOportunidade}>
                    <i className={`fa-solid ${salvandoOportunidade ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {salvandoOportunidade ? 'Salvando...' : 'Salvar Negócio'}
                  </PrimaryButton>
                </div>
              </ModalFooter>

            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* SUB-MODAL DE CONTATO RÁPIDO */}
      {mostrarModalContato && (
        <ModalOverlay style={{ zIndex: 9999 }}>
          <ModalContent $small onClick={e => e.stopPropagation()}>
            <ModalHeader $bg="#1F4E79" $color="#fff">
              <div>
                <h3 style={{ color: '#fff' }}>
                  <i className={`fa-solid ${modoContatoModal === 'novo' ? 'fa-user-plus' : 'fa-user-pen'}`}></i>
                  {modoContatoModal === 'novo' ? ' Novo contato' : modoContatoModal === 'editar' ? ' Editar contato' : ' Detalhes do contato'}
                </h3>
              </div>
              <CloseButton $color="#fff" onClick={fecharModalContato}>&times;</CloseButton>
            </ModalHeader>

            <ModalBody>
              {modoContatoModal === 'ver' && contatoSelecionado && !editandoContatoRapido ? (
                <>
                  <FormGrid $columns="1fr 1fr" style={{ marginBottom: '20px' }}>
                    <InfoBox>
                      <label>NOME COMPLETO</label>
                      <div>{contatoNome}</div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label>CARGOS E FUNÇÕES</label>
                      <div>
                        {contatoCargos.filter(Boolean).length
                          ? contatoCargos.filter(Boolean).join(' · ')
                          : '-'}
                      </div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label><i className="fa-regular fa-envelope"></i> E-MAILS (Lista de Disparo)</label>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {contatoEmails.filter(Boolean).length > 0 ? contatoEmails.filter(Boolean).map((em, idx) => (
                          <div key={idx} className="email-pill" style={{ padding: '8px 10px', borderRadius: 10, background: '#eef6ff', color: '#1e3a8a', fontWeight: 600 }}>{em}</div>
                        )) : '-'}
                      </div>
                    </InfoBox>
                    <InfoBox>
                      <label><i className="fa-brands fa-whatsapp"></i> WhatsApp pessoal</label>
                      <div>{contatoWhatsapp ? formatarTelefoneParaExibir(contatoWhatsapp) : '-'}</div>
                    </InfoBox>
                    <InfoBox className="span-2">
                      <label><i className="fa-solid fa-phone"></i> Telefones do contato</label>
                      <div className="phones">
                        {contatoTelefones.filter(Boolean).length > 0 ? contatoTelefones.filter(Boolean).map((tel, idx) => (
                          <a key={idx} href={`tel:${formatarTelefoneParaLink(tel)}`} title="Clique para ligar" className="phone-pill">
                            <i className="fa-solid fa-phone text-green"></i> {formatarTelefoneParaExibir(tel)}
                          </a>
                        )) : '-'}
                      </div>
                    </InfoBox>
                    {empresaTelefones && (
                      <InfoBox className="span-2">
                        <label><i className="fa-solid fa-building"></i> Telefones padrão da prefeitura</label>
                        <div className="phones">
                          {empresaTelefones.split(',').map((tel, idx) => (
                            <a key={idx} href={`tel:${formatarTelefoneParaLink(tel)}`} className="phone-pill">
                              <i className="fa-solid fa-phone text-green"></i> {formatarTelefoneParaExibir(tel)}
                            </a>
                          ))}
                        </div>
                      </InfoBox>
                    )}
                    {contatoCongeladoAte && (
                      <InfoBox className="span-2">
                        <label><i className="fa-solid fa-snowflake"></i> Congelado até</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{formatarData(contatoCongeladoAte)}</span>
                          {estaCongelado(contatoCongeladoAte) ? (
                            <span style={{ color: '#1e3a8a' }}>{`Faltam ${calcularDiasRestantes(contatoCongeladoAte)} dia(s) para descongelamento.`}</span>
                          ) : (
                            <span style={{ color: '#b45309' }}>Descongelamento expirado. Atualize o registro para reativar.</span>
                          )}
                        </div>
                      </InfoBox>
                    )}
                    {(contatoNaoQuerEmail || contatoNaoQuerLigacao) && (
                      <InfoBox className="span-2">
                        <label>Preferências</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {contatoNaoQuerEmail && <span style={{ background: '#fff4e5', color: '#b45309', padding: '6px 10px', borderRadius: '999px', fontWeight: 700 }}>Não quer e-mail</span>}
                          {contatoNaoQuerLigacao && <span style={{ background: '#ffe4e6', color: '#991b1b', padding: '6px 10px', borderRadius: '999px', fontWeight: 700 }}>Não quer ligação</span>}
                        </div>
                      </InfoBox>
                    )}
                    {contatoObservacoes && (
                      <InfoBox className="span-2">
                        <label><i className="fa-solid fa-note-sticky"></i> Observações do Contato</label>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#92400e', background: '#fffbeb', padding: '10px 12px', borderRadius: 8 }}>{contatoObservacoes}</div>
                      </InfoBox>
                    )}
                  </FormGrid>
                  <ModalFooter $justify="flex-end">
                    <SecondaryButton type="button" onClick={fecharModalContato}>Voltar</SecondaryButton>
                    <WarningButton type="button" onClick={() => { setModoContatoModal('editar'); setEditandoContatoRapido(true); }}>
                      <i className="fa-solid fa-pen"></i> Editar
                    </WarningButton>
                    <DangerButton type="button" onClick={() => deletarContato(contatoSelecionado?.id)}>
                      <i className="fa-solid fa-trash"></i> Excluir contato
                    </DangerButton>
                  </ModalFooter>
                </>
              ) : (
                <form onSubmit={salvarContatoRapido}>
                  <FormGrid $columns="1fr" style={{ marginBottom: '20px' }}>
                    <FormGroup>
                      <label>Nome *</label>
                      <Input type="text" required value={contatoNome} onChange={e => setContatoNome(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="span-2" style={{ gridColumn: '1 / -1' }}>
                      <DynamicInputBox>
                        <div className="box-header">
                          <span>Cargos e Funções</span>
                          <AddLinkBtn type="button" onClick={() => gerenciarContatoCargos('add')}>
                            <i className="fa-solid fa-plus"></i> Novo Cargo
                          </AddLinkBtn>
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b' }}>
                          O primeiro é o cargo principal (usado na classificação). Os demais são secundários — recebe e-mails/campanhas desses setores também, sem mudar o cargo principal.
                        </p>
                        <div className="dynamic-grid">
                          {contatoCargos.map((cg, i) => (
                            <DynamicInputRow key={i}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, minWidth: 76, color: i === 0 ? '#1F4E79' : '#92400e' }} title={i === 0 ? 'Cargo principal, usado na classificação do órgão' : 'Cargo secundário — só para receber campanhas deste setor'}>
                                {i === 0 ? 'PRINCIPAL' : 'SECUNDÁRIO'}
                              </span>
                              <Select value={cg} onChange={(e) => handleContatoCargoChange(e, i)}>
                                <option value="">-- Selecione ou adicione novo --</option>
                                <option disabled>──────────</option>
                                {listaCargos.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="NOVO_CARGO_ACTION">+ Adicionar novo...</option>
                              </Select>
                              <IconButton
                                type="button"
                                className="danger"
                                onClick={() => gerenciarContatoCargos('remove', i)}
                                disabled={contatoCargos.length <= 1}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </IconButton>
                            </DynamicInputRow>
                          ))}
                        </div>
                      </DynamicInputBox>
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-regular fa-envelope"></i> E-mails</label>
                      <DynamicInputBox>
                        {contatoEmails.map((email, idx) => (
                          <DynamicInputRow key={idx}>
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => gerenciarContatoEmails('update', idx, e.target.value)}
                              placeholder="email@exemplo.com"
                              className="highlight-blue"
                            />
                            <IconButton
                              type="button"
                              className="danger"
                              onClick={() => gerenciarContatoEmails('remove', idx)}
                              disabled={contatoEmails.length <= 1}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </IconButton>
                          </DynamicInputRow>
                        ))}
                        <AddLinkBtn type="button" onClick={() => gerenciarContatoEmails('add')}>
                          <i className="fa-solid fa-plus"></i> Novo e-mail
                        </AddLinkBtn>
                      </DynamicInputBox>
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-phone"></i> Telefones</label>
                      <DynamicInputBox>
                        {contatoTelefones.map((tel, idx) => (
                          <DynamicInputRow key={idx}>
                            <Input
                              type="text"
                              value={tel}
                              onChange={(e) => gerenciarContatoTelefones('update', idx, e.target.value)}
                              placeholder="51999999999"
                              className="highlight-green"
                            />
                            <IconButton
                              type="button"
                              className="danger"
                              onClick={() => gerenciarContatoTelefones('remove', idx)}
                              disabled={contatoTelefones.length <= 1}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </IconButton>
                          </DynamicInputRow>
                        ))}
                        <AddLinkBtn type="button" onClick={() => gerenciarContatoTelefones('add')}>
                          <i className="fa-solid fa-plus"></i> Novo telefone
                        </AddLinkBtn>
                      </DynamicInputBox>
                    </FormGroup>
                    <FormGroup>
                      <label><i className="fa-brands fa-whatsapp"></i> WhatsApp pessoal</label>
                      <Input type="text" value={contatoWhatsapp} onChange={e => setContatoWhatsapp(e.target.value)} placeholder="51999999999" className="highlight-green" />
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label>Congelamento de outreach</label>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!contatoCongeladoAte}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setContatoCongeladoAte(adicionarDias(90));
                              } else {
                                setContatoCongeladoAte('');
                              }
                            }}
                          />
                          Congelar por 3 meses
                        </label>
                        {contatoCongeladoAte && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <span style={{ background: '#e2e8f0', color: '#0f172a', padding: '8px 12px', borderRadius: '999px', fontWeight: 700 }}>
                              Descongelamento: {formatarData(contatoCongeladoAte)}
                            </span>
                            {estaCongelado(contatoCongeladoAte) ? (
                              <span style={{ color: '#1d4ed8' }}>{`${calcularDiasRestantes(contatoCongeladoAte)} dia(s) restantes`}</span>
                            ) : (
                              <span style={{ color: '#b45309' }}>Descongelamento expirado. Atualize o registro.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-note-sticky" style={{ color: '#d97706' }}></i> Observações do Contato <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#92400e' }}>(visível em qualquer negociação/campanha deste contato)</span></label>
                      <TextArea rows={3} value={contatoObservacoes} onChange={(e) => setContatoObservacoes(e.target.value)} placeholder="Ex: está de férias até dia 20/07. Recebe e-mails de Controle Interno mesmo sendo Secretária." />
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label>Preferências de contato</label>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={contatoNaoQuerEmail} onChange={e => setContatoNaoQuerEmail(e.target.checked)} />
                          Não quer receber e-mails
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={contatoNaoQuerLigacao} onChange={e => setContatoNaoQuerLigacao(e.target.checked)} />
                          Não quer receber ligações
                        </label>
                      </div>
                    </FormGroup>
                  </FormGrid>

                  <ModalFooter $justify="flex-end">
                    <SecondaryButton type="button" onClick={fecharModalContato}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit">
                      <i className="fa-solid fa-save"></i> {modoContatoModal === 'novo' ? 'Criar e vincular' : 'Salvar'}
                    </PrimaryButton>
                  </ModalFooter>
                </form>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* MODAL NOVO CARGO (igual Contatos) */}
      {mostrarModalNovoCargo && (
        <ModalOverlay style={{ zIndex: 10001 }}>
          <ModalContent $small onClick={(e) => e.stopPropagation()}>
            <ModalHeader $bg="#f8f9fa" $color="#333">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                <i className="fa-solid fa-plus-circle" style={{ color: '#28a745' }}></i> Adicionar Novo Cargo
              </h3>
              <CloseButton onClick={cancelarNovoCargoFunil}>&times;</CloseButton>
            </ModalHeader>
            <form onSubmit={salvarNovoCargoFunil}>
              <div style={{ padding: '20px' }}>
                <FormGroup>
                  <label>Nome do Novo Cargo *</label>
                  <Input
                    type="text"
                    required
                    autoFocus
                    value={novoCargoNome}
                    onChange={(e) => setNovoCargoNome(e.target.value)}
                    placeholder="Ex: Controlador Interno, Secretário..."
                  />
                </FormGroup>
              </div>
              <ModalFooter $justify="flex-end">
                <SecondaryButton type="button" onClick={cancelarNovoCargoFunil}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit">Salvar e Selecionar</PrimaryButton>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* SUB-MODAL DE EMPRESA RÁPIDO */}
      {mostrarModalEmpresa && empresaSelecionada && (
        <ModalOverlay style={{ zIndex: 9999 }}>
          <ModalContent $small onClick={e => e.stopPropagation()}>
            <ModalHeader $bg="#1F4E79" $color="#fff">
              <div>
                <h3 style={{ color: '#fff' }}><i className="fa-solid fa-building-user"></i> Detalhes da Empresa</h3>
              </div>
              <CloseButton $color="#fff" onClick={() => setMostrarModalEmpresa(false)}>&times;</CloseButton>
            </ModalHeader>

            {!editandoEmpresaRapida ? (
              <>
                <ModalBody>
                  <FormGrid $columns="1fr 1fr" style={{ marginBottom: '20px' }}>
                    <InfoBox className="span-2">
                      <label>NOME DO ÓRGÃO</label>
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
                      <div style={{ marginTop: '5px' }}>
                        {empresaClassificacao === 'assessorada' ? (
                          <span style={{ color: '#856404', fontWeight: 'bold' }}>
                            👑 Assessorada{empresaAssessoradasCargos.length ? ` (${empresaAssessoradasCargos.join(', ')})` : ''}
                          </span>
                        ) : empresaClassificacao === 'lead_quente' ? (
                          <span style={{ color: '#dc3545', fontWeight: 'bold' }}>🔥 Quente </span>
                        ) : (
                          <span style={{ color: '#475569', fontWeight: 'bold' }}>❄️ Frio</span>
                        )}
                      </div>
                    </InfoBox>
                    <InfoBox>
                      <label><i className="fa-solid fa-star"></i> TEMPERATURA</label>
                      <div style={{ marginTop: '5px' }}>
                        {renderStarsLocal(empresaEstrelas, true)}
                      </div>
                    </InfoBox>
                  </FormGrid>
                </ModalBody>
                <ModalFooter $justify="flex-end">
                  <SecondaryButton onClick={() => setMostrarModalEmpresa(false)}>Voltar</SecondaryButton>
                  <WarningButton onClick={() => setEditandoEmpresaRapida(true)}>
                    <i className="fa-solid fa-pen"></i> Editar Empresa
                  </WarningButton>
                </ModalFooter>
              </>
            ) : (
              <form onSubmit={salvarEmpresaRapido} style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
                <ModalBody>
                  <FormGrid $columns="1fr 1fr" style={{ marginBottom: '20px' }}>
                    <FormGroup className="span-2">
                      <label>Nome do Órgão *</label>
                      <Input type="text" required value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                      <label>Estado (UF)</label>
                      <Select value={empresaEstado} onChange={e => setEmpresaEstado(e.target.value)}>
                        <option value="">— Selecione a UF —</option>
                        {UFS_BRASIL.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <label>Cidade</label>
                      <Input type="text" value={empresaCidade} onChange={e => setEmpresaCidade(e.target.value)} />
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-phone text-green"></i> Telefones</label>
                      <Input type="text" value={empresaTelefones} onChange={e => setEmpresaTelefones(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                      <label><i className="fa-solid fa-fire"></i> Classificação Geral</label>
                      <Select value={empresaClassificacao} onChange={e => setEmpresaClassificacao(e.target.value)}>
                        <option value="nao_assessorada">❄️ Frio</option>
                        <option value="lead_quente">🔥 Quente</option>
                        <option value="assessorada">👑 Assessorada</option>
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <label><i className="fa-solid fa-star"></i> Temperatura Geral</label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={empresaEstrelas}
                        onChange={e => setEmpresaEstrelas(Number(e.target.value))}
                        placeholder="0 a 5"
                      />
                    </FormGroup>
                    <FormGroup className="span-2">
                      <label><i className="fa-solid fa-clock text-blue"></i> Horário de Funcionamento</label>
                      <Input type="text" value={empresaHorario} onChange={e => setEmpresaHorario(e.target.value)} placeholder="Ex: Seg a Sex, 08:00 - 17:00" />
                    </FormGroup>

                    <div className="span-2" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '15px', color: '#1F4E79', fontSize: '0.95rem', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-fire"></i> Classificação por Cargo
                      </label>
                      <DynamicInputBox>
                        {empresaClassificacoesPorCargo.map((item, idx) => (
                          <DynamicInputRow key={idx} style={{ flexWrap: 'wrap' }}>
                            <Select style={{ flex: '1 1 140px' }} value={item.cargo} onChange={(e) => atualizarEmpresaClassificacaoPorCargo(idx, 'cargo', e.target.value)}>
                              <option value="">-- Cargo --</option>
                              {listaCargos.map((cargo) => (
                                <option key={cargo} value={cargo}>{cargo}</option>
                              ))}
                            </Select>
                            <Select style={{ flex: '1 1 120px' }} value={item.classificacao} onChange={(e) => atualizarEmpresaClassificacaoPorCargo(idx, 'classificacao', e.target.value)}>
                              <option value="nao_assessorada">❄️ Frio</option>
                              <option value="lead_quente">🔥 Quente</option>
                              <option value="assessorada">👑 Assessorada</option>
                            </Select>
                            <Input
                              style={{ flex: '0 1 100px' }}
                              type="number"
                              min="0"
                              max="5"
                              value={item.estrelas}
                              onChange={(e) => atualizarEmpresaClassificacaoPorCargo(idx, 'estrelas', Number(e.target.value))}
                              placeholder="Estrelas"
                            />
                            <IconButton
                              style={{ flexShrink: 0 }}
                              type="button"
                              className="danger"
                              onClick={() => removerEmpresaClassificacaoCargo(idx)}
                              disabled={empresaClassificacoesPorCargo.length <= 1}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </IconButton>
                          </DynamicInputRow>
                        ))}
                        <AddLinkBtn type="button" onClick={adicionarEmpresaClassificacaoCargo} style={{ marginTop: '10px' }}>
                          <i className="fa-solid fa-plus"></i> Novo cargo
                        </AddLinkBtn>
                      </DynamicInputBox>
                      <div style={{ marginTop: '10px', color: '#64748b', fontSize: '0.85rem' }}>
                        A classificação por cargo é independente da classificação geral e ajuda a manter detalhes por função.
                      </div>
                    </div>

                  </FormGrid>
                </ModalBody>

                <ModalFooter $justify="flex-end">
                  <SecondaryButton type="button" onClick={() => setEditandoEmpresaRapida(false)}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Alterações</PrimaryButton>
                </ModalFooter>
              </form>
            )}
          </ModalContent>
        </ModalOverlay>
      )}

      {/* MODAL GERENCIAR MOTIVOS DE PERDA */}
      {mostrarModalMotivos && (
        <ModalOverlay style={{ zIndex: 10002 }} onClick={() => setMostrarModalMotivos(false)}>
          <ModalContent $small onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <ModalHeader $bg="#dc3545" $color="#fff">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>
                <i className="fa-solid fa-circle-xmark"></i> Gerenciar Motivos de Perda
              </h3>
              <CloseButton $color="#fff" onClick={() => setMostrarModalMotivos(false)}>&times;</CloseButton>
            </ModalHeader>

            <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '12px 16px' }}>
              {motivosPerda.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>Nenhum motivo cadastrado.</p>
              )}
              {motivosPerda.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  {editandoMotivoId === m.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editandoMotivoNome}
                        onChange={e => setEditandoMotivoNome(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') salvarEdicaoMotivo(m.id); if (e.key === 'Escape') { setEditandoMotivoId(null); setEditandoMotivoNome(''); } }}
                        style={{ flex: 1, padding: '5px 8px', fontSize: '0.9rem' }}
                      />
                      <IconButton type="button" onClick={() => salvarEdicaoMotivo(m.id)} style={{ color: '#28a745' }}>
                        <i className="fa-solid fa-check"></i>
                      </IconButton>
                      <IconButton type="button" onClick={() => { setEditandoMotivoId(null); setEditandoMotivoNome(''); }} style={{ color: '#999' }}>
                        <i className="fa-solid fa-xmark"></i>
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>{m.nome}</span>
                      <IconButton type="button" onClick={() => { setEditandoMotivoId(m.id); setEditandoMotivoNome(m.nome); }} style={{ color: '#007bff' }}>
                        <i className="fa-solid fa-pen"></i>
                      </IconButton>
                      <IconButton type="button" className="danger" onClick={() => excluirMotivo(m.id)}>
                        <i className="fa-solid fa-trash"></i>
                      </IconButton>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
              <Input
                type="text"
                placeholder="Novo motivo..."
                value={novoMotivoNome}
                onChange={e => setNovoMotivoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarMotivo(); } }}
                style={{ flex: 1, fontSize: '0.9rem' }}
              />
              <PrimaryButton type="button" onClick={adicionarMotivo} style={{ whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-plus"></i> Adicionar
              </PrimaryButton>
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
    padding: 10px 15px 10px 38px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; width: 320px; transition: 0.2s; box-sizing: border-box;
    &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
    @media (max-width: 768px) { width: 100%; }
  }
`;

const SugestoesBusca = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 18px 50px -18px rgba(0,0,0,0.25);
  z-index: 2000;
  overflow: hidden;
  max-height: 340px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
`;

const SugestaoItem = styled.button`
  width: 100%;
  text-align: left;
  border: none;
  background: #fff;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }

  .linha1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    strong { color: #0f172a; font-size: 0.92rem; }
    .uf { font-size: 0.72rem; font-weight: 800; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
  }
  .linha2 {
    margin-top: 4px;
    font-size: 0.8rem;
    color: #64748b;
    .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; max-width: 100%; }
  }
`;

/* === ÁREA DE FILTROS MODERNIZADA === */
const FilterPillWrapper = styled.div`
  position: relative; display: inline-block; max-width: 380px;
  @media (max-width: 768px) { width: 100%; }
`;

const FilterButton = styled.button`
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: ${props => props.$hasValue ? '#f0f7ff' : '#ffffff'};
  border: 1px solid ${props => props.$hasValue ? '#007bff' : '#e2e8f0'};
  color: #334155; padding: 8px 14px; border-radius: 10px; max-width: 340px; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease-in-out; box-shadow: 0 2px 4px rgba(0,0,0,0.02);

  &:hover { 
    background: #f8fafc; border-color: #007bff; box-shadow: 0 4px 12px rgba(0,123,255,0.1); transform: translateY(-1px);
  }

  span { display: flex; align-items: center; gap: 6px; color: #64748b; margin: 0;
    strong { color: ${props => props.$hasValue ? '#007bff' : '#0f172a'}; font-weight: 700;} 
  }
  .icon { color: ${props => props.$hasValue ? '#007bff' : '#94a3b8'}; font-size: 1.1rem; }
  .arrow { color: #94a3b8; font-size: 0.8rem; transition: transform 0.3s ease; }
`;

const FilterToggleButton = styled.button`
  display: flex; align-items: center; gap: 8px;
  background: ${props => props.$hasValue ? '#f0f7ff' : '#ffffff'};
  border: 1px solid ${props => props.$hasValue ? '#007bff' : '#e2e8f0'};
  color: ${props => props.$hasValue ? '#007bff' : '#334155'};
  padding: 8px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease-in-out; box-shadow: 0 2px 4px rgba(0,0,0,0.02);

  &:hover { background: #f8fafc; border-color: #007bff; box-shadow: 0 4px 12px rgba(0,123,255,0.1); transform: translateY(-1px); }
  .arrow { color: #94a3b8; font-size: 0.8rem; }
`;

const FiltrosBadge = styled.span`
  background: #007bff; color: #fff; font-size: 0.72rem; font-weight: 700;
  border-radius: 999px; min-width: 18px; height: 18px; display: inline-flex;
  align-items: center; justify-content: center; padding: 0 5px;
`;

const FiltroModalCampo = styled.div`
  margin-bottom: 18px;
  label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 6px; i { color: #94a3b8; width: 14px; } }
  .ajuda { display: block; margin-top: 6px; font-size: 0.75rem; color: #94a3b8; }
`;

const FiltroModalRodape = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  margin-top: 8px; padding-top: 16px; border-top: 1px solid #edf2f9;
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
const AlertBanner = styled.div`
  width: 100%; margin-top: 18px; padding: 18px 20px; border-radius: 12px; background: #fff8e1; color: #7c4d0d; border: 1px solid #f5deb3; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); font-size: 0.95rem;
  strong { color: #5d4037; }
`;

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
  display: flex; flex-direction: column; gap: 4px; padding: 5px 5px 10px 5px;
  .header-top { display: flex; justify-content: space-between; align-items: center; }
  .title { font-weight: 700; color: #444; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge { background: #e2e4e9; color: #555; padding: 4px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }
  .column-total { font-size: 0.82rem; font-weight: 700; color: #16a34a; padding-left: 2px; }
`;

const RottingBadge = styled.div`
  display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; width: fit-content;
  background: ${p => p.$critico ? '#fdecea' : '#fff7ed'};
  color: ${p => p.$critico ? '#dc3545' : '#b45309'};
  border: 1px solid ${p => p.$critico ? '#f5c6cb' : '#fed7aa'};
  i { font-size: 0.68rem; }
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
  
  .card-company { font-size: 0.8rem; color: #6c757d; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .card-company span { display: inline-flex; align-items: center; gap: 4px; }
  .badge-vip, .badge-hot, .badge-cold { display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; }
  .badge-vip { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
  .badge-hot { background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; }
  .badge-cold { background: #f0f7ff; color: #1F4E79; border: 1px solid #b8daff; }
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

// --- DIAGNÓSTICO ---
const DiagnosticoBtn = styled.button`
  display: inline-flex; align-items: center; gap: 6px; background: #f0f9ff; color: #0369a1;
  border: 1px solid #bae6fd; border-radius: 8px; padding: 7px 14px; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  &:hover { background: #e0f2fe; }
`;

const DiagTab = styled.button`
  flex: 1; padding: 9px 14px; border-radius: 8px; border: 2px solid ${p => p.$active ? '#3b82f6' : '#e2e8f0'};
  background: ${p => p.$active ? '#eff6ff' : '#f8fafc'}; color: ${p => p.$active ? '#1d4ed8' : '#555'};
  font-weight: 700; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.15s;
`;

const DiagInput = styled.input`
  flex: 1; padding: 7px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem;
  &:focus { outline: none; border-color: #3b82f6; }
`;

const DiagSelect = styled.select`
  padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; background: #fff;
  &:focus { outline: none; border-color: #3b82f6; }
`;

const DiagTabela = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.84rem;
  th { background: #f1f5f9; color: #374151; font-weight: 700; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f8fafc; }
  max-height: 400px; display: block; overflow-y: auto;
  thead, tbody tr { display: table; width: 100%; table-layout: fixed; }
`;

const DiagStatusBadge = styled.span`
  display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700;
  background: ${p => ({ ganho: '#dcfce7', perdido: '#fee2e2', interessada: '#d1fae5', avaliar: '#d1fae5', inscricao: '#dbeafe' }[p.$status] || '#f1f5f9')};
  color: ${p => ({ ganho: '#15803d', perdido: '#dc2626', interessada: '#059669', avaliar: '#16a34a', inscricao: '#1d4ed8' }[p.$status] || '#555')};
`;

const DiagMotivoTag = styled.span`
  display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.73rem; font-weight: 600;
  background: ${p => p.$motivo === 'Sem contatos cadastrados' ? '#fff7ed' : p.$motivo === 'Contatos congelados' ? '#eff6ff' : '#fef2f2'};
  color: ${p => p.$motivo === 'Sem contatos cadastrados' ? '#c2410c' : p.$motivo === 'Contatos congelados' ? '#1d4ed8' : '#991b1b'};
`;

// --- MODAIS GERAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px);
  display: flex; align-items: flex-start; justify-content: center; z-index: 9998;
  padding: 24px 20px 40px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); box-sizing: border-box;
`;

const ModalContent = styled.div`
  background: white; border-radius: 12px; width: 100%; max-width: ${props => props.$small ? '600px' : '900px'};
  max-height: calc(100vh - 80px); display: flex; flex-direction: column; overflow: visible;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: modalSobe 0.3s ease-out;
  @keyframes modalSobe { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 900px) {
    max-width: calc(95vw);
  }
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #edf2f9; background: ${props => props.$bg || '#fff'}; color: ${props => props.$color || '#333'};
  h3 { margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 8px;}
  .subtitle { font-size: 0.85rem; color: ${props => props.$color ? 'rgba(255,255,255,0.8)' : '#007bff'}; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 6px; }
  
  @media (max-width: 600px) {
    h3 { font-size: 1.15rem; padding-right: 30px; }
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  flex: 1 1 auto;
  overflow-y: auto;
  max-height: none;
`;

const ModalFooter = styled.div`
  display: flex; justify-content: ${props => props.$justify || 'space-between'}; align-items: center; padding: 20px 25px; border-top: 1px solid #edf2f9; background: #fbfbfc;
  flex-shrink: 0;
  position: sticky; bottom: 0; z-index: 12;
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
    switch (props.$status) {
      case 'naofunciona': return '#fff9db';
      case 'naoatendeu': return '#fff4e6';
      case 'ganho': return '#e6f4ea';
      case 'interessada': return '#e9f7ef';
      case 'avaliar': return '#e9f7ef';
      case 'perdido': return '#fdecea';
      case 'assessorada': return '#fff3cd';
      case 'lead_quente': return '#fdf2f2';
      case 'nao_assessorada': return '#f8fafc';
      default: return '#fff';
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

const DynamicInputBox = styled.div`
  border: 1px solid #edf2f9;
  background: #fbfbfc;
  padding: 20px;
  border-radius: 12px;
  width: 100%;
  
  .box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    font-weight: 700;
    font-size: 0.95rem;
    color: #2c3e50;
  }
  .dynamic-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;
const DynamicInputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
`;
const AddLinkBtn = styled.button`
  background: rgba(0, 123, 255, 0.1);
  border: none;
  color: #007bff;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 6px;
  transition: 0.2s;
  &:hover {
    background: #007bff;
    color: #fff;
  }
`;
const IconButton = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 1rem;
  transition: 0.2s;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &.danger {
    color: #dc3545;
    background: #fff5f5;
    border-color: #f8d7da;
    &:hover:not(:disabled) {
      background: #dc3545;
      color: #fff;
    }
  }
  &.whatsapp {
    color: #25d366;
    background: #f0faf4;
    border-color: #b7ebc8;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    &:hover { background: #25d366; color: #fff; }
  }
`;

const ContatosNegociacaoLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
`;

const ContatoNegociacaoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$vinculado ? '#bbf7d0' : '#e2e8f0')};
  background: ${(p) => (p.$vinculado ? '#f0fdf4' : '#fff')};

  .check-wrap {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    min-width: 0;
    cursor: pointer;
    margin: 0;
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    strong { font-size: 0.88rem; color: #1e293b; }
    small { font-size: 0.75rem; color: #64748b; }
  }
  .name-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .main-phone {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .badge-principal {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    color: #b45309;
    margin-top: 2px;
  }
`;

const ContatoNegociacaoAcoes = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

const BtnNovoContato = styled.button`
  width: 100%;
  padding: 10px 12px;
  border: 1px dashed #86efac;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:hover { background: #dcfce7; border-color: #4ade80; }
`;

// --- MÓDULOS E CÁLCULOS ---
const ModoPacoteBox = styled.div`
  display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #c3e6cb;

  label {
    display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.88rem;
    input { margin-top: 3px; }
    strong { display: block; color: #1e293b; }
    small { display: block; color: #64748b; font-size: 0.78rem; margin-top: 2px; }
  }
`;

const SubtotalHint = styled.div`
  font-size: 0.75rem; color: #64748b; margin-top: 4px; font-weight: 500;
`;

const ModulesGrid = styled.div`
  display: flex; gap: 10px; flex-wrap: wrap;
  ${(p) => p.$compact && 'gap: 6px;'}
`;
const ModuleCard = styled.div`
  display: flex; align-items: center; gap: ${(p) => (p.$compact ? '8px' : '12px')};
  padding: ${(p) => (p.$compact ? '6px 10px' : '10px 15px')};
  border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
  width: ${(p) => (p.$compact ? 'auto' : '100%')};
  text-align: left;
  font: inherit;
  background: ${(props) => props.$active ? '#e6f4ea' : '#ffffff'};
  border: 1px solid ${(props) => props.$active ? '#28a745' : '#cbd5e1'};
  
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

  .custom-checkbox {
    width: ${(p) => (p.$compact ? '16px' : '20px')};
    height: ${(p) => (p.$compact ? '16px' : '20px')};
    border-radius: 4px; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    &.active { background: #28a745; border-color: #28a745; color: #fff; font-size: 0.65rem; }
  }
  
  .mod-info { display: flex; flex-direction: column; }
  .mod-name { font-size: ${(p) => (p.$compact ? '0.75rem' : '0.85rem')}; color: #333; font-weight: ${(props) => props.$active ? '700' : '600'}; }
  .mod-price { font-size: ${(p) => (p.$compact ? '0.72rem' : '0.8rem')}; color: #28a745; font-weight: 700; }
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