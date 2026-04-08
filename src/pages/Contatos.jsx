// src/pages/Contatos.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
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
  
  // Controles dos Dropdowns de Filtro
  const [dropdownEstadoAberto, setDropdownEstadoAberto] = useState(false);
  const [dropdownCargoAberto, setDropdownCargoAberto] = useState(false);
  const dropdownEstadoRef = useRef(null);
  const dropdownCargoRef = useRef(null);

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

  // Fecha dropdowns se clicar fora
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
      if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(event.target)) {
        setDropdownEstadoAberto(false);
      }
      if (dropdownCargoRef.current && !dropdownCargoRef.current.contains(event.target)) {
        setDropdownCargoAberto(false);
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
                       (c.cidade || '').toLowerCase().includes(termo) ||
                       (c.emails_json || '').toLowerCase().includes(termo);
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
          id: editandoId, nome, cargo, empresa_id: empresaId, empresa_nome: buscaEmpresaNoForm, 
          emails_json: emailsLimpos, telefones_json: telefonesLimpos
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
  function formatarTelefoneParaLink(telefoneStr) {
    if (!telefoneStr) return '';
    return telefoneStr.replace(/[^0-9]/g, '');
  }

  // Listas fixas para os Dropdowns
  const listaEstados = ['RS', 'SC', 'PR', 'SP', 'MG', 'RJ', 'ES', 'BA', 'GO'];
  const listaCargos = ['Prefeito', 'Secretário', 'Licita', 'CI-R', 'CI-E', 'Teste', 'Lead Inbound (Site)'];

  return (
    <>
      <Header titulo="Gestão de Contatos" />
      <PageContainer>
        
        <TopSection>
          <div>
            <Title>Base de Contatos</Title>
            <Subtitle>Gerencie leads, clientes e visualize o histórico de comunicação.</Subtitle>
          </div>
          <PrimaryButton onClick={abrirModalNovo}>
            <i className="fa-solid fa-plus"></i> Novo Contato
          </PrimaryButton>
        </TopSection>

        {/* BARRA DE FILTROS MODERNIZADA */}
        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input 
              type="text" 
              placeholder="Pesquisar por Nome, Prefeitura, E-mail..." 
              value={buscaGeral} 
              onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }} 
            />
          </SearchWrapper>

          <FilterPillWrapper ref={dropdownEstadoRef}>
            <FilterButton $hasValue={!!filtroEstado} onClick={() => setDropdownEstadoAberto(!dropdownEstadoAberto)}>
              <i className="fa-solid fa-map-location-dot icon"></i> 
              <span>Estado: <strong>{filtroEstado || 'Todos'}</strong></span>
              <i className={`fa-solid fa-chevron-${dropdownEstadoAberto ? 'up' : 'down'} arrow`}></i>
            </FilterButton>
            {dropdownEstadoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroEstado === ''} onClick={() => { setFiltroEstado(''); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>Todos os Estados</CustomDropdownItem>
                {listaEstados.map(uf => (
                  <CustomDropdownItem key={uf} $active={filtroEstado === uf} onClick={() => { setFiltroEstado(uf); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>{uf}</CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>

          <FilterPillWrapper ref={dropdownCargoRef}>
            <FilterButton $hasValue={!!filtroCargo} onClick={() => setDropdownCargoAberto(!dropdownCargoAberto)}>
              <i className="fa-solid fa-user-tag icon"></i> 
              <span>Cargo: <strong>{filtroCargo || 'Todos'}</strong></span>
              <i className={`fa-solid fa-chevron-${dropdownCargoAberto ? 'up' : 'down'} arrow`}></i>
            </FilterButton>
            {dropdownCargoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroCargo === ''} onClick={() => { setFiltroCargo(''); setDropdownCargoAberto(false); setPaginaAtual(1); }}>Todos os Cargos</CustomDropdownItem>
                {listaCargos.map(cargo => (
                  <CustomDropdownItem key={cargo} $active={filtroCargo === cargo} onClick={() => { setFiltroCargo(cargo); setDropdownCargoAberto(false); setPaginaAtual(1); }}>{cargo}</CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>
        </FilterBar>

        {/* TABELA DE RESULTADOS */}
        <Panel>
          <TableContainer>
            <Table>
              <thead className="sticky-head">
                <tr>
                  <th>Contato (Lead)</th>
                  <th>Prefeitura / Vínculo</th>
                  <th>Função / Cargo</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="3" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando contatos...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="3" className="text-center text-muted">Nenhum contato encontrado.</td></tr>
                ) : (
                  itensExibidos.map(c => {
                    let primeiroEmail = 'Sem e-mail';
                    try { const ems = typeof c.emails_json === 'string' ? JSON.parse(c.emails_json) : c.emails_json; if (ems && ems.length > 0) primeiroEmail = ems[0]; } catch(e){}
                    let quantEmails = 0;
                    try { const ems = typeof c.emails_json === 'string' ? JSON.parse(c.emails_json) : c.emails_json; quantEmails = ems ? ems.length : 0; } catch(e){}

                    let primeiroTel = 'S/ Telefone';
                    let quantTels = 0;
                    try {
                       const tls = typeof c.telefones_json === 'string' ? JSON.parse(c.telefones_json) : c.telefones_json;
                       if (tls && tls.length > 0) { primeiroTel = tls[0]; quantTels = tls.length; }
                    } catch(e){}

                    const emailComErro = c.emails_com_erro?.includes(primeiroEmail);

                    return (
                      <ClickableRow key={c.id} onClick={() => abrirModalContatoDetalhes(c)} title="Clique para ver o perfil do cliente">
                        <td>
                          <div className="contact-name">{c.nome}</div>
                          <div className="contact-meta">
                            <span className={emailComErro ? 'text-red font-bold' : ''}>
                              <i className={emailComErro ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-envelope"}></i> {primeiroEmail}
                              {quantEmails > 1 && <span className="more-badge">+{quantEmails - 1}</span>}
                            </span>
                            <span>
                              <i className="fa-brands fa-whatsapp"></i> {primeiroTel}
                              {quantTels > 1 && <span className="more-badge">+{quantTels - 1}</span>}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="company-name">{c.empresa_nome || 'Avulso (Sem Prefeitura)'}</div>
                          {c.estado && <div className="state-tag">{c.estado}</div>}
                        </td>
                        <td>
                          {c.cargo ? <Badge className="badge-gray">{c.cargo}</Badge> : <span className="text-muted">-</span>}
                        </td>
                      </ClickableRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableContainer>

          {/* PAGINAÇÃO */}
          {!carregando && contatosFiltrados.length > 0 && (
            <PaginationContainer>
              <div className="info">Exibindo <strong>{itensExibidos.length}</strong> de {contatosFiltrados.length} contatos</div>
              <div className="controls">
                <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}><i className="fa-solid fa-angles-left"></i></PageButton>
                <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(paginaAtual - 1)}>Anterior</PageButton>
                <span className="current">{paginaAtual} de {totalPaginas}</span>
                <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(paginaAtual + 1)}>Próxima</PageButton>
                <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}><i className="fa-solid fa-angles-right"></i></PageButton>
              </div>
            </PaginationContainer>
          )}
        </Panel>

        {/* ======================================================== */}
        {/* SUPER MODAL (RAIO-X 360º OU FORMULÁRIO DE EDIÇÃO)        */}
        {/* ======================================================== */}
        {mostrarModalContato && (
          <ModalOverlay onClick={() => setMostrarModalContato(false)}>
            <ModalContent $large onClick={e => e.stopPropagation()}>
              
              {/* CABEÇALHO DO MODAL */}
              <ModalHeader $bg={modoEdicao ? '#1F4E79' : '#ffffff'} $color={modoEdicao ? '#ffffff' : '#2c3e50'}>
                <div>
                  <h3>
                    {modoEdicao ? (
                      <><i className="fa-solid fa-user-pen"></i> {editandoId ? 'Editar Contato' : 'Novo Contato'}</>
                    ) : (
                      <><i className="fa-solid fa-user-circle text-blue"></i> {nome}</>
                    )}
                  </h3>
                  {!modoEdicao && (
                    <div className="subtitle">
                      {cargo && <Badge className="badge-gray">{cargo}</Badge>}
                      {buscaEmpresaNoForm && <span><i className="fa-solid fa-building"></i> {buscaEmpresaNoForm}</span>}
                    </div>
                  )}
                </div>
                
                <div className="actions">
                  {perfilUsuario === 'admin' && editandoId && (
                    <DangerButton onClick={() => excluir(editandoId)} title="Excluir Contato">
                      <i className="fa-solid fa-trash-can"></i> Excluir
                    </DangerButton>
                  )}
                  {!modoEdicao && (
                    <WarningButton onClick={() => setModoEdicao(true)}>
                      <i className="fa-solid fa-pen"></i> Editar
                    </WarningButton>
                  )}
                  <CloseButton $color={modoEdicao ? '#fff' : '#a0aec0'} onClick={() => setMostrarModalContato(false)}>&times;</CloseButton>
                </div>
              </ModalHeader>

              {/* CORPO DO MODAL SCROLLÁVEL */}
              <ModalBody>
                
                {/* VISÃO 360º */}
                {!modoEdicao && (
                  <>
                    <ProfileGrid>
                      <InfoCard $borderTop="#007bff">
                        <h4><i className="fa-regular fa-envelope"></i> E-mails (Comunicação)</h4>
                        {emails.length > 0 && emails[0] !== '' ? (
                          <ul>
                            {emails.map((em, i) => {
                              const isFalho = emailsComErroForm.includes(em);
                              return (
                                <li key={i} className={isFalho ? 'error' : ''}>
                                  {em} {isFalho && <span className="err-badge">Falha</span>}
                                </li>
                              );
                            })}
                          </ul>
                        ) : <span className="empty">Nenhum e-mail registrado.</span>}
                      </InfoCard>

                      <InfoCard $borderTop="#28a745">
                        <h4><i className="fa-brands fa-whatsapp"></i> Telefones</h4>
                        {telefones.length > 0 && telefones[0] !== '' ? (
                          <div className="phones">
                            {telefones.map((tel, i) => (
                              <a key={i} href={`tel:${formatarTelefoneParaLink(tel)}`} className="phone-pill">
                                <i className="fa-solid fa-phone text-green"></i> {tel.trim()}
                              </a>
                            ))}
                          </div>
                        ) : <span className="empty">Nenhum telefone registrado.</span>}
                      </InfoCard>
                    </ProfileGrid>

                    <FunnelHistoryCard>
                      <h4><i className="fa-solid fa-chart-pie text-blue"></i> Histórico de Interações (Funil)</h4>
                      
                      {carregandoHistorico ? (
                        <div className="loading"><i className="fa-solid fa-spinner fa-spin"></i> Buscando oportunidades...</div>
                      ) : !dadosHistorico || dadosHistorico.oportunidades.length === 0 ? (
                        <div className="empty">Este contato ainda não possui negociações no funil.</div>
                      ) : (
                        <div className="history-list">
                          {dadosHistorico.oportunidades.map(op => {
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
                              <HistoryRow key={op.id} $borderColor={corBorda} onClick={() => abrirDetalhesOp(op)}>
                                <div className="info-main">
                                  <div className="op-title">
                                    {op.titulo}
                                    <span className="status-tag" style={{background: bgTag, color: corTag}}>{textoTag}</span>
                                  </div>
                                  <div className="op-meta">
                                    {op.campanha_nome && <span><i className="fa-solid fa-graduation-cap"></i> Curso: <strong>{op.campanha_nome}</strong></span>}
                                    <span><i className="fa-solid fa-user-tie"></i> Vendedor: <strong>{op.vendedor_nome || '-'}</strong></span>
                                    <span><i className="fa-regular fa-calendar"></i> Criado em: {formatarData(op.criado_em)}</span>
                                  </div>
                                </div>
                                <div className="info-side">
                                  <div className="op-value">{formatarMoeda(op.valor)}</div>
                                  <button className="view-notes-btn"><i className="fa-solid fa-eye"></i> Notas</button>
                                </div>
                              </HistoryRow>
                            )
                          })}
                        </div>
                      )}
                    </FunnelHistoryCard>
                  </>
                )}

                {/* MODO FORMULÁRIO DE EDIÇÃO / CRIAÇÃO */}
                {modoEdicao && (
                  <form onSubmit={salvarContato}>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup className="span-2">
                        <label>Nome Completo *</label>
                        <Input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                      </FormGroup>

                      <FormGroup>
                        <label>Cargo / Função</label>
                        <Select value={cargo} onChange={e => setCargo(e.target.value)}>
                          <option value="">Sem Cargo Específico</option>
                          {listaCargos.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="Outro">Outro</option>
                        </Select>
                      </FormGroup>

                      <FormGroup>
                        <label>Prefeitura Alvo (Vínculo)</label>
                        <AutocompleteContainer ref={dropdownRef}>
                          <Input 
                            type="text" placeholder="🔍 Buscar na lista..." 
                            value={buscaEmpresaNoForm} 
                            onFocus={() => { setBuscaEmpresaNoForm(''); setMostrarDropdown(true); }} 
                            onChange={(e) => { setBuscaEmpresaNoForm(e.target.value); setMostrarDropdown(true); }} 
                          />
                          {mostrarDropdown && (
                            <AutocompleteList>
                              <AutocompleteOption className="danger" onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                                <i className="fa-solid fa-eraser"></i> Desvincular Prefeitura
                              </AutocompleteOption>
                              {empresasFiltradasParaSelect.length > 0 ? (
                                empresasFiltradasParaSelect.map(emp => (
                                  <AutocompleteOption key={emp.id} $selected={parseInt(empresaId) === emp.id} onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoForm(emp.nome); setMostrarDropdown(false); }}>
                                    <strong>{emp.nome}</strong> <span className="state">({emp.estado})</span>
                                    {parseInt(empresaId) === emp.id && <i className="fa-solid fa-check check-icon"></i>}
                                  </AutocompleteOption>
                                ))
                              ) : (
                                <AutocompleteOption className="no-results">Nenhuma prefeitura encontrada.</AutocompleteOption>
                              )}
                            </AutocompleteList>
                          )}
                        </AutocompleteContainer>
                      </FormGroup>
                    </FormGrid>

                    <FormGrid $columns="1fr 1fr" style={{marginTop: '20px'}}>
                      <DynamicInputBox>
                        <div className="box-header">
                          <span><i className="fa-solid fa-envelope text-blue"></i> Lista de E-mails</span>
                          <AddLinkBtn type="button" onClick={adicionarEmail}>+ Novo</AddLinkBtn>
                        </div>
                        {emails.map((email, index) => {
                          const isFalho = emailsComErroForm.includes(email);
                          return (
                            <DynamicInputRow key={index}>
                              <div className="input-group">
                                <Input 
                                  type="email" value={email} onChange={e => atualizarEmail(index, e.target.value)} 
                                  placeholder="Ex: email@teste.com" className={isFalho ? 'error' : ''}
                                />
                                {emails.length > 1 && (
                                  <IconButton type="button" className="danger" onClick={() => removerEmail(index)}><i className="fa-solid fa-trash"></i></IconButton>
                                )}
                              </div>
                              {isFalho && <div className="error-msg"><i className="fa-solid fa-triangle-exclamation"></i> E-mail bloqueado por erro</div>}
                            </DynamicInputRow>
                          );
                        })}
                      </DynamicInputBox>

                      <DynamicInputBox>
                        <div className="box-header">
                          <span><i className="fa-brands fa-whatsapp text-green"></i> Lista de Telefones</span>
                          <AddLinkBtn type="button" onClick={adicionarTelefone} className="text-green">+ Novo</AddLinkBtn>
                        </div>
                        {telefones.map((tel, index) => (
                          <DynamicInputRow key={index}>
                            <div className="input-group">
                              <Input type="text" value={tel} onChange={e => atualizarTelefone(index, e.target.value)} placeholder="(XX) 99999-9999" />
                              {telefones.length > 1 && (
                                <IconButton type="button" className="danger" onClick={() => removerTelefone(index)}><i className="fa-solid fa-trash"></i></IconButton>
                              )}
                            </div>
                          </DynamicInputRow>
                        ))}
                      </DynamicInputBox>
                    </FormGrid>

                    <ModalFooter $justify="flex-end" style={{borderTop: 'none', padding: '20px 0 0 0'}}>
                      <SecondaryButton type="button" onClick={() => { editandoId ? setModoEdicao(false) : setMostrarModalContato(false) }}>Cancelar</SecondaryButton>
                      <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Contato</PrimaryButton>
                    </ModalFooter>
                  </form>
                )}

              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* ======================================================== */}
        {/* SUB-MODAL DE OPORTUNIDADES / NOTAS                       */}
        {/* ======================================================== */}
        {mostrarModalOp && opSelecionada && (
          <ModalOverlay onClick={() => setMostrarModalOp(false)} style={{zIndex: 10000}}>
            <ModalContent onClick={e => e.stopPropagation()} $small>
              <ModalHeader $bg="#007bff" $color="#fff">
                <div>
                  <h3 style={{color: '#fff'}}><i className="fa-solid fa-handshake"></i> Detalhes da Negociação</h3>
                </div>
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
                  <h4><i className="fa-solid fa-comments"></i> Anotações da Negociação</h4>
                  {carregandoNotas ? (
                    <div className="loading"><i className="fa-solid fa-spinner fa-spin"></i> Carregando notas...</div>
                  ) : notasOp.length === 0 ? (
                    <div className="empty">Nenhuma anotação registrada nesta venda.</div>
                  ) : (
                    <div className="notes-list">
                      {notasOp.map(n => (
                        <div key={n.id} className="note-bubble">
                          <div className="note-head">
                            <strong><i className="fa-solid fa-user-circle"></i> {n.usuario_nome}</strong>
                            <span>{formatarDataHora(n.criado_em)}</span>
                          </div>
                          <div className="note-text">{n.nota}</div>
                        </div>
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

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
`;

const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

// --- BARRA DE FILTROS ---
const FilterBar = styled.div`
  display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 25px;
  background: #ffffff; padding: 15px 20px; border-radius: 12px; border: 1px solid #edf2f9; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
`;

const SearchWrapper = styled.div`
  position: relative; flex: 1; min-width: 250px;
  
  .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1rem; }
  input {
    width: 100%; padding: 12px 12px 12px 40px; border-radius: 50px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; transition: 0.2s; background: #f8fafc;
    &:focus { border-color: #007bff; background: #fff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }
  }
`;

const FilterPillWrapper = styled.div`
  position: relative; display: inline-block;
`;
const FilterButton = styled.button`
  display: flex; align-items: center; background: ${props => props.$hasValue ? '#eef4fa' : '#f8fafc'};
  border: 1px solid ${props => props.$hasValue ? '#b8cde1' : '#cbd5e1'}; color: #2c3e50; padding: 12px 18px; border-radius: 50px; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease;

  &:hover { background: #e7f3ff; border-color: #007bff; }
  span { margin: 0 10px; color: #64748b; strong { color: #007bff; font-weight: 700; } }
  .icon { color: #6c757d; font-size: 1.05rem; }
  .arrow { color: #007bff; font-size: 0.8rem; }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; border: 1px solid #edf2f9; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 200px; max-height: 300px; overflow-y: auto; z-index: 100; padding: 8px 0; list-style: none; margin: 0; animation: fadeInDown 0.2s ease-out;
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
const CustomDropdownItem = styled.li`
  padding: 10px 20px; font-size: 0.95rem; color: ${props => props.$active ? '#007bff' : '#495057'}; background: ${props => props.$active ? '#f0f7ff' : 'transparent'}; font-weight: ${props => props.$active ? '700' : '500'}; cursor: pointer; transition: background 0.2s;
  &:hover { background: #f8fafc; color: #007bff; }
`;

// --- PANELS E TABELAS ---
const Panel = styled.div`
  background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; margin-bottom: 20px; overflow: hidden;
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; font-weight: 700;}
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; color: #2c3e50; transition: background 0.2s;}
  tr:last-child td { border-bottom: none; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; }
  .text-center { text-align: center; } .text-muted { color: #a0aec0; font-style: italic; }
`;

const ClickableRow = styled.tr`
  cursor: pointer;
  &:hover td { background-color: #f8fafc; }
  
  .contact-name { font-size: 1.05rem; font-weight: 700; color: #007bff; margin-bottom: 5px; }
  .contact-meta { display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; }
  .contact-meta span { display: flex; align-items: center; gap: 6px; }
  .text-red { color: #dc3545; } .font-bold { font-weight: 700; }
  .more-badge { background: #e2e8f0; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: #475569; }
  
  .company-name { font-weight: 700; color: #333; }
  .state-tag { display: inline-block; color: #007bff; font-weight: 700; font-size: 0.8rem; margin-top: 4px; }
`;

const Badge = styled.span`
  padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; display: inline-block;
  &.badge-gray { background: #f1f5f9; color: #475569; }
`;

const PaginationContainer = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: #fbfbfc; border-top: 1px solid #edf2f9;
  .info { color: #64748b; font-size: 0.9rem; strong { color: #2c3e50; } }
  .controls { display: flex; align-items: center; gap: 5px; }
  .current { padding: 0 15px; font-weight: 700; color: #333; font-size: 0.9rem; }
`;

const PageButton = styled.button`
  padding: 8px 12px; border: 1px solid #cbd5e1; background: #fff; color: #333; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: 0.2s;
  &:hover:not(:disabled) { background: #f0f7ff; color: #007bff; border-color: #b8daff; }
  &:disabled { background: #f8fafc; color: #cbd5e1; cursor: not-allowed; border-color: #e2e8f0; }
`;

// --- MODAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px;
`;
const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: ${props => props.$large ? '900px' : (props.$small ? '650px' : '800px')}; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; background: ${props => props.$bg || '#fff'}; color: ${props => props.$color || '#333'}; border-bottom: 1px solid #edf2f9;
  h3 { margin: 0; font-size: 1.4rem; display: flex; align-items: center; gap: 8px; }
  .text-blue { color: #007bff; }
  .subtitle { font-size: 0.9rem; margin-top: 8px; display: flex; align-items: center; gap: 8px; span { display: flex; align-items: center; gap: 4px; color: ${props => props.$color ? 'rgba(255,255,255,0.8)' : '#6c757d'}; } }
  .actions { display: flex; align-items: center; gap: 15px; }
`;
const ModalBody = styled.div`
  padding: 25px; overflow-y: auto; flex: 1; background: #fbfbfc;
`;
const ModalFooter = styled.div`
  display: flex; justify-content: ${props => props.$justify || 'space-between'}; padding: 20px 25px; background: #ffffff; border-top: 1px solid #edf2f9; gap: 10px;
`;
const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; cursor: pointer; color: ${props => props.$color || '#a0aec0'}; transition: 0.2s;
  &:hover { color: #dc3545; }
`;

// --- VISÃO 360º DO CONTATO ---
const ProfileGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const InfoCard = styled.div`
  background: #ffffff; border-radius: 12px; border: 1px solid #edf2f9; border-top: 4px solid ${props => props.$borderTop}; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #edf2f9; color: #475569; display: flex; align-items: center; gap: 8px; font-size: 1rem;}
  ul { padding-left: 20px; margin: 0; color: #2c3e50; font-weight: 500; li { margin-bottom: 8px; } li.error { color: #dc3545; } }
  .err-badge { font-size: 0.7rem; background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 4px; margin-left: 5px; font-weight: 700; }
  .empty { color: #94a3b8; font-style: italic; font-size: 0.9rem; }
  .phones { display: flex; gap: 10px; flex-wrap: wrap; }
  .phone-pill { display: inline-flex; align-items: center; gap: 6px; background: #f4fbf5; color: #155724; padding: 8px 12px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; font-weight: 600; border: 1px solid #c3e6cb; transition: 0.2s; &:hover{ background: #28a745; color: #fff; .text-green{color:#fff;}} }
  .text-green { color: #28a745; }
`;

const FunnelHistoryCard = styled.div`
  background: #ffffff; border-radius: 12px; border: 1px solid #edf2f9; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #edf2f9; color: #2c3e50; display: flex; align-items: center; gap: 8px; font-size: 1.1rem;}
  .text-blue { color: #007bff; }
  .loading, .empty { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; }
  .history-list { display: flex; flex-direction: column; gap: 15px; }
`;

const HistoryRow = styled.div`
  background: #fcfcfd; border: 1px solid #e2e8f0; border-left: 4px solid ${props => props.$borderColor}; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;
  &:hover { background: #f0f7ff; border-color: #cbd5e1; transform: translateX(4px); }
  
  .info-main { display: flex; flex-direction: column; gap: 8px; }
  .op-title { font-weight: 700; font-size: 1.05rem; color: #2c3e50; display: flex; align-items: center; gap: 10px; }
  .status-tag { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;}
  .op-meta { display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; flex-wrap: wrap; span { display: flex; align-items: center; gap: 6px; strong { color: #475569; } } }
  
  .info-side { display: flex; align-items: center; gap: 20px; }
  .op-value { font-weight: 800; font-size: 1.2rem; color: #475569; }
  .view-notes-btn { background: #007bff; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; &:hover{background: #0056b3;} }
  
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; gap: 15px; .info-side { width: 100%; justify-content: space-between; } }
`;

// --- FORMS E INPUTS ---
const FormGrid = styled.div`
  display: grid; grid-template-columns: ${props => props.$columns || '1fr'}; gap: 15px;
  .span-2 { grid-column: span 2; }
  @media (max-width: 768px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } }
`;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  label { font-weight: 700; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 6px;}
`;
const Input = styled.input`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; transition: 0.2s;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { border-color: #b8daff; background: #e7f3ff; }
  &.highlight-green { border-color: #c3e6cb; background: #d4edda; }
  &.error { border-color: #dc3545; background: #fdf0f1; }
`;
const Select = styled.select`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; cursor: pointer; transition: 0.2s;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;
const TextArea = styled.textarea`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; resize: vertical; transition: 0.2s;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { border-color: #007bff; background: #f0f7ff; }
`;

// --- INPUTS DINÂMICOS (EMAILS/TELEFONES) ---
const DynamicInputBox = styled.div`
  background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #edf2f9; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; span { font-weight: 700; color: #2c3e50; display: flex; align-items: center; gap: 8px;} }
  .text-blue { color: #007bff; } .text-green { color: #28a745; }
`;
const AddLinkBtn = styled.button`
  background: none; border: none; color: #007bff; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: 0.2s;
  &.text-green { color: #28a745; } &:hover { opacity: 0.7; }
`;
const DynamicInputRow = styled.div`
  margin-bottom: 12px;
  .input-group { display: flex; gap: 8px; }
  .error-msg { color: #dc3545; font-size: 0.75rem; margin-top: 4px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
`;

// --- AUTOCOMPLETE CUSTOMIZADO ---
const AutocompleteContainer = styled.div`
  position: relative; width: 100%;
`;
const AutocompleteList = styled.ul`
  position: absolute; top: calc(100% + 5px); left: 0; width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; z-index: 1000; list-style: none; padding: 5px 0; margin: 0;
`;
const AutocompleteOption = styled.li`
  padding: 10px 15px; font-size: 0.9rem; color: #333; cursor: pointer; transition: 0.2s; border-bottom: 1px solid #f1f5f9;
  background: ${props => props.$selected ? '#f0f7ff' : '#fff'}; border-left: ${props => props.$selected ? '3px solid #007bff' : '3px solid transparent'};
  &:hover { background: #f8fafc; color: #007bff; }
  &.danger { color: #dc3545; font-weight: 700; &:hover { background: #fff5f5; } }
  &.no-results { color: #94a3b8; font-style: italic; cursor: default; &:hover { background: #fff; } }
  .state { color: #94a3b8; margin-left: 4px; }
  .check-icon { float: right; color: #007bff; margin-top: 2px; }
`;
const IconButton = styled.button`
  background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 0 15px; cursor: pointer; font-size: 1.1rem; transition: 0.2s;
  &:hover { background: #e2e8f0; color: #1e293b; }
  &.danger { background: #fee2e2; color: #ef4444; &:hover { background: #fecaca; color: #dc2626; } }
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

// --- COMPONENTES DO SUB-MODAL DE OPORTUNIDADE ---
const OpDetailCard = styled.div`
  background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #edf2f9; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 15px 0; color: #2c3e50; font-size: 1.2rem; }
  .grid-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 0.9rem; color: #64748b; }
  .grid-details div { line-height: 1.5; }
  .text-purple { color: #6f42c1; } .text-green { color: #28a745; } .text-blue { color: #007bff; } .text-gray { color: #94a3b8; }
  .val { color: #2c3e50; font-weight: 800; font-size: 1.1rem; }
`;

const NotesCard = styled.div`
  background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #edf2f9; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 20px 0; padding-bottom: 15px; border-bottom: 1px solid #edf2f9; color: #2c3e50; display: flex; align-items: center; gap: 8px;}
  .loading, .empty { text-align: center; color: #94a3b8; padding: 20px; font-style: italic; }
  .notes-list { display: flex; flex-direction: column; gap: 15px; }
  .note-bubble { background: #f8fafc; border-left: 4px solid #007bff; padding: 15px; border-radius: 8px; }
  .note-head { display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; margin-bottom: 8px; strong { color: #2c3e50; display: flex; align-items: center; gap: 6px; } }
  .note-text { font-size: 0.95rem; color: #334155; white-space: pre-wrap; line-height: 1.5; }
`;