// src/pages/Contatos.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';

// --- UTILITÁRIOS ---
const parseJSONSeguro = (dadoString, fallback = []) => {
  if (!dadoString) return fallback;
  if (typeof dadoString !== 'string') return dadoString;
  try { return JSON.parse(dadoString); } catch { return fallback; }
};

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
  const [cargoAnterior, setCargoAnterior] = useState('');

  // === FORMULÁRIO ===
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [emails, setEmails] = useState(['']);
  const [telefones, setTelefones] = useState(['']);
  const [emailsComErroForm, setEmailsComErroForm] = useState([]);
  
  // Autocomplete de Prefeituras
  const [buscaEmpresaNoForm, setBuscaEmpresaNoForm] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 15;

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

  const gerenciarCampo = (tipo, acao, index, valor) => {
    const set = tipo === 'email' ? setEmails : setTelefones;
    const lista = tipo === 'email' ? emails : telefones;

    if (acao === 'add') set([...lista, '']);
    if (acao === 'remove') set(lista.filter((_, i) => i !== index));
    if (acao === 'update') {
      const nova = [...lista];
      nova[index] = valor;
      set(nova);
    }
  };

  const contatosFiltrados = useMemo(() => {
    const termo = buscaGeral.toLowerCase();
    return contatos.filter(c => {
      const matchBusca = (c.nome || '').toLowerCase().includes(termo) ||
        (c.empresa_nome || '').toLowerCase().includes(termo) ||
        (c.emails_json || '').toLowerCase().includes(termo);
      const matchEstado = filtroEstado === '' || (c.estado || '').toUpperCase() === filtroEstado.toUpperCase();
      const matchCargo = filtroCargo === '' || c.cargo === filtroCargo;
      return matchBusca && matchEstado && matchCargo;
    });
  }, [contatos, buscaGeral, filtroEstado, filtroCargo]);

  const itensExibidos = useMemo(() => {
    return contatosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  }, [contatosFiltrados, paginaAtual]);

  const totalPaginas = Math.ceil(contatosFiltrados.length / itensPorPagina);

  const empresasFiltradasParaSelect = useMemo(() => {
    return empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresaNoForm.toLowerCase()));
  }, [empresas, buscaEmpresaNoForm]);

  const abrirModalNovo = () => {
    setEditandoId(null); setNome(''); setCargo(''); setEmpresaId(''); setBuscaEmpresaNoForm('');
    setEmails(['']); setTelefones(['']); setEmailsComErroForm([]);
    setModoEdicao(true); setMostrarModalContato(true);
  };

  const abrirModalContatoDetalhes = async (c) => {
    setEditandoId(c.id); setNome(c.nome || ''); setCargo(c.cargo || '');
    setEmpresaId(c.empresa_id || ''); setBuscaEmpresaNoForm(c.empresa_nome || '');
    setEmails(parseJSONSeguro(c.emails_json, ['']));
    setTelefones(parseJSONSeguro(c.telefones_json, ['']));
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

  const handleCargoChange = (e) => {
    const valor = e.target.value;
    if (valor === 'NOVO_CARGO_ACTION') {
      setCargoAnterior(cargo);
      setNovoCargoNome('');
      setMostrarModalNovoCargo(true);
    } else {
      setCargo(valor);
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
      setCargo(nomeFormatado);
      setMostrarModalNovoCargo(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar novo cargo no banco.');
    }
  };

  const cancelarNovoCargo = () => {
    setCargo(cargoAnterior);
    setMostrarModalNovoCargo(false);
  };

  const salvarContato = async (e) => {
    e.preventDefault();
    const dados = {
      nome, cargo, empresa_id: empresaId || null,
      emails_json: emails.filter(em => em.trim() !== ''),
      telefones_json: telefones.filter(t => t.trim() !== '')
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
  const formatarData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <>
      <Header titulo="Gestão de Contatos" />
      <PageContainer>
        <TopSection>
          <div>
            <Title>Base de Contatos</Title>
            <Subtitle>Gerencie leads e visualize o histórico 360º.</Subtitle>
          </div>
          <PrimaryButton onClick={abrirModalNovo}>
            <i className="fa-solid fa-plus"></i> Novo Contato
          </PrimaryButton>
        </TopSection>

        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input
              type="text"
              placeholder="Nome, Prefeitura, E-mail..."
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
                  <tr><td colSpan="3" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>
                ) : itensExibidos.length === 0 ? (
                  <tr><td colSpan="3" className="text-center text-muted">Nenhum resultado.</td></tr>
                ) : (
                  itensExibidos.map(c => {
                    const ems = parseJSONSeguro(c.emails_json);
                    const tels = parseJSONSeguro(c.telefones_json);
                    const hasEmailError = c.emails_com_erro?.includes(ems[0]);

                    return (
                      <ClickableRow key={c.id} onClick={() => abrirModalContatoDetalhes(c)}>
                        <td>
                          <div className="contact-name">{c.nome}</div>
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
                          </div>
                        </td>
                        <td>
                          <div className="company-name">{c.empresa_nome || 'Avulso'}</div>
                          {c.estado && <div className="state-tag">{c.estado}</div>}
                        </td>
                        <td>{c.cargo ? <Badge className="badge-gray">{c.cargo}</Badge> : '-'}</td>
                      </ClickableRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableContainer>

          {totalPaginas > 1 && (
            <PaginationContainer>
              <div className="info">Página <strong>{paginaAtual}</strong> de {totalPaginas}</div>
              <div className="controls">
                <PageButton disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => prev - 1)}>Anterior</PageButton>
                <PageButton disabled={paginaAtual >= totalPaginas} onClick={() => setPaginaAtual(prev => prev + 1)}>Próxima</PageButton>
              </div>
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
                  {!modoEdicao && <div className="subtitle">{cargo} | {buscaEmpresaNoForm}</div>}
                </div>
                <div className="actions">
                  {!modoEdicao && <WarningButton onClick={() => setModoEdicao(true)}><i className="fa-solid fa-pen"></i> Editar</WarningButton>}
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
                        <label>Cargo / Função</label>
                        <Select value={cargo} onChange={handleCargoChange}>
                          <option value="">-- Nenhum Cargo / Avulso --</option>
                          {listaCargos.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option disabled>──────────</option>
                          <option value="NOVO_CARGO_ACTION" style={{ fontWeight: 'bold', color: '#007bff' }}>
                            + Adicionar novo cargo...
                          </option>
                        </Select>
                      </FormGroup>

                      <FormGroup>
                        <label>Prefeitura</label>
                        <AutocompleteContainer ref={dropdownRef}>
                          <Input value={buscaEmpresaNoForm} onFocus={() => setMostrarDropdown(true)} onChange={e => setBuscaEmpresaNoForm(e.target.value)} placeholder="Buscar prefeitura..." />
                          {mostrarDropdown && (
                            <AutocompleteList>
                              <AutocompleteOption className="danger" onClick={() => { setEmpresaId(''); setBuscaEmpresaNoForm(''); setMostrarDropdown(false); }}>
                                <i className="fa-solid fa-eraser"></i> Limpar Prefeitura
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
                      <DynamicInputBox>
                        <div className="box-header"><span>E-mails</span> <AddLinkBtn type="button" onClick={() => gerenciarCampo('email', 'add')}>+ Novo</AddLinkBtn></div>
                        {emails.map((em, i) => (
                          <DynamicInputRow key={i}>
                            <Input value={em} onChange={e => gerenciarCampo('email', 'update', i, e.target.value)} />
                            <IconButton type="button" className="danger" onClick={() => gerenciarCampo('email', 'remove', i)}><i className="fa-solid fa-trash"></i></IconButton>
                          </DynamicInputRow>
                        ))}
                      </DynamicInputBox>

                      <DynamicInputBox>
                        <div className="box-header"><span>Telefones</span> <AddLinkBtn type="button" onClick={() => gerenciarCampo('tel', 'add')}>+ Novo</AddLinkBtn></div>
                        {telefones.map((tel, i) => (
                          <DynamicInputRow key={i}>
                            <Input value={tel} onChange={e => gerenciarCampo('tel', 'update', i, e.target.value)} />
                            <IconButton type="button" className="danger" onClick={() => gerenciarCampo('tel', 'remove', i)}><i className="fa-solid fa-trash"></i></IconButton>
                          </DynamicInputRow>
                        ))}
                      </DynamicInputBox>
                    </FormGrid>

                    <ModalFooter $justify="flex-end">
                      <PrimaryButton type="submit">Salvar Contato</PrimaryButton>
                    </ModalFooter>
                  </form>
                ) : (
                  <>
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
                    </ProfileGrid>

                    <FunnelHistoryCard>
                      <h4>Histórico de Negociações</h4>
                      {carregandoHistorico ? "Carregando..." : dadosHistorico?.oportunidades.map(op => (
                        <HistoryRow key={op.id} $borderColor="#007bff" onClick={() => abrirDetalhesOp(op)}>
                          <div className="info-main">
                            <div className="op-title">{op.titulo} <span className="status-tag">{op.status}</span></div>
                            <div className="op-meta">Valor: {formatarMoeda(op.valor)} | Criado em {formatarData(op.criado_em)}</div>
                          </div>
                          <PrimaryButton>Ver Notas</PrimaryButton>
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
                    <strong>{n.usuario_nome}</strong> - {new Date(n.criado_em).toLocaleString()}<br />
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

// --- ESTILOS ---
const PageContainer = styled.div` padding: 30px; background: #f4f7f6; min-height: 100vh; `;
const TopSection = styled.div` display: flex; justify-content: space-between; margin-bottom: 20px; `;
const Title = styled.h2` margin: 0; color: #2c3e50; `;
const Subtitle = styled.p` color: #6c757d; `;
const FilterBar = styled.div` display: flex; gap: 15px; background: #fff; padding: 15px; border-radius: 12px; margin-bottom: 20px; `;
const SearchWrapper = styled.div` flex: 1; position: relative; input { width: 100%; padding: 10px 40px; border-radius: 20px; border: 1px solid #ddd; } .icon { position: absolute; left: 15px; top: 12px; color: #aaa; } `;
const FilterPillWrapper = styled.div` position: relative; `;
const FilterButton = styled.button` padding: 10px 20px; border-radius: 20px; border: 1px solid #ddd; cursor: pointer; background: ${props => props.$hasValue ? '#eef4fa' : '#fff'}; `;
const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; border: 1px solid #edf2f9; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 200px; 
  max-height: 250px; overflow-y: auto; overflow-x: hidden; z-index: 1000; padding: 8px 0; list-style: none; margin: 0;
`;
const CustomDropdownItem = styled.li` padding: 10px 20px; font-size: 0.9rem; cursor: pointer; &:hover { background: #f8fafc; color: #007bff; } `;
const Panel = styled.div` background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee; `;
const TableContainer = styled.div` overflow-x: auto; `;
const Table = styled.table` width: 100%; border-collapse: collapse; th { text-align: left; padding: 15px; background: #fbfbfc; border-bottom: 1px solid #eee; } td { padding: 15px; border-bottom: 1px solid #eee; } `;
const ClickableRow = styled.tr` cursor: pointer; &:hover { background: #f8fafc; } .contact-name { font-weight: bold; color: #007bff; } .contact-meta { font-size: 0.8rem; color: #777; display: flex; gap: 10px; margin-top: 4px; } .state-tag { color: #007bff; font-weight: bold; font-size: 0.7rem; } .text-red { color: #e53e3e; } span { display: flex; align-items: center; gap: 5px;}`;
const Badge = styled.span` padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; &.badge-gray { background: #eee; } `;
const PaginationContainer = styled.div` padding: 15px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; `;
const PageButton = styled.button` padding: 5px 15px; cursor: pointer; `;
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; `;
const ModalContent = styled.div` background: #fff; border-radius: 8px; width: 90%; max-width: ${props => props.$large ? '900px' : '400px'}; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; `;
const ModalHeader = styled.div` padding: 20px; display: flex; justify-content: space-between; background: ${props => props.$bg}; color: ${props => props.$color}; h3 { margin: 0; } .subtitle { font-size: 0.85rem; opacity: 0.8; margin-top: 4px; } `;
const ModalBody = styled.div` padding: 20px; overflow-y: auto; `;
const ModalFooter = styled.div` padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: ${props => props.$justify || 'space-between'}; gap: 10px; `;
const CloseButton = styled.button` background: none; border: none; font-size: 1.5rem; color: ${props => props.$color}; cursor: pointer; `;
const PrimaryButton = styled.button` background: #007bff; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; &:hover { background: #0056b3; } `;
const WarningButton = styled.button` background: #ffc107; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; `;
const SecondaryButton = styled.button` background: #eee; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; `;
const Input = styled.input` width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; `;
const Select = styled.select` width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; `;
const FormGrid = styled.div` display: grid; grid-template-columns: ${props => props.$columns}; gap: 15px; .span-2 { grid-column: span 2; } `;
const FormGroup = styled.div` display: flex; flex-direction: column; label { font-weight: bold; margin-bottom: 5px; font-size: 0.9rem; } `;
const AutocompleteContainer = styled.div` position: relative; `;
const AutocompleteList = styled.div` position: absolute; width: 100%; background: #fff; border: 1px solid #ddd; z-index: 20; max-height: 150px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); `;
const AutocompleteOption = styled.div` padding: 10px; cursor: pointer; font-size: 0.9rem; &:hover { background: #f0f7ff; } &.danger { color: #dc3545; border-bottom: 1px solid #eee; } `;
const DynamicInputBox = styled.div` border: 1px solid #eee; padding: 15px; border-radius: 8px; .box-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 0.9rem; } `;
const DynamicInputRow = styled.div` display: flex; gap: 5px; margin-bottom: 10px; `;
const AddLinkBtn = styled.button` background: none; border: none; color: #007bff; cursor: pointer; font-weight: bold; font-size: 0.8rem; `;
const IconButton = styled.button` padding: 5px 10px; cursor: pointer; background: none; border: 1px solid transparent; &.danger { color: #dc3545; } `;

// --- REVISÃO DE ESTILO DOS CARDS DE VISUALIZAÇÃO ---
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

  h4 { 
    margin: 0 0 15px 0; 
    color: #4a5568; 
    font-size: 0.95rem; 
    display: flex;
    align-items: center;
    gap: 8px;
  }

  ul { 
    list-style: none; 
    padding: 0; 
    margin: 0; 
  }

  .email-item {
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 6px;
    background: #f8fafc;
    border: 1px solid #edf2f7;
    font-size: 0.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &.error {
      background: #fff5f5; /* Vermelho clarinho */
      border-color: #fed7d7;
      color: #c53030;
      font-weight: 500;
    }
  }

  .icon-err { color: #e53e3e; font-size: 0.8rem; }

  .phones-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .phone-pill {
    background: #f0fff4;
    border: 1px solid #c6f6d5;
    color: #2f855a;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
  }
`;

const FunnelHistoryCard = styled.div` 
  margin-top: 25px; 
  border: 1px solid #edf2f7; 
  padding: 20px; 
  border-radius: 12px; 
  background: #fff;
  h4 { margin: 0 0 15px 0; font-size: 1rem; color: #2d3748; }
`;

const HistoryRow = styled.div` 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 15px; 
  border-left: 4px solid ${props => props.$borderColor}; 
  background: #f8fafc; 
  margin-bottom: 12px; 
  border-radius: 0 8px 8px 0;
  cursor: pointer; 
  transition: 0.2s;
  &:hover { transform: translateX(5px); background: #f1f5f9; }
  .op-title { font-weight: bold; color: #2d3748; margin-bottom: 4px; }
  .status-tag { font-size: 0.7rem; background: #e2e8f0; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
  .op-meta { font-size: 0.8rem; color: #718096; }
`;