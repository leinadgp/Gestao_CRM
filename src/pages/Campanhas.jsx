import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';
import { BotaoExportar } from '../componentes/BotaoExportar.jsx';
import { useToast } from '../componentes/Toast.jsx';

// --- UTILITÁRIO DE SEGURANÇA PARA JSON ---
const parseJSONSeguro = (dadoString, fallback = []) => {
  if (!dadoString) return fallback;
  if (typeof dadoString !== 'string') return dadoString;
  try { return JSON.parse(dadoString); } catch { return fallback; }
};

export function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [listaCargos, setListaCargos] = useState([]); 
  const [carregando, setCarregando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Controle das abas de visualização
  const [abaAtiva, setAbaAtiva] = useState('ativas'); 

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [informacaoExtra, setInformacaoExtra] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cargosAlvo, setCargosAlvo] = useState([]);
  
  // Novos campos: Restrição e Múltiplos Senders
  const [apenasAdmin, setApenasAdmin] = useState(false);
  const [emailRemetente, setEmailRemetente] = useState('');

  // Filtro por UF
  const [ufsAlvo, setUfsAlvo] = useState([]); // vazio = todos os estados

  const LISTA_UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  // Filtro por tipo de órgão
  const [tiposOrgaoAlvo, setTiposOrgaoAlvo] = useState([]); // vazio = todos os tipos

  const TIPOS_ORGAO = [
    { valor: 'prefeitura', rotulo: 'Prefeitura' },
    { valor: 'camara', rotulo: 'Câmara Municipal' },
    { valor: 'autarquia', rotulo: 'Autarquia' },
    { valor: 'consorcio', rotulo: 'Consórcio' },
  ];

  // Prioridade de disparo por estado (ordem de envio, independente do público-alvo)
  const [ufsPrioridade, setUfsPrioridade] = useState([]); // array ordenado, vazio = sem prioridade

  function adicionarUfPrioridade(uf) {
    if (!uf || ufsPrioridade.includes(uf)) return;
    setUfsPrioridade(prev => [...prev, uf]);
  }
  function removerUfPrioridade(uf) {
    setUfsPrioridade(prev => prev.filter(u => u !== uf));
  }
  function moverUfPrioridade(indice, direcao) {
    setUfsPrioridade(prev => {
      const novo = [...prev];
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= novo.length) return prev;
      [novo[indice], novo[alvo]] = [novo[alvo], novo[indice]];
      return novo;
    });
  }

  const etapasPadrao = ['CONTATO 1° E-MAIL', 'CONTATO TEL.', 'IDENTIFICAÇÃO DO INTERESSE','NÃO QUER LIGAÇÃO','PERDIDO', 'SE INSCREVEU E DESISTIU','VENDA REALIZADA'];
  const [etapas, setEtapas] = useState(etapasPadrao);
  const [novaEtapa, setNovaEtapa] = useState('');
  const [etapasFunil, setEtapasFunil] = useState([]);
  const [etapaInscricaoId, setEtapaInscricaoId] = useState('');
  const [etapaVendaId, setEtapaVendaId] = useState('');
  const [etapaInscricaoNome, setEtapaInscricaoNome] = useState('VENDA REALIZADA');
  const [etapaVendaNome, setEtapaVendaNome] = useState('VENDA REALIZADA');

  const [modulos, setModulos] = useState([]);
  const [modNome, setModNome] = useState('');
  const [modValor, setModValor] = useState(''); 
  const [modEvento, setModEvento] = useState('');
  const [modEventoFim, setModEventoFim] = useState(''); 

  // Estados para a Trava de Segurança (Exclusão Matemática)
  const [modalExcluir, setModalExcluir] = useState(false);
  const [campanhaExcluir, setCampanhaExcluir] = useState(null);
  const [contaMath, setContaMath] = useState({ a: 0, b: 0, resultado: 0 });
  const [respostaMath, setRespostaMath] = useState('');

  const [buscaCampanha, setBuscaCampanha] = useState('');

  const mostrar = useToast();

  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const carregarCampanhas = useCallback(async () => {
    setCarregando(true);
    try {
      const config = getHeaders();
      const [resCamps, resCargos] = await Promise.all([
        axios.get(`${API_URL}/campanhas`, config),
        axios.get(`${API_URL}/cargos`, config).catch(() => ({ data: [] }))
      ]);

      if (resCargos.data.length > 0) {
        setListaCargos(resCargos.data.map(c => c.nome));
      }

      const campanhasComModulos = await Promise.all(resCamps.data.map(async (camp) => {
        const resMods = await axios.get(`${API_URL}/campanhas/${camp.id}/modulos`, config);
        return { ...camp, listaModulos: resMods.data };
      }));
      setCampanhas(campanhasComModulos);
      
    } catch (erro) { 
      console.error("Erro ao carregar campanhas:", erro); 
      alert("Erro ao carregar os dados dos cursos e cargos.");
    } finally {
      setCarregando(false);
    }
  }, [API_URL, getHeaders]);

  useEffect(() => { carregarCampanhas(); }, [carregarCampanhas]);

  function formatarMoeda(valor) { 
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
  }

  function formatarDataBR(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  function abrirModalNovo() {
    setEditandoId(null);
    setNome('');
    setDescricao('');
    setInformacaoExtra('');
    setDataInicio('');
    setDataFim('');
    setCargosAlvo([]);
    setApenasAdmin(false);
    setEmailRemetente('');
    setUfsAlvo([]);
    setTiposOrgaoAlvo([]);
    setUfsPrioridade([]);
    setEtapas(etapasPadrao);
    setEtapasFunil([]);
    setEtapaInscricaoId('');
    setEtapaVendaId('');
    setEtapaInscricaoNome('INSCRITO');
    setEtapaVendaNome('VENDA REALIZADA');
    setModulos([]); 
    setMostrarModal(true);
  }

  async function abrirModalEdicao(camp) {
    setEditandoId(camp.id); 
    setNome(camp.nome); 
    setDescricao(camp.descricao || '');
    setInformacaoExtra(camp.informacao_extra || '');
    setDataInicio(camp.data_inicio ? camp.data_inicio.split('T')[0] : '');
    setDataFim(camp.data_fim ? camp.data_fim.split('T')[0] : '');
    setApenasAdmin(camp.apenas_admin || false);
    setEmailRemetente(camp.email_remetente || '');
    setCargosAlvo(parseJSONSeguro(camp.cargos_alvo, []));
    setUfsAlvo(parseJSONSeguro(camp.ufs_alvo, []));
    setTiposOrgaoAlvo(parseJSONSeguro(camp.tipos_orgao_alvo, []));
    setUfsPrioridade(parseJSONSeguro(camp.ufs_prioridade, []));
    setEtapaInscricaoId(camp.etapa_inscricao_id ? String(camp.etapa_inscricao_id) : '');
    setEtapaVendaId(camp.etapa_venda_id ? String(camp.etapa_venda_id) : '');

    try {
      const resEtapas = await axios.get(`${API_URL}/campanhas/${camp.id}/etapas`, getHeaders());
      setEtapasFunil(resEtapas.data || []);
    } catch {
      setEtapasFunil([]);
    }
    
    const modsFormatados = (camp.listaModulos || []).map(m => ({
      id: m.id, 
      nome: m.nome, 
      valor: m.valor,
      data_evento: m.data_evento ? m.data_evento.split('T')[0] : '',
      data_evento_fim: m.data_evento_fim ? m.data_evento_fim.split('T')[0] : ''
    }));
    setModulos(modsFormatados); 
    setMostrarModal(true);
  }

  function toggleCargo(cargo) { 
    setCargosAlvo(prev => prev.includes(cargo) ? prev.filter(c => c !== cargo) : [...prev, cargo]); 
  }
  
  function adicionarEtapa() { 
    if (novaEtapa.trim() !== '') { 
      setEtapas([...etapas, novaEtapa]); 
      setNovaEtapa(''); 
    } 
  }
  
  function removerEtapa(index) { 
    const novas = [...etapas]; 
    novas.splice(index, 1); 
    setEtapas(novas); 
  }

  function adicionarModulo() {
    if (!modNome.trim()) return alert('O nome do módulo é obrigatório.');
    setModulos([...modulos, { 
      nome: modNome, 
      valor: modValor ? parseFloat(modValor) : 0,
      data_evento: modEvento || null, 
      data_evento_fim: modEventoFim || null 
    }]);
    setModNome(''); setModValor(''); setModEvento(''); setModEventoFim('');
  }

  function removerModulo(index) {
    const novos = [...modulos];
    novos.splice(index, 1);
    setModulos(novos);
  }
  
  function atualizarModulo(index, campo, valorCampo) {
    const novos = [...modulos];
    novos[index][campo] = campo === 'valor' ? (parseFloat(valorCampo) || 0) : valorCampo;
    setModulos(novos);
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    if (!editandoId && etapas.length === 0) return alert('Adicione pelo menos uma etapa para o funil.');
    if (editandoId && (!etapaInscricaoId || !etapaVendaId)) return alert('Selecione as etapas de inscrição e venda para a Landing Page.');
    if (!editandoId && (!etapaInscricaoNome || !etapaVendaNome)) return alert('Selecione as etapas de inscrição e venda para a Landing Page.');
    
    const payload = {
        nome,
        descricao,
        informacao_extra: informacaoExtra,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        cargos_alvo: cargosAlvo,
        ufs_alvo: ufsAlvo.length > 0 ? ufsAlvo : null,
        tipos_orgao_alvo: tiposOrgaoAlvo.length > 0 ? tiposOrgaoAlvo : null,
        ufs_prioridade: ufsPrioridade.length > 0 ? ufsPrioridade : null,
        apenas_admin: apenasAdmin,
        email_remetente: emailRemetente || null,
        modulos,
        etapa_inscricao_id: etapaInscricaoId ? Number(etapaInscricaoId) : null,
        etapa_venda_id: etapaVendaId ? Number(etapaVendaId) : null,
        etapa_inscricao_nome: etapaInscricaoNome || null,
        etapa_venda_nome: etapaVendaNome || null,
    };
    
    try {
      if (editandoId) { 
        await axios.put(`${API_URL}/campanhas/${editandoId}`, payload, getHeaders()); 
      } else { 
        await axios.post(`${API_URL}/campanhas`, { ...payload, etapas }, getHeaders()); 
      }
      setMostrarModal(false);
      mostrar(editandoId ? 'Campanha atualizada com sucesso!' : 'Campanha criada com sucesso!', 'success');
      carregarCampanhas();
    } catch (erro) {
      console.error(erro);
      mostrar(erro.response?.data?.erro || 'Erro ao salvar configurações da campanha.', 'error');
    }
  }

  // --- LÓGICA DE ARQUIVAR E EXCLUIR ---
  async function alternarArquivamento(id, statusAtualArquivado) {
    const acao = statusAtualArquivado ? 'desarquivar' : 'arquivar';
    const aviso = statusAtualArquivado
      ? ''
      : '\n\nAo encerrar: a landing page vinculada será despublicada e as negociações ainda em aberto desta campanha serão marcadas como perdidas automaticamente.';
    if (!window.confirm(`Tem certeza que deseja ${acao} este curso?${aviso}`)) return;

    try {
      const res = await axios.put(`${API_URL}/campanhas/${id}/arquivar`, { arquivada: !statusAtualArquivado }, getHeaders());
      const lpsDespublicadas = res.data?.landing_pages_despublicadas || [];
      const negociacoesPerdidas = res.data?.negociacoes_marcadas_perdidas || [];
      if (lpsDespublicadas.length > 0 || negociacoesPerdidas.length > 0) {
        const partes = [];
        if (lpsDespublicadas.length > 0) partes.push(`${lpsDespublicadas.length} landing page(s) despublicada(s)`);
        if (negociacoesPerdidas.length > 0) partes.push(`${negociacoesPerdidas.length} negociação(ões) marcada(s) como perdida(s)`);
        mostrar(`Campanha arquivada. ${partes.join(' e ')}.`, 'success');
      } else {
        mostrar(statusAtualArquivado ? 'Campanha desarquivada.' : 'Campanha arquivada.', 'success');
      }
      carregarCampanhas();
    } catch (error) {
      mostrar('Erro ao alterar status de arquivamento.', 'error');
    }
  }

  function iniciarExclusao(camp) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setContaMath({ a, b, resultado: a + b });
    setRespostaMath('');
    setCampanhaExcluir(camp);
    setModalExcluir(true);
  }

  async function processarExclusao(e) {
    e.preventDefault();
    if (parseInt(respostaMath) !== contaMath.resultado) {
      return alert('O cálculo matemático está incorreto. Tente novamente.');
    }

    try { 
      await axios.delete(`${API_URL}/campanhas/${campanhaExcluir.id}`, getHeaders()); 
      setModalExcluir(false);
      mostrar('Campanha excluída definitivamente.', 'success');
      carregarCampanhas();
    } catch (error) { 
      console.error(error); 
      alert(error.response?.data?.erro || 'O banco de dados bloqueou a exclusão porque existem clientes atrelados a esta campanha.'); 
    }
  }

  function calcularStatusCampanha(camp) {
    const hoje = Date.now();
    const inicio = camp.data_inicio ? new Date(camp.data_inicio).getTime() : null;
    const fim = camp.data_fim ? new Date(camp.data_fim).getTime() : null;
    if (!inicio && !fim) return { label: 'Sem data', cor: '#94a3b8', bg: '#f1f5f9' };
    if (fim && hoje > fim) return { label: 'Encerrada', cor: '#6b7280', bg: '#f3f4f6' };
    if (inicio && hoje < inicio) return { label: 'Futura', cor: '#2563eb', bg: '#eff6ff' };
    return { label: 'Em andamento', cor: '#16a34a', bg: '#f0fdf4' };
  }

  function calcularProgressoTemporal(camp) {
    const hoje = Date.now();
    const inicio = camp.data_inicio ? new Date(camp.data_inicio).getTime() : null;
    const fim = camp.data_fim ? new Date(camp.data_fim).getTime() : null;
    if (!inicio || !fim || fim <= inicio) return null;
    return Math.min(100, Math.max(0, Math.round(((hoje - inicio) / (fim - inicio)) * 100)));
  }

  async function duplicarCampanha(camp) {
    try {
      const etapasRes = await axios.get(`${API_URL}/campanhas/${camp.id}/etapas`, getHeaders());
      const etapasNomes = (etapasRes.data || []).map(e => e.nome);
      await axios.post(`${API_URL}/campanhas`, {
        nome: `${camp.nome} — Cópia`,
        descricao: camp.descricao || '',
        informacao_extra: camp.informacao_extra || '',
        data_inicio: '',
        data_fim: '',
        cargos_alvo: camp.cargos_alvo || '[]',
        ufs_alvo: camp.ufs_alvo || null,
        tipos_orgao_alvo: camp.tipos_orgao_alvo || null,
        ufs_prioridade: camp.ufs_prioridade || null,
        apenas_admin: camp.apenas_admin || false,
        email_remetente: camp.email_remetente || '',
        etapas: etapasNomes.length > 0 ? etapasNomes : ['CONTATO', 'INSCRITO', 'VENDA REALIZADA'],
        etapa_inscricao_nome: 'INSCRITO',
        etapa_venda_nome: 'VENDA REALIZADA',
      }, getHeaders());
      mostrar('Campanha duplicada com sucesso!', 'success');
      carregarCampanhas();
    } catch {
      mostrar('Erro ao duplicar campanha.', 'error');
    }
  }

  // === MEMOIZAÇÃO DE PERFORMANCE ===
  const campanhasFiltradas = useMemo(() => {
    const busca = buscaCampanha.toLowerCase().trim();
    return campanhas.filter(camp => {
      const abaMatch = abaAtiva === 'arquivadas' ? camp.arquivada === true : (camp.arquivada === false || camp.arquivada === null);
      const buscaMatch = !busca || camp.nome.toLowerCase().includes(busca);
      return abaMatch && buscaMatch;
    });
  }, [campanhas, abaAtiva, buscaCampanha]);

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  return (
    <>
      
      <PageContainer>
        
        <TopSection>
          <div>
            <Title>Cursos e Lançamentos</Title>
            <Subtitle>Configure os cursos, público-alvo e módulos.</Subtitle>
            
            <TabsContainer>
              <TabButton $active={abaAtiva === 'ativas'} onClick={() => setAbaAtiva('ativas')}>
                <i className="fa-solid fa-folder-open"></i> Cursos Ativos
              </TabButton>
              <TabButton $active={abaAtiva === 'arquivadas'} onClick={() => setAbaAtiva('arquivadas')}>
                <i className="fa-solid fa-box-archive"></i> Arquivados
              </TabButton>
            </TabsContainer>
          </div>

          <PrimaryButton onClick={abrirModalNovo} className="btn-mobile">
            <i className="fa-solid fa-plus"></i> Novo Curso
          </PrimaryButton>
        </TopSection>

        <BuscaBar>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Buscar campanha por nome..."
            value={buscaCampanha}
            onChange={e => setBuscaCampanha(e.target.value)}
          />
          {buscaCampanha && (
            <button onClick={() => setBuscaCampanha('')} title="Limpar busca">
              <i className="fa-solid fa-times" />
            </button>
          )}
        </BuscaBar>

        {carregando ? (
          <LoadingContainer>
            <i className="fa-solid fa-spinner fa-spin"></i><br />Carregando campanhas e módulos...
          </LoadingContainer>
        ) : campanhasFiltradas.length === 0 ? (
          <EmptyState>
            <i className="fa-solid fa-folder-open"></i>
            Nenhuma campanha encontrada nesta categoria.
          </EmptyState>
        ) : (
          <CampaignsGrid>
            {campanhasFiltradas.map(camp => (
              <CampaignCard key={camp.id} $arquivada={abaAtiva === 'arquivadas'}>
                <CardHeader>
                  <CardTitle $arquivada={abaAtiva === 'arquivadas'}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span><i className="fa-solid fa-graduation-cap"></i> {camp.nome}</span>
                      {camp.apenas_admin && <span style={{ fontSize: '0.7rem', color: '#dc3545', fontWeight: 'bold', marginTop: '4px' }}><i className="fa-solid fa-lock"></i> Funil Restrito</span>}
                    </div>
                  </CardTitle>
                  <CardActions>
                    <IconButton onClick={() => duplicarCampanha(camp)} title="Duplicar campanha">
                      <i className="fa-solid fa-copy"></i>
                    </IconButton>
                    <IconButton onClick={() => alternarArquivamento(camp.id, camp.arquivada)} title={camp.arquivada ? "Desarquivar" : "Arquivar"}>
                      <i className={`fa-solid ${camp.arquivada ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                    </IconButton>
                    <IconButton onClick={() => abrirModalEdicao(camp)} className="edit" title="Editar">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </IconButton>
                    <IconButton onClick={() => iniciarExclusao(camp)} className="delete" title="Excluir Definitivamente">
                      <i className="fa-solid fa-trash"></i>
                    </IconButton>
                  </CardActions>
                </CardHeader>

                {(() => {
                  const st = calcularStatusCampanha(camp);
                  const pct = calcularProgressoTemporal(camp);
                  return (
                    <>
                      <StatusChip $cor={st.cor} $bg={st.bg}>{st.label}</StatusChip>
                      {pct !== null && (
                        <ProgressBar>
                          <ProgressFill $pct={pct} $encerrada={st.label === 'Encerrada'} />
                          <ProgressLabel>{pct}% do período</ProgressLabel>
                        </ProgressBar>
                      )}
                    </>
                  );
                })()}

                <CardDescription>{camp.descricao || 'Sem descrição definida.'}</CardDescription>

                <CardDates>
                  <div><i className="fa-solid fa-play text-green"></i> Início: {formatarDataBR(camp.data_inicio)}</div>
                  <div><i className="fa-solid fa-stop text-red"></i> Fim: {formatarDataBR(camp.data_fim)}</div>
                </CardDates>

                <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <BotaoExportar tipo="campanha" params={{ campanha_id: camp.id }} label="Exportar campanha" />
                </div>

                <ModulesSection>
                  <h4 className="section-title"><i className="fa-solid fa-calendar-days"></i> Turmas / Módulos ({camp.listaModulos?.length || 0})</h4>
                  {camp.listaModulos?.length > 0 ? (
                    <div className="modules-list" style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {camp.listaModulos.map(mod => (
                        <ModuleItem key={mod.id}>
                          <span className="module-name">{mod.nome}</span>
                          <span className="module-price">{formatarMoeda(mod.valor)}</span>
                        </ModuleItem>
                      ))}
                    </div>
                  ) : (<span className="empty-text">Nenhum módulo registrado.</span>)}
                </ModulesSection>
              </CampaignCard>
            ))}
          </CampaignsGrid>
        )}

        {/* MODAL DE CONTA MATEMÁTICA PARA EXCLUSÃO */}
        {modalExcluir && (
          <ModalOverlay onClick={() => setModalExcluir(false)}>
            <ModalContent $small onClick={e => e.stopPropagation()}>
              <ModalBody>
                <MathWarningIcon className="fa-solid fa-triangle-exclamation" />
                <MathTitle>Confirmação de Exclusão</MathTitle>
                <MathSubtitle>
                  Você está prestes a excluir o curso <strong>{campanhaExcluir?.nome}</strong> e todas as suas etapas e módulos.<br/>Esta ação não pode ser desfeita.
                </MathSubtitle>
                
                <MathBox>
                  <label>Para confirmar, resolva o cálculo abaixo:</label>
                  <div className="equation">
                    <span>{contaMath.a}</span> + <span>{contaMath.b}</span> = 
                    <input 
                      type="number" 
                      value={respostaMath} 
                      onChange={e => setRespostaMath(e.target.value)} 
                      autoFocus
                    />
                  </div>
                </MathBox>
              </ModalBody>
              <ModalFooter>
                <SecondaryButton onClick={() => setModalExcluir(false)}>Cancelar</SecondaryButton>
                <DangerButton onClick={processarExclusao}>Excluir Curso</DangerButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* MODAL PADRÃO DE CRIAÇÃO / EDIÇÃO */}
        {mostrarModal && (
          <ModalOverlay onClick={() => setMostrarModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              
              <ModalHeader>
                <h3>{editandoId ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                <CloseButton onClick={() => setMostrarModal(false)}>&times;</CloseButton>
              </ModalHeader>

              <form onSubmit={salvarCampanha} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <ModalBody>
                  <FormGroup style={{ marginTop: '10px' }}>
                    <Label>Nome do Curso/Campanha *</Label>
                    <Input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                  </FormGroup>

                  {/* NOVOS CONTROLES DE SISTEMA: Restrição e Remetente */}
                  <SectionCard $bgColor="#f8f9fa" $borderColor="#dce1e6" style={{marginTop: '15px'}}>
                    <SectionTitle $color="#1F4E79"><i className="fa-solid fa-gears"></i> Controle de Disparos e Acesso</SectionTitle>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup>
                        <Label>Conta de E-mail para Disparo (n8n)</Label>
                        <Select value={emailRemetente} onChange={e => setEmailRemetente(e.target.value)}>
                          <option value="">-- Padrão (Sem roteamento específico) --</option>
                          <option value="camila">Camila (camila@...)</option>
                          <option value="daniel">Daniel (daniel@...)</option>
                          <option value="julia">Julia (julia@...)</option>
                        </Select>
                      </FormGroup>
                      
                      <FormGroup>
                        <Label>Exclusividade do Funil</Label>
                        <CheckboxWrapper $active={apenasAdmin} onClick={() => setApenasAdmin(!apenasAdmin)}>
                          <input type="checkbox" checked={apenasAdmin} readOnly />
                          <div className="chk-text">
                            <strong><i className="fa-solid fa-lock"></i> Restringir Acesso</strong>
                            <span>Apenas Administradores verão este Funil.</span>
                          </div>
                        </CheckboxWrapper>
                      </FormGroup>
                    </FormGrid>
                  </SectionCard>
                    
                  <SectionCard $bgColor="#f0f4f8" $borderColor="#d0d7de">
                    <SectionTitle $color="#1F4E79"><i className="fa-solid fa-users-gear"></i> Automação: Público e Validade</SectionTitle>
                    
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup className="span-2">
                        <Label>Quais Cargos receberão a campanha? (Múltipla escolha)</Label>
                        <CheckboxGroup>
                          {listaCargos.length === 0 ? (
                            <span style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>Nenhum cargo cadastrado no banco. Adicione na tela de Contatos.</span>
                          ) : (
                            listaCargos.map(cargo => (
                              <CheckboxPill key={cargo} $active={cargosAlvo.includes(cargo)}>
                                <input type="checkbox" checked={cargosAlvo.includes(cargo)} onChange={() => toggleCargo(cargo)} />
                                {cargo}
                              </CheckboxPill>
                            ))
                          )}
                        </CheckboxGroup>
                      </FormGroup>
                      
                      <FormGroup className="span-2">
                        <Label>
                          Estados que receberão as negociações
                          <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                            ({ufsAlvo.length === 0 ? 'Todos os estados' : `${ufsAlvo.length} selecionado${ufsAlvo.length > 1 ? 's' : ''}`})
                          </span>
                        </Label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <button type="button" style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                            onClick={() => setUfsAlvo([])}>
                            Todos
                          </button>
                          <button type="button" style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                            onClick={() => setUfsAlvo([...LISTA_UFS])}>
                            Selecionar todos
                          </button>
                        </div>
                        <CheckboxGroup>
                          {LISTA_UFS.map(uf => (
                            <CheckboxPill key={uf} $active={ufsAlvo.includes(uf)}
                              style={{ minWidth: 52, justifyContent: 'center' }}>
                              <input type="checkbox" checked={ufsAlvo.includes(uf)}
                                onChange={() => setUfsAlvo(prev => prev.includes(uf) ? prev.filter(u => u !== uf) : [...prev, uf])} />
                              {uf}
                            </CheckboxPill>
                          ))}
                        </CheckboxGroup>
                      </FormGroup>

                      <FormGroup className="span-2">
                        <Label>
                          Tipos de órgão que receberão as negociações
                          <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                            ({tiposOrgaoAlvo.length === 0 ? 'Todos os tipos' : `${tiposOrgaoAlvo.length} selecionado${tiposOrgaoAlvo.length > 1 ? 's' : ''}`})
                          </span>
                        </Label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <button type="button" style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                            onClick={() => setTiposOrgaoAlvo([])}>
                            Todos
                          </button>
                          <button type="button" style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                            onClick={() => setTiposOrgaoAlvo(TIPOS_ORGAO.map(t => t.valor))}>
                            Selecionar todos
                          </button>
                        </div>
                        <CheckboxGroup>
                          {TIPOS_ORGAO.map(tipo => (
                            <CheckboxPill key={tipo.valor} $active={tiposOrgaoAlvo.includes(tipo.valor)}>
                              <input type="checkbox" checked={tiposOrgaoAlvo.includes(tipo.valor)}
                                onChange={() => setTiposOrgaoAlvo(prev => prev.includes(tipo.valor) ? prev.filter(t => t !== tipo.valor) : [...prev, tipo.valor])} />
                              {tipo.rotulo}
                            </CheckboxPill>
                          ))}
                        </CheckboxGroup>
                      </FormGroup>

                      <FormGroup className="span-2">
                        <Label>
                          Prioridade de disparo por estado
                          <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                            (atende todo o público normalmente, mas envia primeiro pros estados aqui, na ordem definida)
                          </span>
                        </Label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <Select
                            value=""
                            onChange={e => adicionarUfPrioridade(e.target.value)}
                            style={{ maxWidth: 220 }}
                          >
                            <option value="">+ Adicionar estado à prioridade...</option>
                            {LISTA_UFS.filter(uf => !ufsPrioridade.includes(uf)).map(uf => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </Select>
                        </div>
                        {ufsPrioridade.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>
                            Nenhuma prioridade definida — envio segue ordem padrão (por nome do órgão).
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
                            {ufsPrioridade.map((uf, indice) => (
                              <div key={uf} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 10px', borderRadius: 6,
                                border: '1px solid #cbd5e1', background: '#e7f3ff'
                              }}>
                                <strong style={{ color: '#007bff', minWidth: 28 }}>{indice + 1}º</strong>
                                <span style={{ flex: 1 }}>{uf}</span>
                                <button type="button" title="Subir prioridade" disabled={indice === 0}
                                  onClick={() => moverUfPrioridade(indice, -1)}
                                  style={{ border: 'none', background: 'none', cursor: indice === 0 ? 'default' : 'pointer', opacity: indice === 0 ? 0.3 : 1 }}>
                                  <i className="fa-solid fa-arrow-up"></i>
                                </button>
                                <button type="button" title="Descer prioridade" disabled={indice === ufsPrioridade.length - 1}
                                  onClick={() => moverUfPrioridade(indice, 1)}
                                  style={{ border: 'none', background: 'none', cursor: indice === ufsPrioridade.length - 1 ? 'default' : 'pointer', opacity: indice === ufsPrioridade.length - 1 ? 0.3 : 1 }}>
                                  <i className="fa-solid fa-arrow-down"></i>
                                </button>
                                <button type="button" title="Remover" onClick={() => removerUfPrioridade(uf)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                  <i className="fa-solid fa-times"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </FormGroup>

                      <FormGroup>
                        <Label $color="#28a745">Data de Início</Label>
                        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                      </FormGroup>
                      <FormGroup>
                        <Label $color="#dc3545">Data Limite (Fim)</Label>
                        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                      </FormGroup>
                    </FormGrid>
                  </SectionCard>

                  <FormGroup>
                    <Label>Descrição Breve</Label>
                    <TextArea value={descricao} onChange={e => setDescricao(e.target.value)} rows="2" />
                  </FormGroup>

                  <FormGroup>
                    <Label>Informação Extra</Label>
                    <TextArea value={informacaoExtra} onChange={e => setInformacaoExtra(e.target.value)} placeholder="Use este espaço para links, detalhes ou observações..." rows="3" />
                  </FormGroup>

                  <SectionCard $bgColor="#f4fbf5" $borderColor="#c3e6cb">
                    <SectionTitle $color="#28a745"><i className="fa-solid fa-calendar-days"></i> Gerenciar Módulos e Preços</SectionTitle>
                    
                    <ModuleInputGrid>
                      <FormGroup><Label $small>Novo Módulo</Label><Input type="text" value={modNome} onChange={e => setModNome(e.target.value)} placeholder="Nome" /></FormGroup>
                      <FormGroup><Label $small $color="#007bff">Preço</Label><Input type="number" step="0.01" value={modValor} onChange={e => setModValor(e.target.value)} /></FormGroup>
                      <FormGroup><Label $small>Início da Aula</Label><Input type="date" value={modEvento} onChange={e => setModEvento(e.target.value)} /></FormGroup>
                      <FormGroup><Label $small>Fim da Aula</Label><Input type="date" value={modEventoFim} onChange={e => setModEventoFim(e.target.value)} /></FormGroup>
                      <AddButton type="button" onClick={adicionarModulo}>+ ADD</AddButton>
                    </ModuleInputGrid>
                    
                    {modulos.length > 0 && (
                      <ModulesList>
                        {modulos.map((mod, index) => (
                          <ModuleRow key={index}>
                            <Input type="text" value={mod.nome} onChange={e => atualizarModulo(index, 'nome', e.target.value)} />
                            <Input type="number" step="0.01" value={mod.valor} onChange={e => atualizarModulo(index, 'valor', e.target.value)} className="highlight" />
                            <Input type="date" value={mod.data_evento || ''} onChange={e => atualizarModulo(index, 'data_evento', e.target.value)} title="Data Início" />
                            <Input type="date" value={mod.data_evento_fim || ''} onChange={e => atualizarModulo(index, 'data_evento_fim', e.target.value)} title="Data Fim" />
                            <IconButton type="button" className="delete" onClick={() => removerModulo(index)}>
                              <i className="fa-solid fa-times-circle"></i>
                            </IconButton>
                          </ModuleRow>
                        ))}
                      </ModulesList>
                    )}
                  </SectionCard>

                  {!editandoId && (
                    <SectionCard $bgColor="#f8f9fa" $borderColor="#eee">
                      <SectionTitle $color="#007bff"><i className="fa-solid fa-list-ol"></i> Etapas do Funil</SectionTitle>
                      
                      <AddStageRow>
                        <Input type="text" value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); adicionarEtapa(); }}} placeholder="Nome da nova etapa..." />
                        <SecondaryButton type="button" onClick={adicionarEtapa}>Adicionar</SecondaryButton>
                      </AddStageRow>
                      
                      <StagesList>
                        {etapas.map((etp, index) => (
                          <StageItem key={index}>
                            <span className="stage-name"><span className="stage-index">{index + 1}.</span> {etp}</span>
                            <IconButton type="button" className="delete" onClick={() => removerEtapa(index)}>
                              <i className="fa-solid fa-times"></i>
                            </IconButton>
                          </StageItem>
                        ))}
                      </StagesList>
                    </SectionCard>
                  )}

                  <SectionCard $bgColor="#eef6ff" $borderColor="#b8daff">
                    <SectionTitle $color="#007bff"><i className="fa-solid fa-window-maximize"></i> Landing Page — Formulário</SectionTitle>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0' }}>
                      Define para onde o lead vai no funil ao preencher a página: primeira inscrição → etapa escolhida abaixo; se já existir negociação da mesma prefeitura na campanha → move para a etapa de inscrito (mesmo com outro e-mail/contato).
                    </p>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup>
                        <Label>Etapa ao inscrever (novo lead)</Label>
                        {editandoId ? (
                          <Select value={etapaInscricaoId} onChange={e => setEtapaInscricaoId(e.target.value)} required>
                            <option value="">-- Selecione --</option>
                            {etapasFunil.map(e => (
                              <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>
                            ))}
                          </Select>
                        ) : (
                          <Select value={etapaInscricaoNome} onChange={e => setEtapaInscricaoNome(e.target.value)} required>
                            <option value="">-- Selecione --</option>
                            {etapas.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </Select>
                        )}
                      </FormGroup>
                      <FormGroup>
                        <Label>Etapa se já tiver negociação (vendido)</Label>
                        {editandoId ? (
                          <Select value={etapaVendaId} onChange={e => setEtapaVendaId(e.target.value)} required>
                            <option value="">-- Selecione --</option>
                            {etapasFunil.map(e => (
                              <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>
                            ))}
                          </Select>
                        ) : (
                          <Select value={etapaVendaNome} onChange={e => setEtapaVendaNome(e.target.value)} required>
                            <option value="">-- Selecione --</option>
                            {etapas.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </Select>
                        )}
                      </FormGroup>
                    </FormGrid>
                  </SectionCard>
                </ModalBody>

                <ModalFooter>
                  <SecondaryButton type="button" onClick={() => setMostrarModal(false)}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit">Salvar Configurações</PrimaryButton>
                </ModalFooter>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

      </PageContainer>
    </>
  );
}

// ==========================================
// STYLED COMPONENTS (Responsivos & Premium)
// ==========================================
const PageContainer = styled.div`
  padding: 30px;
  background-color: #f4f7f6;
  min-height: calc(100vh - 70px);
  @media (max-width: 768px) { padding: 15px; }
`;
const LoadingContainer = styled.div`
  text-align: center; padding: 60px; color: #6c757d; font-size: 1.1rem; 
  i { font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1; }
`;
const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; .btn-mobile { width: 100%; justify-content: center; } }
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;
const TabsContainer = styled.div`
  display: flex; gap: 10px; margin-top: 15px;
  @media (max-width: 600px) { width: 100%; flex-wrap: wrap; button { flex: 1; justify-content: center; } }
`;
const TabButton = styled.button`
  padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;
  background: ${props => props.$active ? '#1F4E79' : '#e9ecef'};
  color: ${props => props.$active ? '#ffffff' : '#6c757d'};
  &:hover { background: ${props => props.$active ? '#1F4E79' : '#dde2e6'}; }
`;
const EmptyState = styled.div`
  padding: 50px; text-align: center; background: #ffffff; border: 2px dashed #dce1e6; border-radius: 12px; color: #a0aec0; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px;
  i { font-size: 2.5rem; color: #cbd5e1; }
`;

/* CORREÇÃO DO GRID PARA NÃO QUEBRAR O IPHONE */
const CampaignsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const CampaignCard = styled.div`
  background: #ffffff; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #edf2f9; transition: transform 0.2s ease, box-shadow 0.2s ease;
  opacity: ${props => props.$arquivada ? 0.7 : 1}; filter: ${props => props.$arquivada ? 'grayscale(20%)' : 'none'};
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
`;
const CardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 10px;
`;
const CardTitle = styled.div`
  margin: 0; color: ${props => props.$arquivada ? '#6c757d' : '#007bff'}; font-size: 1.15rem; font-weight: 700;
`;
const CardActions = styled.div`
  display: flex; gap: 5px; flex-shrink: 0;
`;
const IconButton = styled.button`
  background: none; border: none; color: #6c757d; cursor: pointer; padding: 6px; font-size: 1.1rem; border-radius: 4px; transition: all 0.2s ease;
  &:hover { background: #f8f9fa; color: #343a40; }
  &.edit:hover { color: #ffc107; background: #fffbeb; }
  &.delete:hover { color: #dc3545; background: #fdf5f6; }
`;
const CardDescription = styled.p`
  color: #555; font-size: 0.9rem; min-height: 40px; margin: 0 0 15px 0; line-height: 1.4;
`;
const CardDates = styled.div`
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; background: #f8fafc; padding: 10px 12px; border-radius: 6px; font-weight: 500; color: #495057;
  .text-green { color: #28a745; margin-right: 5px; }
  .text-red { color: #dc3545; margin-right: 5px; }
`;
const ModulesSection = styled.div`
  margin-top: 15px; border-top: 1px solid #edf2f9; padding-top: 15px;
  .section-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
  .modules-list { display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; padding-right: 5px;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: #f8fafc; border-radius: 12px; }
    &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
  }
  .empty-text { font-size: 0.85rem; color: #a0aec0; font-style: italic; }
`;
const ModuleItem = styled.div`
  background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; border-left: 3px solid #28a745; display: flex; justify-content: space-between; align-items: center;
  .module-name { font-weight: 600; color: #333; } .module-price { font-weight: 700; color: #28a745; }
`;

const BuscaBar = styled.div`
  display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin-bottom: 18px;
  i { color: #94a3b8; font-size: 0.9rem; }
  input { flex: 1; border: none; outline: none; font-size: 0.9rem; color: #374151; background: transparent; }
  input::placeholder { color: #94a3b8; }
  button { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 2px 4px; &:hover { color: #64748b; } }
`;

const StatusChip = styled.span`
  display: inline-block; margin: 6px 0 10px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
  color: ${p => p.$cor}; background: ${p => p.$bg}; border: 1px solid ${p => p.$cor}33;
`;

const ProgressBar = styled.div`
  position: relative; height: 6px; background: #e2e8f0; border-radius: 3px; margin-bottom: 12px; overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%; width: ${p => p.$pct}%; border-radius: 3px;
  background: ${p => p.$encerrada ? '#9ca3af' : 'linear-gradient(90deg, #22c55e, #16a34a)'};
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.span`
  position: absolute; right: 0; top: -16px; font-size: 0.68rem; color: #94a3b8; font-weight: 600;
`;

/* CORREÇÃO DO MODAL PARA IPHONE (100dvh) */
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px); padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box;
`;
const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: ${props => props.$small ? '420px' : '800px'}; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.2);
`;
const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 25px 30px; border-bottom: 1px solid #edf2f9; flex-shrink: 0;
  h3 { margin: 0; color: #2c3e50; font-size: 1.4rem; }
  @media (max-width: 600px) { padding: 15px; h3 { font-size: 1.2rem; padding-right: 30px; } }
`;

/* CORREÇÃO DE SCROLL INTERNO DO MODAL */
const ModalBody = styled.div`
  padding: 25px 30px;
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #f8fafc; border-radius: 12px; margin: 8px 0; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  @media (max-width: 600px) { padding: 15px; }
`;

const ModalFooter = styled.div`
  display: flex; justify-content: ${props => props.$small ? 'space-between' : 'flex-end'}; gap: 12px; padding: 20px 30px; background: #fbfbfc; border-top: 1px solid #edf2f9; border-radius: 0 0 12px 12px; flex-shrink: 0;
  @media (max-width: 600px) { flex-direction: column; button { width: 100%; justify-content: center; } }
`;
const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; color: #a0aec0; cursor: pointer; transition: 0.2s; line-height: 1;
  &:hover { color: #dc3545; }
  @media (max-width: 600px) { position: absolute; right: 15px; top: 15px; }
`;
const FormGrid = styled.div`
  display: grid; grid-template-columns: ${props => props.$columns || '1fr'}; gap: 15px; margin-bottom: 15px;
  .span-2 { grid-column: span 2; }
  @media (max-width: 768px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
`;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const Label = styled.label`
  font-weight: 600; font-size: ${props => props.$small ? '0.75rem' : '0.9rem'}; color: ${props => props.$color || '#495057'};
`;
const Input = styled.input`
  width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; background-color: #ffffff; transition: all 0.2s; box-sizing: border-box;
  &:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight { border-color: #007bff; background-color: #f0f7ff; }
`;
const Select = styled.select`
  width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; background-color: #ffffff; transition: all 0.2s; box-sizing: border-box;
  &:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;
const TextArea = styled.textarea`
  width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; background-color: #ffffff; resize: vertical; transition: all 0.2s; box-sizing: border-box;
  &:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;
const SectionCard = styled.div`
  background: ${props => props.$bgColor || '#f8f9fa'}; border: 1px solid ${props => props.$borderColor || '#e9ecef'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;
  @media (max-width: 600px) { padding: 15px; }
`;
const SectionTitle = styled.h4`
  margin: 0 0 15px 0; color: ${props => props.$color || '#333'}; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;
`;
const ButtonBase = styled.button`
  padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
  &:active { transform: scale(0.98); }
`;
const PrimaryButton = styled(ButtonBase)`
  background: #007bff; color: #fff; &:hover { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }
`;
const SecondaryButton = styled(ButtonBase)`
  background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; }
`;
const DangerButton = styled(ButtonBase)`
  background: #dc3545; color: #fff; &:hover { background: #c82333; box-shadow: 0 4px 10px rgba(220,53,69,0.2); }
`;
const AddButton = styled(ButtonBase)`
  background: #28a745; color: #fff; padding: 10px; &:hover { background: #218838; }
`;
const CheckboxGroup = styled.div`
  display: flex; flex-wrap: wrap; gap: 10px;
`;
const CheckboxPill = styled.label`
  display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  background: ${props => props.$active ? '#e7f3ff' : '#ffffff'};
  border: 1px solid ${props => props.$active ? '#007bff' : '#cbd5e1'};
  color: ${props => props.$active ? '#007bff' : '#64748b'};
  input { display: none; }
  &:hover { background: ${props => props.$active ? '#d6ebff' : '#f8fafc'}; }
`;
const ModuleInputGrid = styled.div`
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px dashed #c3e6cb;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const ModulesList = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;
const ModuleRow = styled.div`
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: center; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const AddStageRow = styled.div`
  display: flex; gap: 10px; margin-bottom: 15px;
  @media (max-width: 600px) { flex-direction: column; button { width: 100%; } }
`;
const StagesList = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;
const StageItem = styled.div`
  display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 15px; border-radius: 6px; border: 1px solid #e2e8f0;
  .stage-name { font-weight: 600; color: #475569; }
  .stage-index { color: #007bff; margin-right: 8px; }
`;
const MathWarningIcon = styled.i`
  font-size: 3.5rem; color: #dc3545; margin-bottom: 15px; display: block; text-align: center;
`;
const MathTitle = styled.h3`
  margin: 0 0 10px 0; color: #2c3e50; font-size: 1.4rem; text-align: center;
`;
const MathSubtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5; text-align: center;
`;
const MathBox = styled.div`
  background: #fff5f5; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb;
  label { display: block; font-weight: 600; color: #c82333; margin-bottom: 12px; text-align: center;}
  .equation { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 1.8rem; font-weight: bold; color: #333;
    input { width: 80px; padding: 10px; font-size: 1.4rem; text-align: center; border: 2px solid #cbd5e1; border-radius: 8px; box-sizing: border-box;
      &:focus { border-color: #dc3545; outline: none; box-shadow: 0 0 0 3px rgba(220,53,69,0.15); }
    }
  }
`;
const CheckboxWrapper = styled.label`
  display: flex; align-items: center; gap: 12px; padding: 15px; border-radius: 8px; cursor: pointer; transition: 0.2s; border: 1px solid ${props => props.$active ? '#f5c6cb' : '#e2e8f0'}; background: ${props => props.$active ? '#fdf5f6' : '#ffffff'};
  input[type="checkbox"] { transform: scale(1.3); accent-color: #dc3545; cursor: pointer; }
  .chk-text { display: flex; flex-direction: column; gap: 2px; strong { color: ${props => props.$active ? '#c82333' : '#475569'}; font-size: 0.95rem; i { color: ${props => props.$active ? '#dc3545' : '#cbd5e1'}; }} span { font-size: 0.8rem; color: #64748b; }}
`;