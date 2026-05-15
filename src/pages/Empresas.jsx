import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import { Header } from '../componentes/Header.jsx';

// --- UTILITÁRIO DE SEGURANÇA PARA JSON ---
const parseJSONSeguro = (dadoString, fallback = []) => {
  if (!dadoString) return fallback;
  if (typeof dadoString !== 'string') return dadoString;
  try { return JSON.parse(dadoString); } catch { return fallback; }
};

export function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const perfilUsuario = localStorage.getItem('perfil');
  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

  // === FILTROS DA TABELA ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('');

  const [dropdownEstadoAberto, setDropdownEstadoAberto] = useState(false);
  const [dropdownClassificacaoAberto, setDropdownClassificacaoAberto] = useState(false);
  const dropdownEstadoRef = useRef(null);
  const dropdownClassificacaoRef = useRef(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;
  
  // === ESTADOS DO SUPER MODAL (VISUALIZAÇÃO / EDIÇÃO) ===
  const [mostrarModalEmpresa, setMostrarModalEmpresa] = useState(false);
  const [modoEdicaoEmpresa, setModoEdicaoEmpresa] = useState(false); 
  const [detalhesEmpresa, setDetalhesEmpresa] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Estados dos Campos do Formulário da Empresa
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefones, setTelefones] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [classificacao, setClassificacao] = useState('nao_assessorada');
  const [estrelas, setEstrelas] = useState(0);

  // === CONTROLE DO SUB-MODAL DE CONTATO RÁPIDO ===
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

  const listaEstados = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const buscarEmpresas = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await axios.get(`${API_URL}/empresas`, getHeaders());
      setEmpresas(resposta.data);
    } catch (erro) {
      console.error('Erro ao buscar empresas:', erro);
    } finally {
      setCarregando(false);
    }
  }, [API_URL, getHeaders]);

  useEffect(() => {
    buscarEmpresas();
  }, [buscarEmpresas]);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(event.target)) setDropdownEstadoAberto(false);
      if (dropdownClassificacaoRef.current && !dropdownClassificacaoRef.current.contains(event.target)) setDropdownClassificacaoAberto(false);
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);


  // --- FUNÇÕES DE FORMATAÇÃO E UI ---
  function formatarData(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarTelefoneParaLink(telefoneStr) {
    if (!telefoneStr) return '';
    return telefoneStr.replace(/[^0-9]/g, '');
  }

  const renderStars = (rating, readonly = true) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i 
          key={i} 
          className={`fa-solid fa-star ${i <= rating ? 'active' : ''}`}
          onClick={!readonly ? () => setEstrelas(rating === i ? 0 : i) : undefined}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        ></i>
      );
    }
    return <StarsContainer $readonly={readonly}>{stars}</StarsContainer>;
  };

  // --- REQUISIÇÕES ---
  async function popularEstado() {
    const uf = prompt("Digite a UF do estado que deseja popular (Ex: RS, SC, SP):");
    if (!uf || uf.length !== 2) return alert("UF Inválida");

    if (!window.confirm(`Deseja importar todas as prefeituras de ${uf.toUpperCase()}?`)) return;

    setCarregando(true);
    try {
      const res = await axios.post(`${API_URL}/empresas/popular/${uf}`, {}, getHeaders());
      alert(`Sucesso! ${res.data.novos_inseridos} novas prefeituras importadas.`);
      buscarEmpresas(); 
    } catch (error) {
      alert("Erro na importação.");
    } finally {
      setCarregando(false);
    }
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

  // --- AÇÕES DOS MODAIS ---
  function abrirModalNovo() {
    setEditandoId(null); 
    setNome(''); setEstado(''); setCidade(''); setTelefones(''); setHorarioFuncionamento(''); 
    setClassificacao('nao_assessorada'); setEstrelas(0); 
    setDetalhesEmpresa(null);
    setModoEdicaoEmpresa(true); 
    setMostrarModalEmpresa(true);
  }

  function abrirModalDetalhes(emp) {
    setEditandoId(emp.id);
    setNome(emp.nome || '');
    setEstado(emp.estado || '');
    setCidade(emp.cidade || '');
    setTelefones(emp.telefones || '');
    setHorarioFuncionamento(emp.horario_funcionamento || '');
    setClassificacao(emp.classificacao || 'nao_assessorada');
    setEstrelas(emp.estrelas !== undefined ? emp.estrelas : 0);
    
    setModoEdicaoEmpresa(false); 
    setMostrarModalEmpresa(true);
    
    recarregarVisao360(emp.id);
  }

  async function abrirDetalhesOp(op) {
    setOpSelecionada(op);
    setMostrarModalOp(true);
    setCarregandoNotas(true);
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${op.id}/notas`, getHeaders());
      setNotasOp(res.data);
    } catch(e) {
      console.error("Erro ao buscar notas:", e);
    } finally {
      setCarregandoNotas(false);
    }
  }

  function abrirDetalheContato(contato) {
    setContatoSelecionado(contato);
    setContatoNome(contato.nome || '');
    setContatoCargo(contato.cargo || '');
    
    const emails = parseJSONSeguro(contato.emails_json, []);
    setContatoEmails(emails.join(', '));
    
    const tels = parseJSONSeguro(contato.telefones_json, []);
    setContatoTelefonesRapido(tels.join(', '));
    
    setEditandoContatoRapido(false);
    setMostrarModalContato(true);
  }

  // --- SALVAMENTO E EXCLUSÃO ---
  async function salvarEmpresa(e) {
    e.preventDefault();
    const dados = { nome, estado, cidade, telefones, horario_funcionamento: horarioFuncionamento, classificacao, estrelas };
    try {
      if (editandoId) {
        await axios.put(`${API_URL}/empresas/${editandoId}`, dados, getHeaders());
        setModoEdicaoEmpresa(false); 
        recarregarVisao360(editandoId); 
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

  // ==========================================
  // MEMOIZAÇÕES DE PERFORMANCE
  // ==========================================
  const empresasFiltradas = useMemo(() => {
    const termo = buscaGeral.toLowerCase();
    return empresas.filter(emp => {
      const matchBusca = (emp.nome || '').toLowerCase().includes(termo) ||
                         (emp.cidade || '').toLowerCase().includes(termo);
      const matchEstado = filtroEstado === '' || (emp.estado || '').toUpperCase() === filtroEstado.toUpperCase();
      
      const matchClass = filtroClassificacao === '' || (emp.classificacao || 'nao_assessorada') === filtroClassificacao;
      
      return matchBusca && matchEstado && matchClass;
    });
  }, [empresas, buscaGeral, filtroEstado, filtroClassificacao]);

  const empresasOrdenadas = useMemo(() => {
    return [...empresasFiltradas].sort((a, b) => {
      const aEstrelas = a.estrelas !== undefined ? a.estrelas : 0;
      const bEstrelas = b.estrelas !== undefined ? b.estrelas : 0;
      if (bEstrelas !== aEstrelas) return bEstrelas - aEstrelas;
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [empresasFiltradas]);

  const itensAtuais = useMemo(() => {
    return empresasOrdenadas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  }, [empresasOrdenadas, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(empresasOrdenadas.length / itensPorPagina);

  const kpisEmpresa = useMemo(() => {
    let valAndamento = 0, valGanho = 0, valPerdido = 0, totalOportunidades = 0;
    
    if (detalhesEmpresa && detalhesEmpresa.oportunidades) {
      const statusSucesso = ['ganho', 'inscricao'];
      const statusPerdido = ['perdido', 'naofunciona', 'naoatendeu'];
      const statusAndamento = ['aberto', 'tarefa', 'avaliar', 'interessada'];

      totalOportunidades = detalhesEmpresa.oportunidades.length;
      detalhesEmpresa.oportunidades.forEach(op => {
        const v = Number(op.valor) || 0;
        if (statusSucesso.includes(op.status)) valGanho += v;
        else if (statusPerdido.includes(op.status)) valPerdido += v;
        else if (statusAndamento.includes(op.status)) valAndamento += v; 
      });
    }
    return { valAndamento, valGanho, valPerdido, totalOportunidades };
  }, [detalhesEmpresa]);

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  return (
    <>
      <PageContainer>
        <TopSection>
          <div>
            <Title>Base de Prefeituras / Empresas</Title>
            <Subtitle>Controle de temperatura, assessoria e cadastro de clientes.</Subtitle>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
            <InfoButton onClick={popularEstado} className="btn-mobile">
              <i className="fa-solid fa-file-import"></i> Importar IBGE
            </InfoButton>
            <PrimaryButton onClick={abrirModalNovo} className="btn-mobile">
              <i className="fa-solid fa-plus-circle"></i> Nova Empresa
            </PrimaryButton>
          </div>
        </TopSection>

        {/* BARRA DE FILTROS MODERNIZADA */}
        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input 
              type="text" 
              placeholder="Pesquisar por Nome ou Cidade..." 
              value={buscaGeral} 
              onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }} 
            />
          </SearchWrapper>

          <FilterPillWrapper ref={dropdownEstadoRef}>
            <FilterButton $hasValue={!!filtroEstado} onClick={() => setDropdownEstadoAberto(!dropdownEstadoAberto)}>
              <i className="fa-solid fa-map-location-dot icon"></i> 
              <span>UF: <strong>{filtroEstado || 'Todas'}</strong></span>
              <i className={`fa-solid fa-chevron-${dropdownEstadoAberto ? 'up' : 'down'} arrow`}></i>
            </FilterButton>
            {dropdownEstadoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroEstado === ''} onClick={() => { setFiltroEstado(''); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>Todas as UFs</CustomDropdownItem>
                {listaEstados.map(uf => (
                  <CustomDropdownItem key={uf} $active={filtroEstado === uf} onClick={() => { setFiltroEstado(uf); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>{uf}</CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>

          <FilterPillWrapper ref={dropdownClassificacaoRef}>
            <FilterButton $hasValue={!!filtroClassificacao} onClick={() => setDropdownClassificacaoAberto(!dropdownClassificacaoAberto)}>
              <i className="fa-solid fa-fire icon"></i> 
              <span>Tipo: <strong>
                {filtroClassificacao === 'assessorada' ? '👑 Assessoradas' : 
                 filtroClassificacao === 'lead_quente' ? '🔥 Leads Quentes' : 
                 filtroClassificacao === 'nao_assessorada' ? '❄️ Frios' : 'Todos'}
              </strong></span>
              <i className={`fa-solid fa-chevron-${dropdownClassificacaoAberto ? 'up' : 'down'} arrow`}></i>
            </FilterButton>
            {dropdownClassificacaoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroClassificacao === ''} onClick={() => { setFiltroClassificacao(''); setDropdownClassificacaoAberto(false); setPaginaAtual(1); }}>Todos os Tipos</CustomDropdownItem>
                <CustomDropdownItem $active={filtroClassificacao === 'assessorada'} onClick={() => { setFiltroClassificacao('assessorada'); setDropdownClassificacaoAberto(false); setPaginaAtual(1); }}>👑 Assessoradas (VIP)</CustomDropdownItem>
                <CustomDropdownItem $active={filtroClassificacao === 'lead_quente'} onClick={() => { setFiltroClassificacao('lead_quente'); setDropdownClassificacaoAberto(false); setPaginaAtual(1); }}>🔥 Leads Quentes</CustomDropdownItem>
                <CustomDropdownItem $active={filtroClassificacao === 'nao_assessorada'} onClick={() => { setFiltroClassificacao('nao_assessorada'); setDropdownClassificacaoAberto(false); setPaginaAtual(1); }}>❄️ Frios (Padrão)</CustomDropdownItem>
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>
        </FilterBar>

        <Panel>
          <TabelaResponsiva>
            <Table>
              <thead className="sticky-head">
                <tr>
                  <th>Prefeitura / Empresa</th>
                  <th>Classificação</th>
                  <th>Temperatura</th>
                  <th className="text-center">Últ. Contato</th>
                  {perfilUsuario === 'admin' && <th className="text-center" style={{width: '80px'}}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan={perfilUsuario === 'admin' ? 5 : 4} className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando dados...</td></tr>
                ) : itensAtuais.length === 0 ? (
                  <tr><td colSpan={perfilUsuario === 'admin' ? 5 : 4} className="text-center text-muted">Nenhuma empresa encontrada com estes filtros.</td></tr>
                ) : (
                  itensAtuais.map((empresa, index) => (
                    <ClickableRow key={empresa.id} style={{ animationDelay: `${index * 0.05}s` }}>
                      <td data-label="Prefeitura / Empresa" onClick={() => abrirModalDetalhes(empresa)} title="Clique para ver o perfil">
                        <div className="main-name">
                          {empresa.nome}
                        </div>
                        <div className="meta">
                          <span><i className="fa-solid fa-location-dot"></i> {empresa.cidade || '-'} {empresa.estado ? `(${empresa.estado})` : ''}</span>
                        </div>
                      </td>
                      <td data-label="Classificação" onClick={() => abrirModalDetalhes(empresa)}>
                        <StatusBadge className={empresa.classificacao || 'nao_assessorada'}>
                          {empresa.classificacao === 'assessorada' ? '👑 Assessorada' : empresa.classificacao === 'lead_quente' ? '🔥 Lead Quente' : '❄️ Frio'}
                        </StatusBadge>
                      </td>
                      <td data-label="Temperatura" onClick={() => abrirModalDetalhes(empresa)}>
                        {renderStars(empresa.estrelas || 0, true)}
                      </td>
                      <td data-label="Últ. Contato" onClick={() => abrirModalDetalhes(empresa)} className="text-center text-muted font-bold">
                        {formatarData(empresa.ultimo_contato)}
                      </td>
                      {perfilUsuario === 'admin' && (
                        <td data-label="Ações" className="text-center">
                          <IconButton className="danger" onClick={() => deletarEmpresa(empresa.id)} title="Excluir"><i className="fa-solid fa-trash-can"></i></IconButton>
                        </td>
                      )}
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </Table>
          </TabelaResponsiva>

          {!carregando && empresasOrdenadas.length > 0 && (
            <PaginationContainer>
              <div className="info">Total: <strong>{empresasOrdenadas.length}</strong> empresas</div>
              <div className="controls">
                <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}><i className="fa-solid fa-angles-left"></i></PageButton>
                <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>Anterior</PageButton>
                <span className="current">{paginaAtual} / {totalPaginas}</span>
                <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>Próxima</PageButton>
                <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}><i className="fa-solid fa-angles-right"></i></PageButton>
              </div>
            </PaginationContainer>
          )}
        </Panel>

        {/* SUPER MODAL DE EMPRESA */}
        {mostrarModalEmpresa && (
          <ModalOverlay onClick={() => setMostrarModalEmpresa(false)}>
            <ModalContent $large onClick={e => e.stopPropagation()}>
              <ModalHeader $bg={modoEdicaoEmpresa ? '#1F4E79' : '#fff'} $color={modoEdicaoEmpresa ? '#fff' : '#2c3e50'}>
                <div>
                  <h3>
                    {modoEdicaoEmpresa ? (
                      <><i className="fa-solid fa-building"></i> {editandoId ? 'Editar Empresa' : 'Cadastrar Empresa'}</>
                    ) : (
                      <><i className="fa-solid fa-building-columns text-blue"></i> {nome}</>
                    )}
                  </h3>
                  {!modoEdicaoEmpresa && (
                    <div className="subtitle">
                      {classificacao === 'assessorada' && <span className="vip-badge" style={{fontSize: '0.85rem'}}><i className="fa-solid fa-crown"></i> Assessorada VIP</span>}
                      {classificacao === 'lead_quente' && <span className="vip-badge text-red" style={{fontSize: '0.85rem'}}><i className="fa-solid fa-fire"></i> Lead Quente</span>}
                      <span><i className="fa-solid fa-location-dot"></i> {cidade} - {estado}</span>
                    </div>
                  )}
                </div>
                <div className="actions">
                  {perfilUsuario === 'admin' && editandoId && !modoEdicaoEmpresa && (
                    <DangerButton onClick={() => deletarEmpresa(editandoId)}><i className="fa-solid fa-trash-can"></i> <span className="hide-mobile">Excluir</span></DangerButton>
                  )}
                  {!modoEdicaoEmpresa && (
                    <WarningButton onClick={() => setModoEdicaoEmpresa(true)}><i className="fa-solid fa-pen"></i> <span className="hide-mobile">Editar</span></WarningButton>
                  )}
                  <CloseButton $color={modoEdicaoEmpresa ? '#fff' : '#a0aec0'} onClick={() => setMostrarModalEmpresa(false)}>&times;</CloseButton>
                </div>
              </ModalHeader>

              <ModalBody>
                {!modoEdicaoEmpresa ? (
                  carregandoDetalhes ? (
                    <LoadingMsg><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Buscando histórico...</LoadingMsg>
                  ) : detalhesEmpresa ? (
                    <>
                      <KpiGrid>
                        <KpiCard $color="#007bff">
                          <div className="label">EM ANDAMENTO ({kpisEmpresa.totalOportunidades})</div>
                          <div className="val">{formatarMoeda(kpisEmpresa.valAndamento)}</div>
                        </KpiCard>
                        <KpiCard $color="#28a745" $bg="#f4fbf5">
                          <div className="label">TOTAL VENDIDO</div>
                          <div className="val">{formatarMoeda(kpisEmpresa.valGanho)}</div>
                        </KpiCard>
                        <KpiCard $color="#dc3545">
                          <div className="label">TOTAL PERDIDO</div>
                          <div className="val">{formatarMoeda(kpisEmpresa.valPerdido)}</div>
                        </KpiCard>
                      </KpiGrid>

                      <ProfileGrid>
                        <InfoCard $borderTop="#e2e8f0">
                          <h4><i className="fa-solid fa-circle-info text-blue"></i> Informações Cadastrais</h4>
                          <div className="info-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>Status no Funil:</strong> 
                            {detalhesEmpresa.empresa.classificacao === 'assessorada' ? <span className="text-yellow font-bold">👑 Assessorada VIP</span> : 
                             detalhesEmpresa.empresa.classificacao === 'lead_quente' ? <span className="text-red font-bold">🔥 Lead Quente</span> : 
                             <span className="text-muted font-bold">❄️ Frio Padrão</span>}
                             
                             <span style={{marginLeft: '10px'}}>{renderStars(detalhesEmpresa.empresa.estrelas || 0, true)}</span>
                          </div>
                          <div className="info-line"><strong>Telefone Geral:</strong> {detalhesEmpresa.empresa.telefones || '-'}</div>
                          <div className="info-line"><strong>Horário de Func.:</strong> {detalhesEmpresa.empresa.horario_funcionamento || '-'}</div>
                          <div className="info-line"><strong>Cadastrada em:</strong> {formatarData(detalhesEmpresa.empresa.criado_em)}</div>
                        </InfoCard>

                        <InfoCard $borderTop="#28a745">
                          <h4><i className="fa-solid fa-address-book text-green"></i> Contatos Vinculados ({detalhesEmpresa.contatos.length})</h4>
                          <div className="contacts-list">
                            {detalhesEmpresa.contatos.length === 0 ? (
                              <span className="empty">Nenhum contato atrelado.</span>
                            ) : (
                              detalhesEmpresa.contatos.map(c => (
                                <ContactItem key={c.id} onClick={() => abrirDetalheContato(c)}>
                                  <div className="c-info">
                                    <strong><i className="fa-solid fa-user"></i> {c.nome}</strong>
                                    <span>{c.cargo || 'Sem Cargo'}</span>
                                  </div>
                                  <i className="fa-solid fa-chevron-right text-blue"></i>
                                </ContactItem>
                              ))
                            )}
                          </div>
                        </InfoCard>
                      </ProfileGrid>

                      <HistorySection>
                        <h4><i className="fa-solid fa-clock-rotate-left text-purple"></i> Histórico de Negociações</h4>
                        {detalhesEmpresa.oportunidades.length === 0 ? (
                          <EmptyMsg>Não há histórico de negociações registradas.</EmptyMsg>
                        ) : (
                          <div className="h-list">
                            {detalhesEmpresa.oportunidades.map(op => {
                              let corBorda = '#cbd5e1'; let bgTag = '#f1f5f9'; let corTag = '#64748b'; let textoTag = 'Em Aberto';
                              if (op.status === 'naofunciona') { corBorda = '#f1c40f'; bgTag = '#fff9db'; corTag = '#b8860b'; textoTag = 'Não Funciona'; }
                              if (op.status === 'naoatendeu') { corBorda = '#e67e22'; bgTag = '#fff4e6'; corTag = '#d35400'; textoTag = 'Não Atendeu'; }
                              if (op.status === 'tarefa') { corBorda = '#6f42c1'; bgTag = '#f3e8ff'; corTag = '#6f42c1'; textoTag = 'Tarefa'; }
                              if (op.status === 'avaliar') { corBorda = '#7bed9f'; bgTag = '#f1fff3'; corTag = '#2e8b57'; textoTag = 'Avaliar'; }
                              if (op.status === 'interessada') { corBorda = '#28a745'; bgTag = '#e9f7ef'; corTag = '#28a745'; textoTag = 'Interessada'; }
                              if (op.status === 'inscricao') { corBorda = '#195326'; bgTag = '#e6f4ea'; corTag = '#195326'; textoTag = 'Inscrição'; }
                              if (op.status === 'ganho') { corBorda = '#28a745'; bgTag = '#e6f4ea'; corTag = '#28a745'; textoTag = 'Vendido'; }
                              if (op.status === 'perdido') { corBorda = '#dc3545'; bgTag = '#fce8e6'; corTag = '#dc3545'; textoTag = 'Perdido'; }

                              return (
                                <HistoryCard key={op.id} $borderColor={corBorda} onClick={() => abrirDetalhesOp(op)}>
                                  <div className="h-main">
                                    <div className="h-title">{op.titulo} <Badge className="status" style={{background: bgTag, color: corTag}}>{textoTag}</Badge></div>
                                    <div className="h-meta">
                                      <span><i className="fa-solid fa-graduation-cap"></i> {op.campanha_nome || '-'}</span>
                                      <span><i className="fa-solid fa-user"></i> {op.contato_nome || 'Sem Contato'}</span>
                                      <span><i className="fa-solid fa-user-tie"></i> {op.vendedor_nome || '-'}</span>
                                    </div>
                                  </div>
                                  <div className="h-side">
                                    <div className="h-val">{formatarMoeda(op.valor)}</div>
                                    <button className="view-notes-btn"><i className="fa-solid fa-eye"></i> Notas</button>
                                  </div>
                                </HistoryCard>
                              )
                            })}
                          </div>
                        )}
                      </HistorySection>
                    </>
                  ) : null
                ) : (
                  // MODO FORMULÁRIO DE EDIÇÃO / CRIAÇÃO
                  <form onSubmit={salvarEmpresa}>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup className="span-2">
                        <label>Nome da Prefeitura / Empresa *</label>
                        <Input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                      </FormGroup>
                      <FormGroup>
                        <label>Estado (UF)</label>
                        <Input type="text" value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} maxLength="2" style={{textTransform: 'uppercase'}} />
                      </FormGroup>
                      <FormGroup>
                        <label>Cidade</label>
                        <Input type="text" value={cidade} onChange={e => setCidade(e.target.value)} />
                      </FormGroup>
                      <FormGroup>
                        <label>Telefone Geral</label>
                        <Input type="text" value={telefones} onChange={e => setTelefones(e.target.value)} />
                      </FormGroup>
                      <FormGroup>
                        <label>Horário de Funcionamento</label>
                        <Input type="text" value={horarioFuncionamento} onChange={e => setHorarioFuncionamento(e.target.value)} placeholder="Ex: 08:00 às 17:00" />
                      </FormGroup>
                    </FormGrid>

                    {/* SESSÃO DE LEAD SCORING */}
                    <SectionCard style={{marginTop: '20px'}}>
                      <label style={{ display: 'block', marginBottom: '15px', color: '#1F4E79', fontSize: '1rem', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-fire"></i> Qualificação e Temperatura (Lead Scoring)
                      </label>
                      <FormGrid $columns="1fr 1fr">
                        <FormGroup>
                          <label>Classificação no Funil</label>
                          <Select 
                            value={classificacao} 
                            onChange={e => setClassificacao(e.target.value)} 
                            $status={classificacao}
                          >
                            <option value="nao_assessorada">❄️ Frio (Não Assessorada)</option>
                            <option value="lead_quente">🔥 Quente (Lead Quente)</option>
                            <option value="assessorada">👑 VIP (Assessorada)</option>
                          </Select>
                          <small style={{color: '#64748b', fontSize: '0.75rem', marginTop: '4px'}}>
                            * Quentes e Assessoradas recebem o broadcast VIP.
                          </small>
                        </FormGroup>

                        <FormGroup>
                          <label>Temperatura (Avaliação)</label>
                          {/* O renderStars gerencia os cliques para poder zerar */}
                          {renderStars(estrelas, false)}
                          <small style={{color: '#64748b', fontSize: '0.75rem', marginTop: '4px'}}>
                            * Clique na estrela ativa para remover a pontuação (Zero).
                          </small>
                        </FormGroup>
                      </FormGrid>
                    </SectionCard>
                    
                    <ModalFooter $justify="flex-end" style={{border: 'none', padding: '20px 0 0'}}>
                      <SecondaryButton type="button" onClick={() => editandoId ? setModoEdicaoEmpresa(false) : setMostrarModalEmpresa(false)}>Cancelar</SecondaryButton>
                      <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> {editandoId ? 'Atualizar Empresa' : 'Salvar Empresa'}</PrimaryButton>
                    </ModalFooter>
                  </form>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* SUB-MODAL DE CONTATO RÁPIDO */}
        {mostrarModalContato && contatoSelecionado && (
          <ModalOverlay onClick={() => setMostrarModalContato(false)} style={{zIndex: 9999}}>
            <ModalContent $small onClick={e => e.stopPropagation()}>
              <ModalHeader $bg="#1F4E79" $color="#fff">
                <h3><i className="fa-solid fa-user-pen"></i> Detalhes do Contato</h3>
                <CloseButton $color="#fff" onClick={() => setMostrarModalContato(false)}>&times;</CloseButton>
              </ModalHeader>

              <ModalBody>
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
                          {contatoTelefonesRapido ? contatoTelefonesRapido.split(',').map((tel, idx) => (
                            <a key={idx} href={`tel:${formatarTelefoneParaLink(tel)}`} className="phone-pill">
                              <i className="fa-solid fa-phone text-green"></i> {tel.trim()}
                            </a>
                          )) : '-'}
                        </div>
                      </InfoBox>
                    </FormGrid>
                    <ModalFooter $justify="flex-end" style={{padding: '20px 0 0', borderTop: 'none'}}>
                      <SecondaryButton onClick={() => setMostrarModalContato(false)}>Voltar</SecondaryButton>
                      <WarningButton onClick={() => setEditandoContatoRapido(true)}><i className="fa-solid fa-pen"></i> Editar Contato</WarningButton>
                    </ModalFooter>
                  </>
                ) : (
                  <form onSubmit={salvarContatoRapido}>
                    <FormGrid $columns="1fr" style={{marginBottom: '20px'}}>
                      <FormGroup><label>Nome *</label><Input type="text" required value={contatoNome} onChange={e => setContatoNome(e.target.value)} /></FormGroup>
                      <FormGroup><label>Cargo</label><Input type="text" value={contatoCargo} onChange={e => setContatoCargo(e.target.value)} /></FormGroup>
                      <FormGroup><label><i className="fa-regular fa-envelope text-blue"></i> E-mails (Separe por vírgula)</label><Input type="text" value={contatoEmails} onChange={e => setContatoEmails(e.target.value)} className="highlight-blue" /></FormGroup>
                      <FormGroup><label><i className="fa-solid fa-phone text-green"></i> Telefones (Separe por vírgula)</label><Input type="text" value={contatoTelefonesRapido} onChange={e => setContatoTelefonesRapido(e.target.value)} className="highlight-green" /></FormGroup>
                    </FormGrid>
                    <ModalFooter $justify="flex-end" style={{padding: '20px 0 0', borderTop: 'none'}}>
                      <SecondaryButton type="button" onClick={() => setEditandoContatoRapido(false)}>Cancelar</SecondaryButton>
                      <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar</PrimaryButton>
                    </ModalFooter>
                  </form>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* SUB-MODAL DE OPORTUNIDADE E NOTAS */}
        {mostrarModalOp && opSelecionada && (
          <ModalOverlay onClick={() => setMostrarModalOp(false)} style={{zIndex: 10000}}>
            <ModalContent $small onClick={e => e.stopPropagation()}>
              <ModalHeader $bg="#007bff" $color="#fff">
                <h3><i className="fa-solid fa-handshake"></i> Detalhes da Negociação</h3>
                <CloseButton $color="#fff" onClick={() => setMostrarModalOp(false)}>&times;</CloseButton>
              </ModalHeader>
              
              <ModalBody>
                <OpDetailCard>
                  <h4>{opSelecionada.titulo}</h4>
                  <div className="grid-details">
                    <div><i className="fa-solid fa-graduation-cap text-purple"></i> <strong>Curso:</strong> <br/>{opSelecionada.campanha_nome || '-'}</div>
                    <div><i className="fa-solid fa-sack-dollar text-green"></i> <strong>Valor:</strong> <br/><span className="val">{formatarMoeda(opSelecionada.valor)}</span></div>
                    <div><i className="fa-solid fa-user-tie text-blue"></i> <strong>Vendedor:</strong> <br/>{opSelecionada.vendedor_nome || '-'}</div>
                    <div><i className="fa-regular fa-calendar text-gray"></i> <strong>Criado em:</strong> <br/>{formatarDataHora(opSelecionada.criado_em)}</div>
                  </div>
                </OpDetailCard>

                <NotesCard>
                  <h4><i className="fa-solid fa-comments text-blue"></i> Anotações da Negociação</h4>
                  {carregandoNotas ? (
                    <LoadingMsg><i className="fa-solid fa-spinner fa-spin"></i> Carregando notas...</LoadingMsg>
                  ) : notasOp.length === 0 ? (
                    <EmptyMsg>Nenhuma anotação registrada nesta venda.</EmptyMsg>
                  ) : (
                    <div className="notes-list">
                      {notasOp.map(n => (
                        <NoteBubble key={n.id}>
                          <div className="n-head"><strong><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong> <span>{formatarDataHora(n.criado_em)}</span></div>
                          <div className="n-text">{n.nota}</div>
                        </NoteBubble>
                      ))}
                    </div>
                  )}
                </NotesCard>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

      </PageContainer>
    </>
  );
}

// === ANIMAÇÕES ===
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
  @media (max-width: 768px) { padding: 15px; }
`;
const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; .btn-mobile { width: 100%; justify-content: center; } }
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

// --- NOVO: LEAD SCORING ---
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

const SectionCard = styled.div`
  background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 20px;
`;

// --- FILTROS ---
const FilterBar = styled.div`
  display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 25px; background: #fff; padding: 15px 20px; border-radius: 12px; border: 1px solid #edf2f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
  @media (max-width: 768px) { flex-direction: column; }
`;
const SearchWrapper = styled.div`
  position: relative; flex: 1; min-width: 250px;
  .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
  input { width: 100%; padding: 12px 12px 12px 40px; border-radius: 50px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; transition: 0.2s; box-sizing: border-box; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); } }
  @media (max-width: 768px) { width: 100%; }
`;
const FilterPillWrapper = styled.div`position: relative; @media (max-width: 768px) { width: 100%; }`;
const FilterButton = styled.button`
  display: flex; align-items: center; background: ${props => props.$hasValue ? '#eef4fa' : '#f8fafc'}; border: 1px solid ${props => props.$hasValue ? '#b8cde1' : '#cbd5e1'}; padding: 12px 18px; border-radius: 50px; font-size: 0.95rem; cursor: pointer; color: #2c3e50; transition: 0.2s;
  width: 100%; justify-content: space-between;
  span { margin: 0 10px; color: #64748b; strong { color: #007bff; font-weight: 700; } }
  .icon { color: #6c757d; } .arrow { color: #007bff; font-size: 0.8rem; }
  &:hover { background: #e7f3ff; border-color: #007bff; }
`;
const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border: 1px solid #edf2f9; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 230px; 
  max-height: 250px; overflow-y: auto; overflow-x: hidden; z-index: 100; list-style: none; padding: 8px 0; margin: 0; animation: fadeInDown 0.2s ease-out;
  @media (max-width: 768px) { left: 0; width: 100%; }
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: #f8fafc; border-radius: 12px; margin: 8px 0; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
const CustomDropdownItem = styled.li`
  padding: 10px 20px; font-size: 0.9rem; color: ${props => props.$active ? '#007bff' : '#495057'}; background: ${props => props.$active ? '#f0f7ff' : 'transparent'}; cursor: pointer; font-weight: ${props => props.$active ? '700' : '500'};
  &:hover { background: #f8fafc; color: #007bff; }
`;

// --- TABELA ---
const Panel = styled.div`
  background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; overflow: hidden; margin-bottom: 20px;
`;

const TabelaResponsiva = styled.div`
  overflow-x: auto; 
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; }
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; color: #2c3e50; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; }
  .text-center { text-align: center; } .text-muted { color: #a0aec0; } .font-bold { font-weight: 700;}

  @media (max-width: 768px) {
    min-width: unset; display: block;
    thead, tbody, th, td, tr { display: block; }
    thead tr { position: absolute; top: -9999px; left: -9999px; }
    
    tr {
      background: #fff; border: 1px solid #edf2f9; border-radius: 12px; margin: 15px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }
    
    td {
      border: none; border-bottom: 1px solid #f1f5f9; position: relative; padding: 12px 15px; text-align: left; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
    }
    
    td:last-child { border-bottom: none; }
    
    td::before {
      position: relative; top: auto; left: auto; transform: none; width: 100%; padding: 0; white-space: nowrap; text-align: left; font-weight: 800; color: #94a3b8; font-size: 0.7rem; content: attr(data-label); text-transform: uppercase; letter-spacing: 0.5px;
    }
    
    .text-center { text-align: left; }
  }
`;

const ClickableRow = styled.tr`
  cursor: pointer; transition: 0.2s; animation: ${fadeInUp} 0.4s ease forwards; opacity: 0;
  &:hover { background-color: #f8fafc; }
  .main-name { font-size: 1.05rem; font-weight: 700; color: #007bff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;}
  .meta { display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; span { display: flex; align-items: center; gap: 5px; } }
  
  @media (max-width: 768px) {
    .meta { flex-direction: column; gap: 4px; }
  }
`;

const StatusBadge = styled.span`
  padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;
  &.assessorada { background: #fff3cd; color: #856404; border: 1px solid #ffeeba;}
  &.lead_quente { background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da;}
  &.nao_assessorada { background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1;}
`;

const Badge = styled.span`
  background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;
`;

// --- PAGINAÇÃO ---
const PaginationContainer = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: #fbfbfc;
  .info { color: #64748b; font-size: 0.9rem; strong { color: #2c3e50; } }
  .controls { display: flex; align-items: center; gap: 8px; .current { font-weight: 700; color: #007bff; padding: 0 10px;} }
  @media (max-width: 600px) { flex-direction: column; gap: 15px; }
`;
const PageButton = styled.button`
  padding: 6px 12px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; cursor: pointer; color: #333; font-weight: 600;
  &:hover:not(:disabled) { border-color: #007bff; color: #007bff; background: #f0f7ff; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// --- MODAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box;
`;
const ModalContent = styled.div`
  background: #fff; border-radius: 12px; width: 100%; max-width: ${props => props.$large ? '1000px' : (props.$small ? '600px' : '800px')}; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: slideIn 0.3s ease-out;
  @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; border-bottom: 1px solid #edf2f9; background: ${props => props.$bg || '#fff'}; color: ${props => props.$color || '#333'};
  h3 { margin: 0; font-size: 1.4rem; display: flex; align-items: center; gap: 10px; }
  .text-blue { color: #007bff; }
  .subtitle { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 8px; font-size: 0.9rem; color: #64748b; }
  .vip-badge { font-size: 0.75rem; background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 12px; border: 1px solid #ffeeba; font-weight: bold;}
  .vip-badge.text-red { background: #fdf2f2; color: #dc3545; border-color: #f8d7da; }
  .actions { display: flex; gap: 10px; align-items: center; }
  .hide-mobile { @media (max-width: 600px) { display: none; } }
  @media (max-width: 600px) { h3 { padding-right: 30px; } }
`;
const ModalBody = styled.div`padding: 30px; overflow-y: auto; flex: 1; background: #fbfbfc; @media (max-width: 600px) { padding: 15px; }`;
const CloseButton = styled.button`background: none; border: none; font-size: 2rem; cursor: pointer; color: ${props => props.$color || '#a0aec0'}; &:hover { color: #dc3545; opacity: 1; } @media (max-width: 600px) { position: absolute; right: 15px; top: 15px; }`;

// --- VISÃO 360 EMPRESA ---
const KpiGrid = styled.div`display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; @media (max-width: 600px) { grid-template-columns: 1fr; }`;
const KpiCard = styled.div`
  background: ${props => props.$bg || '#fff'}; border-top: 4px solid ${props => props.$color}; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  .label { color: #64748b; font-size: 0.85rem; font-weight: 700; }
  .val { color: ${props => props.$color}; font-size: 1.6rem; font-weight: 800; margin-top: 10px; }
`;

const ProfileGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; @media (max-width: 768px) { grid-template-columns: 1fr; }`;
const InfoCard = styled.div`
  background: #fff; border-radius: 12px; border: 1px solid #edf2f9; border-top: 4px solid ${props => props.$borderTop}; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; color: #2c3e50; display: flex; align-items: center; gap: 8px; font-size: 1.05rem;}
  .text-blue { color: #007bff; } .text-green { color: #28a745; }
  .info-line { margin-bottom: 10px; font-size: 0.95rem; color: #4a5568; strong { color: #2d3748; } }
  .text-yellow { color: #d39e00; } .text-red { color: #dc3545; } .empty { color: #a0aec0; font-style: italic; font-size: 0.9rem;}
  .contacts-list { display: flex; flex-direction: column; gap: 10px; max-height: 180px; overflow-y: auto; padding-right: 5px; }
`;

const ContactItem = styled.div`
  padding: 12px 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #17a2b8; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;
  &:hover { background: #f0f7ff; border-color: #cbd5e1; transform: translateX(4px); }
  .c-info { display: flex; flex-direction: column; gap: 4px; strong { color: #007bff; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; } span { color: #64748b; font-size: 0.8rem; } }
`;

const HistorySection = styled.div`
  background: #fff; border-radius: 12px; border: 1px solid #edf2f9; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #edf2f9; color: #2c3e50; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;}
  .text-purple { color: #6f42c1; }
  .h-list { display: flex; flex-direction: column; gap: 12px; }
`;

const HistoryCard = styled.div`
  background: #fcfcfd; border: 1px solid #e2e8f0; border-left: 4px solid ${props => props.$borderColor || '#cbd5e1'}; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;
  &:hover { background: #f0f7ff; border-color: #cbd5e1; transform: translateX(5px); }
  
  .h-main { display: flex; flex-direction: column; gap: 8px; }
  .h-title { font-weight: 700; font-size: 1.05rem; color: #2c3e50; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; .status { font-size: 0.7rem; padding: 2px 8px; }}
  .h-meta { display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; flex-wrap: wrap; span { display: flex; align-items: center; gap: 6px; strong { color: #475569; } } }
  
  .h-side { display: flex; align-items: center; gap: 20px; }
  .h-val { font-weight: 800; font-size: 1.2rem; color: #475569; }
  .view-notes-btn { background: #007bff; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; &:hover{background: #0056b3;} }
  
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; gap: 15px; .h-side { width: 100%; justify-content: space-between; } }
`;

// --- FORMS ---
const FormGrid = styled.div`display: grid; grid-template-columns: ${props => props.$columns}; gap: 15px; .span-2 { grid-column: span 2; } @media (max-width: 768px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }`;
const FormGroup = styled.div`display: flex; flex-direction: column; gap: 6px; label { font-weight: 700; font-size: 0.85rem; color: #4a5568; }`;
const Input = styled.input`
  padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; transition: 0.2s; font-size: 0.95rem; box-sizing: border-box;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
  &.highlight-blue { border-color: #b8daff; background: #e7f3ff; } &.highlight-green { border-color: #c3e6cb; background: #d4edda; }
`;
const Select = styled.select`
  padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; transition: 0.2s; font-size: 0.95rem; cursor: pointer; box-sizing: border-box;
  background-color: ${props => props.$status === 'assessorada' ? '#fff3cd' : props.$status === 'lead_quente' ? '#fdf2f2' : '#f8fafc'};
  font-weight: 600;
  color: ${props => props.$status === 'assessorada' ? '#856404' : props.$status === 'lead_quente' ? '#dc3545' : '#475569'};
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
`;

// --- INFO BOX (MODAL CONTATO) ---
const InfoBox = styled.div`
  background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; &.span-2 { grid-column: span 2; }
  label { font-size: 0.75rem; color: #64748b; font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  div { font-size: 1rem; color: #2c3e50; font-weight: 600; }
  .text-blue { color: #007bff; } .phones { display: flex; gap: 10px; flex-wrap: wrap; }
  .phone-pill { display: inline-flex; align-items: center; gap: 6px; background: #f4fbf5; color: #155724; padding: 8px 12px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; border: 1px solid #c3e6cb; &:hover{ background: #28a745; color: #fff; .text-green{color:#fff;}} }
  .text-green { color: #28a745; }
`;

// --- BOTOES E UTILITARIOS ---
const ButtonBase = styled.button`padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; gap: 8px; &:active { transform: scale(0.98); }`;
const PrimaryButton = styled(ButtonBase)`background: #007bff; color: #fff; &:hover { background: #0056b3; }`;
const SecondaryButton = styled(ButtonBase)`background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; }`;
const DangerButton = styled(ButtonBase)`background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; &:hover { background: #dc3545; color: #fff; }`;
const WarningButton = styled(ButtonBase)`background: #ffc107; color: #333; &:hover { background: #e0a800; color: #fff; }`;
const InfoButton = styled(ButtonBase)`background: #17a2b8; color: #fff; &:hover { background: #138496; }`;
const IconButton = styled.button`background: #f1f5f9; color: #475569; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 1.1rem; transition: 0.2s; &.danger { color: #dc3545; background: #fef2f2; &:hover { background: #dc3545; color: #fff; }} &:hover { background: #e2e8f0; }`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$justify || 'flex-end'};
  gap: 10px;
  padding: 20px 30px;
  background: #fff;
  border-top: 1px solid #edf2f9;
  @media (max-width: 600px) { flex-direction: column; button { width: 100%; justify-content: center; } }
`;

const OpDetailCard = styled.div`
  background: #fff; border: 1px solid #edf2f9; padding: 20px; border-radius: 12px; margin-bottom: 20px;
  h4 { margin: 0 0 15px 0; font-size: 1.1rem; color: #2d3748; }
  .grid-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.85rem; color: #718096; .val { font-weight: 800; color: #2d3748; font-size: 1rem;}}
  .text-purple { color: #6f42c1; } .text-green { color: #28a745; } .text-blue { color: #007bff; } .text-gray { color: #94a3b8; }
  @media (max-width: 600px) { .grid-details { grid-template-columns: 1fr; } }
`;
const NotesCard = styled.div`
  background: #fff; border: 1px solid #edf2f9; padding: 20px; border-radius: 12px;
  h4 { margin: 0 0 15px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
  .notes-list { display: flex; flex-direction: column; gap: 15px; }
`;
const NoteBubble = styled.div`
  background: #f8fafc; border-left: 4px solid #007bff; padding: 15px; border-radius: 8px;
  .n-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px; font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; strong { color: #2d3748; display: flex; align-items: center; gap: 6px;}}
  .n-text { font-size: 0.95rem; color: #4a5568; line-height: 1.5; white-space: pre-wrap; }
`;
const LoadingMsg = styled.div`text-align: center; padding: 20px; color: #a0aec0; font-style: italic;`;
const EmptyMsg = styled.div`text-align: center; padding: 20px; color: #a0aec0; font-style: italic;`;