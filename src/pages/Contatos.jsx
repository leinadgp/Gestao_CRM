import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';

import { normalizarCargosJson, normalizarListaJson, cargosParaTexto } from '../utils/jsonHelpers.js';
import { BotaoExportar } from '../componentes/BotaoExportar.jsx';
import { ModalImportarCsv } from '../componentes/ModalImportarCsv.jsx';

export function Contatos() {
  const [contatos, setContatos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const perfilUsuario = localStorage.getItem('perfil');
  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

  // === ESTADO DOS CARGOS ===
  const [listaCargos, setListaCargos] = useState([]);

  // === FILTROS ===
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [dropdownEstadoAberto, setDropdownEstadoAberto] = useState(false);
  const [dropdownCargoAberto, setDropdownCargoAberto] = useState(false);

  const dropdownEstadoRef = useRef(null);
  const dropdownCargoRef = useRef(null);

  // === MODAIS ===
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosHistorico, setDadosHistorico] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const [mostrarModalOp, setMostrarModalOp] = useState(false);
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [notasOp, setNotasOp] = useState([]);
  const [carregandoNotas, setCarregandoNotas] = useState(false);

  // === ESTADOS DO MODAL DE NOVO CARGO ===
  const [mostrarModalNovoCargo, setMostrarModalNovoCargo] = useState(false);
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [cargoIndexAtual, setCargoIndexAtual] = useState(null);
  const [cargoAnteriorParaCancelamento, setCargoAnteriorParaCancelamento] = useState('');

  // === FORMULÁRIO ===
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [cargos, setCargos] = useState(['']);
  const [empresaId, setEmpresaId] = useState('');
  const [emails, setEmails] = useState(['']);
  const [telefones, setTelefones] = useState(['']);
  const [emailsComErroForm, setEmailsComErroForm] = useState([]);
  const [naoQuerEmail, setNaoQuerEmail] = useState(false);
  const [naoQuerLigacao, setNaoQuerLigacao] = useState(false);
  const [contatoCongeladoAte, setContatoCongeladoAte] = useState('');
  const [observacoesContato, setObservacoesContato] = useState('');
  
  // Autocomplete de Prefeituras
  const [buscaEmpresaNoForm, setBuscaEmpresaNoForm] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [modalImportarCsvAberto, setModalImportarCsvAberto] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const config = getHeaders();
      const [resC, resE, resCargos] = await Promise.all([
        axios.get(`${API_URL}/contatos`, config),
        axios.get(`${API_URL}/empresas`, config),
        axios.get(`${API_URL}/cargos`, config).catch(() => ({ data: [] }))
      ]);
      setContatos(resC.data);
      setEmpresas(resE.data);
      if(resCargos.data.length > 0) {
        setListaCargos(resCargos.data.map(c => c.nome));
      }
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      setCarregando(false);
    }
  }, [API_URL, getHeaders]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    const handleClickFora = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
        const atual = empresas.find(e => e.id === parseInt(empresaId));
        setBuscaEmpresaNoForm(atual ? atual.nome : '');
      }
      if (dropdownEstadoRef.current && !dropdownEstadoRef.current.contains(event.target)) setDropdownEstadoAberto(false);
      if (dropdownCargoRef.current && !dropdownCargoRef.current.contains(event.target)) setDropdownCargoAberto(false);
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [empresaId, empresas]);

  // ==========================================
  // PROTEÇÃO DO BOTÃO VOLTAR DO CELULAR
  // ==========================================
  useEffect(() => {
    const lidarComBotaoVoltar = () => {
      if (mostrarModalContato) {
        setMostrarModalContato(false);
      } else if (mostrarModalNovoCargo) {
        setMostrarModalNovoCargo(false);
      } else if (mostrarModalOp) {
        setMostrarModalOp(false);
      }
    };

    if (mostrarModalContato || mostrarModalNovoCargo || mostrarModalOp) {
      window.history.pushState(null, null, window.location.pathname);
      window.addEventListener('popstate', lidarComBotaoVoltar);
    }

    return () => window.removeEventListener('popstate', lidarComBotaoVoltar);
  }, [mostrarModalContato, mostrarModalNovoCargo, mostrarModalOp]);

  // Função genérica de manipulação de arrays do formulário
  const gerenciarCampo = (tipo, acao, index, valor) => {
    let set; let lista;
    if (tipo === 'email') { set = setEmails; lista = emails; }
    else if (tipo === 'tel') { set = setTelefones; lista = telefones; }
    else { set = setCargos; lista = cargos; } 

    if (acao === 'add') set([...lista, '']);
    if (acao === 'remove') set(lista.filter((_, i) => i !== index));
    if (acao === 'update') {
      const nova = [...lista];
      nova[index] = valor;
      set(nova);
    }
  };

  // --- FILTRO CORRIGIDO E BLINDADO AQUI ---
  const contatosFiltrados = useMemo(() => {
    const termo = buscaGeral.toLowerCase();
    return contatos.filter(c => {
      
      // Cria string segura independente do tipo de dado que vem do banco
      const emailsTexto = (c.emails || '') + ' ' + (Array.isArray(c.emails_json) ? c.emails_json.join(' ') : '');

      const matchBusca = (c.nome || '').toLowerCase().includes(termo) ||
        (c.empresa_nome || '').toLowerCase().includes(termo) ||
        emailsTexto.toLowerCase().includes(termo);
      
      const matchEstado = filtroEstado === '' || (c.estado || '').toUpperCase() === filtroEstado.toUpperCase();
      
      let matchCargo = true;
      if (filtroCargo !== '') {
        const cargosContato = normalizarCargosJson(c.cargos_json, []);
        matchCargo = cargosContato.includes(filtroCargo);
      }

      return matchBusca && matchEstado && matchCargo;
    });
  }, [contatos, buscaGeral, filtroEstado, filtroCargo]);

  const itensExibidos = useMemo(() => {
    return contatosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  }, [contatosFiltrados, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(contatosFiltrados.length / itensPorPagina);

  const empresasFiltradasParaSelect = useMemo(() => {
    return empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresaNoForm.toLowerCase()));
  }, [empresas, buscaEmpresaNoForm]);

  const abrirModalNovo = () => {
    setEditandoId(null); setNome(''); setCargos(['']); setEmpresaId(''); setBuscaEmpresaNoForm('');
    setEmails(['']); setTelefones(['']); setEmailsComErroForm([]);
    setNaoQuerEmail(false); setNaoQuerLigacao(false); setContatoCongeladoAte('');
    setObservacoesContato('');
    setModoEdicao(true); setMostrarModalContato(true);
  };

  const abrirModalContatoDetalhes = async (c) => {
    setEditandoId(c.id); setNome(c.nome || ''); 
    const listaCargos = normalizarCargosJson(c.cargos_json, []);
    setCargos(listaCargos.length ? listaCargos : ['']);
    setEmpresaId(c.empresa_id || ''); setBuscaEmpresaNoForm(c.empresa_nome || '');
    const listaEmails = normalizarListaJson(c.emails_json, []);
    setEmails(listaEmails.length ? listaEmails : ['']);
    const listaTels = normalizarListaJson(c.telefones_json, []);
    setTelefones(listaTels.length ? listaTels : ['']);
    setNaoQuerEmail(!!c.nao_quero_email);
    setNaoQuerLigacao(!!c.nao_quero_ligacao);
    setContatoCongeladoAte(c.congelado_ate || '');
    setObservacoesContato(c.observacoes || '');
    setEmailsComErroForm(c.emails_com_erro || []);
    setModoEdicao(false); setMostrarModalContato(true); setCarregandoHistorico(true);

    try {
      const res = await axios.get(`${API_URL}/contatos/${c.id}/detalhes`, getHeaders());
      setDadosHistorico(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const handleCargoChange = (e, idx) => {
    const valor = e.target.value;
    if (valor === 'NOVO_CARGO_ACTION') {
      setCargoAnteriorParaCancelamento(cargos[idx] || '');
      setCargoIndexAtual(idx);
      setNovoCargoNome('');
      setMostrarModalNovoCargo(true);
    } else {
      gerenciarCampo('cargo', 'update', idx, valor);
    }
  };

  const salvarNovoCargo = async (e) => {
    e.preventDefault();
    const nomeFormatado = novoCargoNome.trim();
    if (!nomeFormatado) return;
    try {
      await axios.post(`${API_URL}/cargos`, { nome: nomeFormatado }, getHeaders());
      if (!listaCargos.includes(nomeFormatado)) {
        setListaCargos(prev => [...prev, nomeFormatado].sort((a, b) => a.localeCompare(b)));
      }
      gerenciarCampo('cargo', 'update', cargoIndexAtual, nomeFormatado);
      setMostrarModalNovoCargo(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar novo cargo no banco.');
    }
  };

  const cancelarNovoCargo = () => {
    gerenciarCampo('cargo', 'update', cargoIndexAtual, cargoAnteriorParaCancelamento);
    setMostrarModalNovoCargo(false);
  };

  const salvarContato = async (e) => {
    e.preventDefault();
    const dados = {
      nome, 
      empresa_id: empresaId || null,
      cargos_json: cargos.filter(c => c.trim() !== ''),
      emails_json: emails.filter(em => em.trim() !== ''),
      telefones_json: telefones.filter(t => t.trim() !== ''),
      nao_quero_email: naoQuerEmail,
      nao_quero_ligacao: naoQuerLigacao,
      congelado_ate: contatoCongeladoAte || null,
      observacoes: observacoesContato || null,
    };
    try {
      if (editandoId) {
        await axios.put(`${API_URL}/contatos/${editandoId}`, dados, getHeaders());
        setModoEdicao(false);
        abrirModalContatoDetalhes({ ...dados, id: editandoId, empresa_nome: buscaEmpresaNoForm });
      } else {
        await axios.post(`${API_URL}/contatos`, dados, getHeaders());
        setMostrarModalContato(false);
      }
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao salvar contato.');
    }
  };

  const deletarContato = async (id) => {
    if (!id) return;
    if (!window.confirm('A exclusão é permanente e não poderá ser desfeita. Deseja continuar?')) return;
    try {
      await axios.delete(`${API_URL}/contatos/${id}`, getHeaders());
      // Recarrega lista e fecha modal
      await carregarDados();
      setMostrarModalContato(false);
    } catch (error) {
      alert(error.response?.data?.erro || 'Falha ao excluir contato.');
    }
  };

  const abrirDetalhesOp = async (op) => {
    setOpSelecionada(op); setMostrarModalOp(true); setCarregandoNotas(true);
    try {
      const res = await axios.get(`${API_URL}/oportunidades/${op.id}/notas`, getHeaders());
      setNotasOp(res.data);
    } catch (e) {
      alert("Erro ao carregar notas.");
    } finally {
      setCarregandoNotas(false);
    }
  };

  const formatarMoeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-';

  const calcularDiasRestantes = (value) => {
    if (!value) return null;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const data = new Date(value);
    data.setHours(0,0,0,0);
    const diff = Math.ceil((data - hoje) / 86400000);
    return Number.isFinite(diff) ? diff : null;
  };

  return (
    <>
      <PageContainer>
        <TopSection>
          <div>
            <Title>Base de Contatos</Title>
            <Subtitle>Gerencie leads e visualize o histórico 360º.</Subtitle>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <BotaoExportar tipo="contatos" params={{ estado: filtroEstado || undefined }} />
            <SecondaryButton type="button" onClick={() => setModalImportarCsvAberto(true)}>
              <i className="fa-solid fa-file-csv"></i> Importar CSV
            </SecondaryButton>
            <PrimaryButton onClick={abrirModalNovo} className="btn-novo">
              <i className="fa-solid fa-plus"></i> Novo Contato
            </PrimaryButton>
          </div>
        </TopSection>

        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input
              type="text"
              placeholder="Nome, Órgão, E-mail..."
              value={buscaGeral}
              onChange={e => { setBuscaGeral(e.target.value); setPaginaAtual(1); }}
            />
          </SearchWrapper>

          <FilterPillWrapper ref={dropdownEstadoRef}>
            <FilterButton $hasValue={!!filtroEstado} onClick={() => setDropdownEstadoAberto(!dropdownEstadoAberto)}>
              <i className="fa-solid fa-map-location-dot icon"></i> 
              <span> Estado: <strong>{filtroEstado || 'Todos'}</strong></span>
            </FilterButton>
            {dropdownEstadoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroEstado === ''} onClick={() => { setFiltroEstado(''); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>
                  Todos os Estados
                </CustomDropdownItem>
                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                  <CustomDropdownItem key={uf} $active={filtroEstado === uf} onClick={() => { setFiltroEstado(uf); setDropdownEstadoAberto(false); setPaginaAtual(1); }}>
                    {uf}
                  </CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>
          
          <FilterPillWrapper ref={dropdownCargoRef}>
            <FilterButton $hasValue={!!filtroCargo} onClick={() => setDropdownCargoAberto(!dropdownCargoAberto)}>
              <i className="fa-solid fa-user-tag icon"></i> 
              <span> Cargo: <strong>{filtroCargo || 'Todos'}</strong></span>
            </FilterButton>
            {dropdownCargoAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem $active={filtroCargo === ''} onClick={() => { setFiltroCargo(''); setDropdownCargoAberto(false); setPaginaAtual(1); }}>
                  Todos os Cargos
                </CustomDropdownItem>
                {listaCargos.map(cargoLista => (
                  <CustomDropdownItem key={cargoLista} $active={filtroCargo === cargoLista} onClick={() => { setFiltroCargo(cargoLista); setDropdownCargoAberto(false); setPaginaAtual(1); }}>
                    {cargoLista}
                  </CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>
        </FilterBar>

        <Panel>
          <TabelaResponsiva>
            <Table>
              <thead className="sticky-head">
                <tr>
                  <th>Contato (Lead)</th>
                  <th>Órgão / Vínculo</th>
                  <th>Função / Cargos</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="3" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="3" className="text-center text-muted">Nenhum resultado.</td></tr>
                ) : (
                  itensExibidos.map((c, index) => {
                    const ems = normalizarListaJson(c.emails_json, []);
                    const tels = normalizarListaJson(c.telefones_json, []);
                    const carLista = normalizarCargosJson(c.cargos_json, []);
                    const hasEmailError = c.emails_com_erro?.includes(ems[0]);

                    return (
                      <ClickableRow key={c.id} onClick={() => abrirModalContatoDetalhes(c)} style={{ animationDelay: `${index * 0.05}s` }}>
                        <td data-label="Contato (Lead)">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div className="contact-name">{c.nome}</div>
                            
                          </div>
                          <div className="contact-meta">
                            <span className={hasEmailError ? 'text-red font-bold' : ''}>
                              <i className={hasEmailError ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-envelope"}> </i> 
                              {ems[0] || ' Sem e-mail'}
                              {ems.length > 1 && <span className="more-badge">+{ems.length - 1}</span>}
                            </span>
                            <span>
                              <i className="fa-brands fa-whatsapp"> </i> {tels[0] || ' Sem Telefone'}
                              {tels.length > 1 && <span className="more-badge">+{tels.length - 1}</span>}
                            </span>
                            {(c.nao_quero_email || c.nao_quero_ligacao) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                {c.nao_quero_email && <Badge className="badge-warning">Não quer e-mail</Badge>}
                                {c.nao_quero_ligacao && <Badge className="badge-danger">Não quer ligação</Badge>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Vínculo">
                          <div className="company-name">{c.empresa_nome || 'Avulso'}</div>
                          {c.estado && <div className="state-tag">{c.estado}</div>}
                        </td>
                        <td data-label="Cargos">
                          <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                            {carLista.length > 0 ? carLista.map((cg, idx) => (
                              <Badge key={idx} className={idx === 0 ? 'badge-blue' : 'badge-gray'} title={idx === 0 ? 'Cargo principal' : 'Cargo secundário'}>{cg}</Badge>
                            )) : '-'}
                          </div>
                        </td>
                        <td className="actions" data-label="Ações">
                            <IconButton onClick={(e) => { e.stopPropagation(); deletarContato(c.id); }} className="danger" title="Excluir contato"><i className="fa-solid fa-trash"></i></IconButton>
                        </td>
                      </ClickableRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TabelaResponsiva>

          {contatosFiltrados.length > 0 && (
            <PaginationContainer>
              <div className="info">
                {contatosFiltrados.length} contato(s) · página <strong>{paginaAtual}</strong> de {totalPaginas || 1}
              </div>
              <div className="per-page">
                <label htmlFor="per-page-select">Por página:</label>
                <select
                  id="per-page-select"
                  value={itensPorPagina}
                  onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {totalPaginas > 1 && (
                <div className="controls">
                  <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => prev - 1)}>Anterior</PageButton>
                  <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(prev => prev + 1)}>Próxima</PageButton>
                </div>
              )}
            </PaginationContainer>
          )}
        </Panel>

        {/* MODAL PRINCIPAL */}
        {mostrarModalContato && (
          <ModalOverlay onClick={() => setMostrarModalContato(false)}>
            <ModalContent $large onClick={e => e.stopPropagation()}>
              <ModalHeader $bg={modoEdicao ? '#1F4E79' : '#ffffff'} $color={modoEdicao ? '#ffffff' : '#2c3e50'}>
                <div>
                  <h3>{modoEdicao ? (editandoId ? 'Editar Contato' : 'Novo Contato') : nome}</h3>
                  {!modoEdicao && <div className="subtitle">{cargosParaTexto(cargos) || '—'} <br/> {buscaEmpresaNoForm}</div>}
                </div>
                <div className="actions">
                   <DangerButton type="button" onClick={() => deletarContato(editandoId)}>Excluir Contato</DangerButton>
                  {!modoEdicao && <WarningButton onClick={() => setModoEdicao(true)}><i className="fa-solid fa-pen"></i> <span className="hide-mobile">Editar</span></WarningButton>}
                  <CloseButton $color={modoEdicao ? '#fff' : '#a0aec0'} onClick={() => setMostrarModalContato(false)}>&times;</CloseButton>
                </div>
              </ModalHeader>

              <ModalBody>
                {modoEdicao ? (
                  <form onSubmit={salvarContato}>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup className="span-2">
                        <label>Nome Completo *</label>
                        <Input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                      </FormGroup>

                      <FormGroup>
                        <label>Órgão Vínculo</label>
                        <AutocompleteContainer ref={dropdownRef}>
                          <Input value={buscaEmpresaNoForm} onFocus={() => setMostrarDropdown(true)} onChange={e => setBuscaEmpresaNoForm(e.target.value)} placeholder="Buscar órgão..." />
                          {mostrarDropdown && (
                            <AutocompleteList>
                              <AutocompleteOption className="danger" onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                                <i className="fa-solid fa-eraser"></i> Limpar Órgão
                              </AutocompleteOption>
                              {empresasFiltradasParaSelect.map(emp => (
                                <AutocompleteOption key={emp.id} onClick={() => { setEmpresaId(emp.id); setBuscaEmpresaNoForm(emp.nome); setMostrarDropdown(false); }}>
                                  {emp.nome}
                                </AutocompleteOption>
                              ))}
                            </AutocompleteList>
                          )}
                        </AutocompleteContainer>
                      </FormGroup>
                    </FormGrid>

                    <FormGrid $columns="1fr 1fr" style={{ marginTop: '20px' }}>
                      <DynamicInputBox className="span-2">
                        <div className="box-header"><span>Cargos e Funções</span> <AddLinkBtn type="button" onClick={() => gerenciarCampo('cargo', 'add')}><i className="fa-solid fa-plus"></i> Novo Cargo</AddLinkBtn></div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b' }}>
                          O primeiro é o cargo principal (usado na classificação). Os demais são secundários — o contato passa a receber e-mails/campanhas desses setores também, sem mudar o cargo principal.
                        </p>
                        <div className="dynamic-grid">
                          {cargos.map((cg, i) => (
                            <DynamicInputRow key={i}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, minWidth: 76, color: i === 0 ? '#1F4E79' : '#92400e' }} title={i === 0 ? 'Cargo principal, usado na classificação do órgão' : 'Cargo secundário — só para receber campanhas deste setor'}>
                                {i === 0 ? 'PRINCIPAL' : 'SECUNDÁRIO'}
                              </span>
                              <Select value={cg} onChange={(e) => handleCargoChange(e, i)}>
                                <option value="">-- Selecione ou digite novo --</option>
                                <option disabled>──────────</option>
                                {listaCargos.map(c => <option key={c} value={c}>{c}</option>)}
                                <option disabled>──────────</option>
                                <option value="NOVO_CARGO_ACTION" style={{ fontWeight: 'bold', color: '#007bff' }}>+ Adicionar novo...</option>
                              </Select>
                              <IconButton type="button" className="danger" onClick={() => gerenciarCampo('cargo', 'remove', i)}><i className="fa-solid fa-trash"></i></IconButton>
                            </DynamicInputRow>
                          ))}
                        </div>
                      </DynamicInputBox>

                      <DynamicInputBox>
                        <div className="box-header"><span>E-mails</span> <AddLinkBtn type="button" onClick={() => gerenciarCampo('email', 'add')}><i className="fa-solid fa-plus"></i> Novo</AddLinkBtn></div>
                        {emails.map((em, i) => (
                          <DynamicInputRow key={i}>
                            <Input value={em} onChange={e => gerenciarCampo('email', 'update', i, e.target.value)} />
                            <IconButton type="button" className="danger" onClick={() => gerenciarCampo('email', 'remove', i)}><i className="fa-solid fa-trash"></i></IconButton>
                          </DynamicInputRow>
                        ))}
                      </DynamicInputBox>

                      <DynamicInputBox>
                        <div className="box-header"><span>Telefones</span> <AddLinkBtn type="button" onClick={() => gerenciarCampo('tel', 'add')}><i className="fa-solid fa-plus"></i> Novo</AddLinkBtn></div>
                        {telefones.map((tel, i) => (
                          <DynamicInputRow key={i}>
                            <Input value={tel} onChange={e => gerenciarCampo('tel', 'update', i, e.target.value)} />
                            <IconButton type="button" className="danger" onClick={() => gerenciarCampo('tel', 'remove', i)}><i className="fa-solid fa-trash"></i></IconButton>
                          </DynamicInputRow>
                        ))}
                      </DynamicInputBox>

                      <FormGroup className="span-2">
                        <label>Preferências de contato</label>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={naoQuerEmail} onChange={e => setNaoQuerEmail(e.target.checked)} />
                            Não quer receber e-mails
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={naoQuerLigacao} onChange={e => setNaoQuerLigacao(e.target.checked)} />
                            Não quer receber ligações
                          </label>
                        </div>
                      </FormGroup>
                      <FormGroup>
                        <label>Congelar contato até</label>
                        <Input type="date" value={contatoCongeladoAte} onChange={e => setContatoCongeladoAte(e.target.value)} />
                      </FormGroup>
                      <FormGroup className="span-2">
                        <label><i className="fa-solid fa-note-sticky" style={{ color: '#d97706' }}></i> Observações do Contato <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#92400e' }}>(visível em todas as negociações/campanhas deste contato)</span></label>
                        <TextArea rows={3} value={observacoesContato} onChange={e => setObservacoesContato(e.target.value)} placeholder="Ex: está de férias até dia 20/07. Recebe e-mails de Controle Interno mesmo sendo Secretária." />
                      </FormGroup>
                    </FormGrid>

                    <ModalFooter $justify="flex-end">
                      <PrimaryButton type="submit"><i className="fa-solid fa-save"></i> Salvar Contato</PrimaryButton>
                    </ModalFooter>
                  </form>
                ) : (
                  <>
                    {observacoesContato && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#92400e' }}><i className="fa-solid fa-note-sticky"></i> Observações do Contato</h4>
                        <p style={{ color: '#92400e', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>{observacoesContato}</p>
                      </div>
                    )}
                    <ProfileGrid>
                      <InfoCard $borderTop="#007bff">
                        <h4><i className="fa-regular fa-envelope"></i> E-mails</h4>
                        <ul>
                          {emails.map((em, i) => {
                            const hasError = emailsComErroForm.includes(em);
                            return (
                              <li key={i} className={hasError ? 'email-item error' : 'email-item'}>
                                {em}
                                {hasError && <i className="fa-solid fa-triangle-exclamation icon-err"></i>}
                              </li>
                            );
                          })}
                        </ul>
                      </InfoCard>
                      <InfoCard $borderTop="#28a745">
                        <h4><i className="fa-brands fa-whatsapp"></i> Telefones</h4>
                        <div className="phones-container">
                          {telefones.map((tel, i) => <span key={i} className="phone-pill">{tel}</span>)}
                        </div>
                      </InfoCard>
                      <InfoCard $borderTop="#f59e0b">
                        <h4><i className="fa-solid fa-ban"></i> Preferências</h4>
                        <p style={{ margin: 0 }}>{naoQuerEmail ? 'Não deseja receber e-mails' : 'Pode receber e-mails'}</p>
                        <p style={{ margin: '8px 0 0 0' }}>{naoQuerLigacao ? 'Não deseja receber ligações' : 'Pode receber chamadas'}</p>
                      </InfoCard>
                      <InfoCard $borderTop="#38bdf8">
                        <h4><i className="fa-solid fa-snowflake"></i> Congelamento</h4>
                        {contatoCongeladoAte ? (
                          <>
                            <p style={{ margin: 0 }}>Congelado até <strong>{formatarData(contatoCongeladoAte)}</strong></p>
                            <p style={{ margin: '8px 0 0 0', color: '#475569' }}>{calcularDiasRestantes(contatoCongeladoAte) >= 0 ? `Faltam ${calcularDiasRestantes(contatoCongeladoAte)} dia(s) para descongelamento.` : 'Contato pronto para ser reativado.'}</p>
                          </>
                        ) : (
                          <p style={{ margin: 0 }}>Nenhum congelamento registrado.</p>
                        )}
                      </InfoCard>
                      <InfoCard $borderTop="#38bdf8">
                        <h4><i className="fa-solid fa-snowflake"></i> Congelamento</h4>
                        {contatoCongeladoAte ? (
                          <>
                            <p style={{ margin: 0 }}>Congelado até <strong>{formatarData(contatoCongeladoAte)}</strong></p>
                            <p style={{ margin: '8px 0 0 0', color: '#475569' }}>{calcularDiasRestantes(contatoCongeladoAte) >= 0 ? `Faltam ${calcularDiasRestantes(contatoCongeladoAte)} dia(s) para descongelamento.` : 'Contato pronto para ser reativado.'}</p>
                          </>
                        ) : (
                          <p style={{ margin: 0 }}>Nenhum congelamento registrado.</p>
                        )}
                      </InfoCard>
                    </ProfileGrid>

                    <ModalFooter $justify="flex-end">
                     
                    </ModalFooter>

                    <FunnelHistoryCard>
                      {carregandoHistorico ? "Carregando..." : dadosHistorico?.oportunidades.map(op => (
                        <HistoryRow key={op.id} $borderColor="#007bff" onClick={() => abrirDetalhesOp(op)}>
                          <div className="info-main">
                            <div className="op-title">{op.titulo} <span className="status-tag">{op.status}</span></div>
                            <div className="op-meta">Valor: {formatarMoeda(op.valor)} | Criado em {formatarData(op.criado_em)}</div>
                          </div>
                          <PrimaryButton className="btn-history">Ver Notas</PrimaryButton>
                        </HistoryRow>
                      ))}
                    </FunnelHistoryCard>
                  </>
                )}
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* MODAL PARA CRIAR NOVO CARGO */}
        {mostrarModalNovoCargo && (
          <ModalOverlay style={{ zIndex: 10001 }}>
            <ModalContent $small>
              <ModalHeader $bg="#f8f9fa" $color="#333">
                <h3 style={{ fontSize: '1.1rem' }}><i className="fa-solid fa-plus-circle text-green"></i> Adicionar Novo Cargo</h3>
                <CloseButton onClick={cancelarNovoCargo}>&times;</CloseButton>
              </ModalHeader>
              <form onSubmit={salvarNovoCargo}>
                <ModalBody>
                  <FormGroup>
                    <label>Nome do Novo Cargo *</label>
                    <Input type="text" required autoFocus value={novoCargoNome} onChange={e => setNovoCargoNome(e.target.value)} placeholder="Ex: Engenheiro, Procurador..." />
                  </FormGroup>
                </ModalBody>
                <ModalFooter $justify="flex-end">
                  <SecondaryButton type="button" onClick={cancelarNovoCargo}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit">Salvar e Selecionar</PrimaryButton>
                </ModalFooter>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

        <ModalImportarCsv
          aberto={modalImportarCsvAberto}
          onFechar={() => setModalImportarCsvAberto(false)}
          endpoint="/import/contatos"
          titulo="Importar Contatos via CSV"
          colunasModelo={['contato_nome', 'contato_emails', 'contato_telefones', 'contato_cargos', 'empresa_nome']}
          onImportado={carregarDados}
        />

        {/* SUB-MODAL DE NOTAS */}
        {mostrarModalOp && (
          <ModalOverlay onClick={() => setMostrarModalOp(false)} style={{ zIndex: 10000 }}>
            <ModalContent $small onClick={e => e.stopPropagation()}>
              <ModalHeader $bg="#007bff" $color="#fff">
                <h3>Notas da Negociação</h3>
                <CloseButton $color="#fff" onClick={() => setMostrarModalOp(false)}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                {carregandoNotas ? "Buscando notas..." : notasOp.map(n => (
                  <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <strong>{n.usuario_nome}</strong> - {new Date(n.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}<br />
                    {n.nota}
                  </div>
                ))}
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

// --- ESTILOS RESPONSIVOS E PREMIUM CLARO ---
const PageContainer = styled.div` 
  padding: 30px; background: #f4f7f6; min-height: 100vh; 
  @media (max-width: 768px) { padding: 15px; }
`;

const TopSection = styled.div` 
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; .btn-novo { width: 100%; justify-content: center; } }
`;
const Title = styled.h2` margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700; `;
const Subtitle = styled.p` color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0; `;

const FilterBar = styled.div` 
  display: flex; flex-wrap: wrap; gap: 15px; background: #fff; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #edf2f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
  @media (max-width: 768px) { flex-direction: column; }
`;

const SearchWrapper = styled.div` 
  flex: 1; position: relative; min-width: 250px;
  input { width: 100%; padding: 12px 40px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; transition: 0.2s; box-sizing: border-box; } 
  input:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #a0aec0; } 
  @media (max-width: 768px) { width: 100%; }
`;

const FilterPillWrapper = styled.div` position: relative; @media (max-width: 768px) { width: 100%; } `;

const FilterButton = styled.button` 
  display: flex; align-items: center; padding: 10px 20px; border-radius: 10px; border: 1px solid #cbd5e1; cursor: pointer; transition: 0.2s;
  background: ${props => props.$hasValue ? '#eef4fa' : '#fff'}; color: #2c3e50; font-size: 0.95rem; width: 100%; justify-content: space-between;
  &:hover { background: #e7f3ff; border-color: #007bff; }
  span { margin: 0 10px; }
  .icon { color: #007bff; font-size: 1.05rem; }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; border: 1px solid #edf2f9; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 200px; 
  max-height: 250px; overflow-y: auto; z-index: 1000; padding: 8px 0; list-style: none; margin: 0;
  @media (max-width: 768px) { left: 0; width: 100%; }
`;
const CustomDropdownItem = styled.li` 
  padding: 10px 20px; font-size: 0.9rem; cursor: pointer; transition: 0.2s;
  &:hover { background: #f8fafc; color: #007bff; } 
  ${props => props.$active && `color: #007bff; font-weight: 700; background: #f0f7ff;`}
`;

const Panel = styled.div` background: #fff; border-radius: 10px; border: 1px solid #edf2f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02); `;

const TabelaResponsiva = styled.div`
  overflow: auto;
  max-height: calc(100vh - 340px);
  &::-webkit-scrollbar { height: 6px; width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; border-bottom: 2px solid #edf2f9; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; position: sticky; top: 0; z-index: 2; }
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; }

  @media (max-width: 768px) {
    min-width: unset; display: block;
    thead, tbody, th, td, tr { display: block; }
    thead tr { position: absolute; top: -9999px; left: -9999px; }
    
    tr {
      background: #fff; border: 1px solid #edf2f9; border-radius: 10px; margin: 15px 0; padding: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }
    
    td {
      border: none; border-bottom: 1px solid #f1f5f9; position: relative; padding: 12px 15px; text-align: left; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
    }
    
    td:last-child { border-bottom: none; }
    
    td::before {
      position: relative; top: auto; left: auto; transform: none; width: 100%; padding: 0; white-space: nowrap; text-align: left; font-weight: 800; color: #94a3b8; font-size: 0.7rem; content: attr(data-label); text-transform: uppercase; letter-spacing: 0.5px;
    }
  }
`;

const ClickableRow = styled.tr`
  cursor: pointer; transition: 0.2s; animation: ${fadeInUp} 0.4s ease forwards; opacity: 0;
  &:hover { background: #f8fafc; }
  .contact-name { font-weight: 800; color: #2c3e50; font-size: 1.05rem; margin-bottom: 4px; }
  .contact-meta { font-size: 0.85rem; color: #6c757d; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; align-items: flex-start; }
  .state-tag { color: #007bff; font-weight: bold; font-size: 0.75rem; margin-top: 4px; }
  .text-red { color: #e53e3e; }
  .company-name { font-weight: 600; color: #495057; }
  span { display: flex; align-items: center; gap: 5px;}
`;

const Badge = styled.span` padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; &.badge-gray { background: #f1f5f9; color: #475569; } &.badge-warning { background: #fff4e5; color: #b45309; } &.badge-danger { background: #ffe4e6; color: #991b1b; } &.badge-blue { background: #dbeafe; color: #1e40af; } `;

const PaginationContainer = styled.div`
  padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #fbfbfc; border-top: 1px solid #edf2f9; gap: 12px; flex-wrap: wrap;
  .info { font-size: 0.85rem; color: #6c757d; }
  .per-page { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #6c757d;
    select { padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; background: #fff; cursor: pointer; }
    select:focus { outline: none; border-color: #007bff; }
  }
  .controls { display: flex; gap: 8px; }
  @media (max-width: 600px){ flex-direction: column; align-items: flex-start; gap: 10px; }
`;
const PageButton = styled.button` padding: 8px 15px; cursor: pointer; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #475569; font-weight: 600; transition: 0.2s; &:hover:not(:disabled) { background: #eef4fa; border-color: #007bff; color: #007bff; } &:disabled{ opacity: 0.4; cursor: not-allowed; } `;

const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box; `;
const ModalContent = styled.div` background: #fff; border-radius: 16px; width: 100%; max-width: ${props => props.$large ? '900px' : '500px'}; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.2); animation: ${fadeInUp} 0.3s ease-out; `;
const ModalHeader = styled.div` 
  padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; background: ${props => props.$bg}; color: ${props => props.$color}; border-bottom: 1px solid rgba(0,0,0,0.05);
  h3 { margin: 0; font-size: 1.3rem; font-weight: 800;} 
  .subtitle { font-size: 0.85rem; opacity: 0.9; margin-top: 6px; line-height: 1.4; font-weight: 500;} 
  .actions { display: flex; align-items: center; gap: 15px; }
  .hide-mobile { @media (max-width: 600px) { display: none; } }
`;
const ModalBody = styled.div` padding: 25px; overflow-y: auto; flex: 1; @media (max-width: 600px) { padding: 15px; } `;
const ModalFooter = styled.div` padding: 20px 25px; border-top: 1px solid #edf2f9; display: flex; justify-content: ${props => props.$justify || 'space-between'}; gap: 10px; background: #fbfbfc; @media (max-width: 600px){ flex-direction: column; button { width: 100%; justify-content: center; } } `;
const CloseButton = styled.button` background: none; border: none; font-size: 1.8rem; color: ${props => props.$color}; cursor: pointer; transition: 0.2s; &:hover { transform: scale(1.1); } `;

const ButtonBase = styled.button` padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; &:active { transform: scale(0.98); }`;
const PrimaryButton = styled(ButtonBase)` background: #007bff; color: #fff; &:hover { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); } `;
const SecondaryButton = styled(ButtonBase)` background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; &:hover { background: #e2e8f0; } `;
const WarningButton = styled(ButtonBase)` background: #ffc107; color: #333; padding: 8px 15px; font-size: 0.9rem; &:hover { background: #e0a800; box-shadow: 0 4px 10px rgba(255,193,7,0.2); } `;
const DangerButton = styled(ButtonBase)` background: #fff5f5; color: #dc3545; border: 1px solid #f8d7da; &:hover { background: #dc3545; color: #fff; box-shadow: 0 4px 10px rgba(220,53,69,0.2); } `;

const Input = styled.input` width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: 0.2s; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); } `;
const TextArea = styled.textarea` width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; resize: vertical; transition: 0.2s; box-sizing: border-box; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); } `;
const Select = styled.select` width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 0.95rem; outline: none; transition: 0.2s; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); } `;
const FormGrid = styled.div` display: grid; grid-template-columns: ${props => props.$columns}; gap: 15px; .span-2 { grid-column: span 2; } @media (max-width: 600px) { grid-template-columns: 1fr; .span-2 { grid-column: span 1; } } `;
const FormGroup = styled.div` display: flex; flex-direction: column; label { font-weight: 700; margin-bottom: 6px; font-size: 0.85rem; color: #475569; } `;

const AutocompleteContainer = styled.div` position: relative; `;
const AutocompleteList = styled.div` position: absolute; width: 100%; background: #fff; border: 1px solid #edf2f9; border-radius: 8px; z-index: 20; max-height: 200px; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin-top: 5px; `;
const AutocompleteOption = styled.div` padding: 12px 15px; cursor: pointer; font-size: 0.9rem; border-bottom: 1px solid #f8fafc; &:hover { background: #f0f7ff; color: #007bff; font-weight: 600; } &.danger { color: #dc3545; font-weight: 700; &:hover { background: #fff5f5; } } `;

const DynamicInputBox = styled.div` border: 1px solid #edf2f9; background: #fbfbfc; padding: 20px; border-radius: 12px; .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 700; font-size: 0.95rem; color: #2c3e50; } .dynamic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; @media(max-width:600px){grid-template-columns: 1fr;} }`;
const DynamicInputRow = styled.div` display: flex; gap: 8px; flex: 1; align-items: center;`;
const AddLinkBtn = styled.button` background: rgba(0,123,255,0.1); border: none; color: #007bff; cursor: pointer; font-weight: 700; font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; transition: 0.2s; &:hover { background: #007bff; color: #fff; } `;
const IconButton = styled.button` padding: 8px 12px; border-radius: 8px; cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; transition: 0.2s; &.danger { color: #dc3545; background: #fff5f5; border-color: #f8d7da; &:hover { background: #dc3545; color: #fff; } } `;

const ProfileGrid = styled.div` 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
  gap: 20px; 
  margin-bottom: 20px;
`;

const InfoCard = styled.div` 
  border: 1px solid #edf2f7; 
  border-top: 4px solid ${props => props.$borderTop}; 
  padding: 20px; 
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);

  h4 { 
    margin: 0 0 15px 0; 
    color: #2c3e50; 
    font-size: 1.05rem; 
    display: flex;
    align-items: center;
    gap: 8px;
  }

  ul { list-style: none; padding: 0; margin: 0; }

  .email-item {
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 8px;
    background: #f8fafc;
    border: 1px solid #edf2f9;
    font-size: 0.95rem;
    color: #475569;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &.error {
      background: #fff5f5;
      border-color: #f8d7da;
      color: #dc3545;
      font-weight: 600;
    }
  }

  .icon-err { color: #dc3545; font-size: 1rem; }

  .phones-container { display: flex; flex-wrap: wrap; gap: 10px; }

  .phone-pill {
    background: #e6f4ea; border: 1px solid #c3e6cb; color: #155724;
    padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;
  }
`;

const FunnelHistoryCard = styled.div` 
  margin-top: 25px; border: 1px solid #edf2f9; padding: 25px; border-radius: 12px; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
  h4 { margin: 0 0 15px 0; font-size: 1.1rem; color: #2c3e50; }
`;

const HistoryRow = styled.div` 
  display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-left: 4px solid ${props => props.$borderColor}; 
  background: #f8fafc; margin-bottom: 12px; border-radius: 0 8px 8px 0; cursor: pointer; transition: 0.2s; border-top: 1px solid #edf2f9; border-right: 1px solid #edf2f9; border-bottom: 1px solid #edf2f9;
  
  &:hover { transform: translateX(5px); background: #eef4fa; border-color: #007bff; }
  
  .info-main { display: flex; flex-direction: column; gap: 6px; }
  .op-title { font-weight: 800; color: #2c3e50; font-size: 1.05rem;}
  .status-tag { font-size: 0.75rem; background: #e2e8f0; padding: 4px 10px; border-radius: 12px; margin-left: 8px; color: #475569; font-weight: bold; text-transform: uppercase;}
  .op-meta { font-size: 0.85rem; color: #64748b; }
  
  .btn-history { padding: 8px 15px; font-size: 0.85rem; border-radius: 6px;}
  
  @media (max-width: 600px) {
    flex-direction: column; align-items: flex-start; gap: 15px;
    .btn-history { width: 100%; justify-content: center; }
  }
`;