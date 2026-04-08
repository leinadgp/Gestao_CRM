// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function Dashboard() {
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  
  const [todosModulos, setTodosModulos] = useState([]);
  
  // Engajamento
  const [sequenciaEmails, setSequenciaEmails] = useState([]);
  const [relatorioCliques, setRelatorioCliques] = useState([]);
  const [inscritos, setInscritos] = useState([]);
  
  // Modal de Cliques
  const [mostrarModalCliques, setMostrarModalCliques] = useState(false);
  const [carregandoCliquesModal, setCarregandoCliquesModal] = useState(false);
  const [emailSelecionado, setEmailSelecionado] = useState(null);
  const [dadosCliquesModal, setDadosCliquesModal] = useState([]);
  
  const [carregando, setCarregando] = useState(true);
  
  // Filtros
  const [filtroCampanha, setFiltroCampanha] = useState('');
  const [dropdownCampanhaAberto, setDropdownCampanhaAberto] = useState(false);
  const dropdownRef = useRef(null);

  const dataAtual = new Date();
  const mesAtualString = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const [mesFiltro, setMesFiltro] = useState(mesAtualString); 

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // Fecha o dropdown se clicar fora dele
  useEffect(() => {
    function handleClickFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownCampanhaAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  useEffect(() => {
    async function carregarDadosBase() {
      setCarregando(true);
      try {
        const [resOps, resCamp, resInscritos] = await Promise.all([
          axios.get(`${API_URL}/oportunidades`, getHeaders()),
          axios.get(`${API_URL}/campanhas`, getHeaders()),
          axios.get(`${API_URL}/dashboard/inscritos`, getHeaders())
        ]);
        
        setOportunidades(resOps.data);
        setCampanhas(resCamp.data);
        setInscritos(resInscritos.data);

        const promessasModulos = resCamp.data.map(c => axios.get(`${API_URL}/campanhas/${c.id}/modulos`, getHeaders()));
        const respostasModulos = await Promise.all(promessasModulos);
        const modulosGlobais = respostasModulos.flatMap(r => r.data);
        setTodosModulos(modulosGlobais);

      } catch (erro) {
        console.error('Erro ao carregar base do dashboard', erro);
      } finally {
        setCarregando(false);
      }
    }
    carregarDadosBase();
  }, []);

  useEffect(() => {
    async function buscarDadosExtrasDaCampanha() {
      if (filtroCampanha) {
        try {
          const [resCliques, resSeq] = await Promise.all([
            axios.get(`${API_URL}/campanhas/${filtroCampanha}/relatorio-cliques`, getHeaders()),
            axios.get(`${API_URL}/sequencia-emails/${filtroCampanha}`, getHeaders())
          ]);
          setRelatorioCliques(resCliques.data);
          setSequenciaEmails(resSeq.data);
        } catch (erro) {
          console.error(erro);
        }
      } else {
        setRelatorioCliques([]);
        setSequenciaEmails([]);
      }
    }
    buscarDadosExtrasDaCampanha();
  }, [filtroCampanha, todosModulos]);

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarData(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR');
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleString('pt-BR');
  }

  function formatarMesApresentacao(yyyyMM) {
    if(!yyyyMM) return 'Todos os Meses';
    const [ano, mes] = yyyyMM.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes)-1]}/${ano}`;
  }

  async function abrirModalCliquesDetalhado(email) {
    setEmailSelecionado(email);
    setMostrarModalCliques(true);
    setCarregandoCliquesModal(true);
    try {
      const res = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/funil/${email.tipo_funil}/etapa/${email.ordem_etapa}/cliques`, getHeaders());
      // Filtra tirando o clique fantasma do bot
      const cliquesReais = res.data.filter(c => c.link_descricao && c.link_descricao.toLowerCase() !== 'bot');
      setDadosCliquesModal(cliquesReais);
    } catch (error) {
      alert("Erro ao buscar detalhes de cliques.");
    } finally {
      setCarregandoCliquesModal(false);
    }
  }

  const statusSucesso = ['ganho', 'inscricao'];
  const statusPerdido = ['perdido', 'naofunciona', 'naoatendeu'];
  const statusAndamento = ['aberto', 'tarefa', 'avaliar', 'interessada'];

  const opsGeraisFiltradas = oportunidades.filter(op => {
    return filtroCampanha ? op.campanha_id === parseInt(filtroCampanha) : true;
  });

  let vendasFracionadas = [];
  opsGeraisFiltradas.forEach(op => {
    if (!statusSucesso.includes(op.status)) return; 
    let idsMods = [];
    try { idsMods = typeof op.modulos_ids === 'string' ? JSON.parse(op.modulos_ids) : (op.modulos_ids || []); } catch(e){}

    if (idsMods.length > 0) {
      const valorPorModulo = Number(op.valor) / idsMods.length;
      idsMods.forEach(idMod => {
        const infoMod = todosModulos.find(m => m.id === idMod);
        const dataCompetencia = infoMod?.data_evento || infoMod?.data_inicio_vendas || op.atualizado_em || op.criado_em;
        vendasFracionadas.push({ ...op, valorContabil: valorPorModulo, dataCompetencia: dataCompetencia, modulo_id_fracionado: idMod });
      });
    } else {
      vendasFracionadas.push({ ...op, valorContabil: Number(op.valor), dataCompetencia: op.atualizado_em || op.criado_em, modulo_id_fracionado: null });
    }
  });

  const vendasNoMes = vendasFracionadas.filter(venda => {
    if (!mesFiltro) return true;
    const mesAnoVenda = venda.dataCompetencia ? venda.dataCompetencia.substring(0, 7) : '';
    return mesAnoVenda === mesFiltro;
  });

  let totalGanho = 0;
  let qtdGanhaCompetencia = vendasNoMes.length;
  vendasNoMes.forEach(v => { totalGanho += v.valorContabil; });

  let totalAberto = 0, qtdAberto = 0;
  let totalPerdido = 0, qtdPerdido = 0;

  opsGeraisFiltradas.forEach(op => {
    let passaMes = true;
    if (mesFiltro) {
      const dataOp = op.atualizado_em || op.criado_em;
      passaMes = dataOp ? dataOp.substring(0, 7) === mesFiltro : false;
    }
    if (passaMes) {
      if (statusAndamento.includes(op.status)) { totalAberto += Number(op.valor) || 0; qtdAberto++; } 
      else if (statusPerdido.includes(op.status)) { totalPerdido += Number(op.valor) || 0; qtdPerdido++; }
    }
  });

  const ticketMedio = qtdGanhaCompetencia > 0 ? (totalGanho / qtdGanhaCompetencia) : 0;

  const dadosPizza = [
    { name: 'Sucesso (Ganhas)', value: qtdGanhaCompetencia, color: '#28a745' },
    { name: 'Perdidos (Descarte)', value: qtdPerdido, color: '#dc3545' },
    { name: 'Pipeline (Andamento)', value: qtdAberto, color: '#007bff' }
  ].filter(d => d.value > 0); 

  const rankingVendedores = {};
  vendasNoMes.forEach(v => {
    let nomeVendedor = v.vendedor_nome || 'Não Atribuído';
    if (v.origem_venda === 'landing_page') nomeVendedor = 'Automático (Landing Page)';
    if (!rankingVendedores[nomeVendedor]) rankingVendedores[nomeVendedor] = { nome: nomeVendedor, total: 0, quantidade: 0 };
    rankingVendedores[nomeVendedor].total += v.valorContabil;
    rankingVendedores[nomeVendedor].quantidade += 1;
  });
  const dadosEquipe = Object.values(rankingVendedores).sort((a, b) => b.total - a.total);

  const ultimasVendas = opsGeraisFiltradas
    .filter(op => statusSucesso.includes(op.status))
    .sort((a, b) => new Date(b.atualizado_em || b.criado_em) - new Date(a.atualizado_em || a.criado_em))
    .slice(0, 5);

  const listaInscritosFiltrada = inscritos.filter(inscrito => {
    let passaCampanha = true;
    if (filtroCampanha) {
      const campSelecionada = campanhas.find(c => c.id === parseInt(filtroCampanha));
      if (campSelecionada && inscrito.curso_nome !== campSelecionada.nome) passaCampanha = false;
    }
    let passaMes = true;
    if (mesFiltro) {
      const dataInsc = inscrito.data_inscricao ? inscrito.data_inscricao.substring(0, 7) : '';
      if (dataInsc !== mesFiltro) passaMes = false;
    }
    return passaCampanha && passaMes;
  });

  // Agrupando cliques para o Modal
  const cliquesAgrupadosModal = Object.values((dadosCliquesModal || []).reduce((acc, clique) => {
    const chave = clique.contato_id;
    if (!acc[chave]) {
      let emailEx = 'Sem e-mail';
      try { const eArr = JSON.parse(clique.emails_json); if(eArr.length) emailEx = eArr[0]; } catch(e){}
      acc[chave] = { nome: clique.contato_nome, email: emailEx, interacoes: [] };
    }
    acc[chave].interacoes.push(clique);
    return acc;
  }, {}));

  // Separando Sequencia de Emails por Funil
  const seqFrios = sequenciaEmails.filter(e => e.tipo_funil === 'BROADCAST_FRIO');
  const seqQuentes = sequenciaEmails.filter(e => e.tipo_funil === 'BROADCAST_QUENTE');
  const seqPosClique = sequenciaEmails.filter(e => e.tipo_funil === 'POS_CLIQUE');

  function getCliquesDoEmail(email) {
    const rel = relatorioCliques.find(r => r.tipo_funil === email.tipo_funil && Number(r.etapa_email) === Number(email.ordem_etapa));
    return rel ? parseInt(rel.total_cliques) : 0;
  }

  const campanhaSelecionada = campanhas.find(c => c.id === parseInt(filtroCampanha));

  return (
    <>
      <Header titulo="Inteligência de Vendas" />

      <PageContainer>
        
        <TopSection>
          <div>
            <Title>Dashboard Estratégico</Title>
            <Subtitle>Análise financeira e engajamento da automação.</Subtitle>
          </div>

          <FiltersContainer>
            
            {/* BOTÃO MODERNO DE MÊS */}
            <FilterPillWrapper>
              <FilterButton $hasValue={!!mesFiltro}>
                <i className="fa-regular fa-calendar-days icon"></i> 
                <span>Competência: <strong>{formatarMesApresentacao(mesFiltro)}</strong></span>
                <i className="fa-solid fa-chevron-down arrow"></i>
              </FilterButton>
              <HiddenMonthInput 
                type="month" 
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
              />
              {mesFiltro && (
                <ClearFilterBtn onClick={(e) => { e.preventDefault(); setMesFiltro(''); }} title="Remover filtro de mês">
                  <i className="fa-solid fa-times-circle"></i>
                </ClearFilterBtn>
              )}
            </FilterPillWrapper>

            {/* BOTÃO MODERNO DE CAMPANHA (DROPDOWN CUSTOMIZADO) */}
            <FilterPillWrapper ref={dropdownRef}>
              <FilterButton 
                $hasValue={!!filtroCampanha} 
                onClick={() => setDropdownCampanhaAberto(!dropdownCampanhaAberto)}
              >
                <i className="fa-solid fa-filter icon"></i> 
                <span>Curso: <strong>{campanhaSelecionada ? campanhaSelecionada.nome : 'Visão Macro (Todos)'}</strong></span>
                <i className={`fa-solid fa-chevron-${dropdownCampanhaAberto ? 'up' : 'down'} arrow`}></i>
              </FilterButton>
              
              {dropdownCampanhaAberto && (
                <CustomDropdownMenu>
                  <CustomDropdownItem 
                    $active={filtroCampanha === ''} 
                    onClick={() => { setFiltroCampanha(''); setDropdownCampanhaAberto(false); }}
                  >
                    Visão Macro (Todos os Cursos)
                  </CustomDropdownItem>
                  {campanhas.map(c => (
                    <CustomDropdownItem 
                      key={c.id} 
                      $active={filtroCampanha === String(c.id)} 
                      onClick={() => { setFiltroCampanha(String(c.id)); setDropdownCampanhaAberto(false); }}
                    >
                      {c.nome}
                    </CustomDropdownItem>
                  ))}
                </CustomDropdownMenu>
              )}
            </FilterPillWrapper>

          </FiltersContainer>
        </TopSection>

        {carregando ? (
          <LoadingContainer>
            <i className="fa-solid fa-spinner fa-spin"></i><br/>Calculando relatórios...
          </LoadingContainer>
        ) : (
          <>
            <KpiGrid>
              <KpiCard $borderColor="#007bff">
                <div className="kpi-header">
                  <span className="kpi-label">VALOR NEGOCIANDO</span>
                  <i className="fa-solid fa-chart-line" style={{ color: '#007bff' }}></i>
                </div>
                <div className="kpi-value">{formatarMoeda(totalAberto)}</div>
                <div className="kpi-subtitle" style={{ color: '#007bff' }}>{qtdAberto} negócios em aberto</div>
              </KpiCard>

              <KpiCard $borderColor="#28a745" $bgColor="#f4fbf5">
                <div className="kpi-header">
                  <span className="kpi-label">RECEITA FRACIONADA</span>
                  <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#28a745' }}></i>
                </div>
                <div className="kpi-value">{formatarMoeda(totalGanho)}</div>
                <div className="kpi-subtitle" style={{ color: '#28a745' }}>{qtdGanhaCompetencia} inscrições no mês</div>
              </KpiCard>

              <KpiCard $borderColor="#17a2b8">
                <div className="kpi-header">
                  <span className="kpi-label">TICKET POR MÓDULO</span>
                  <i className="fa-solid fa-ticket" style={{ color: '#17a2b8' }}></i>
                </div>
                <div className="kpi-value">{formatarMoeda(ticketMedio)}</div>
                <div className="kpi-subtitle" style={{ color: '#17a2b8' }}>Média de valor por inscrição</div>
              </KpiCard>

              <KpiCard $borderColor="#dc3545">
                <div className="kpi-header">
                  <span className="kpi-label">VALOR PERDIDO</span>
                  <i className="fa-solid fa-circle-xmark" style={{ color: '#dc3545' }}></i>
                </div>
                <div className="kpi-value">{formatarMoeda(totalPerdido)}</div>
                <div className="kpi-subtitle" style={{ color: '#dc3545' }}>{qtdPerdido} negócios descartados</div>
              </KpiCard>
            </KpiGrid>

            {/* SEÇÃO NOVA DE ENGAJAMENTO (SOMENTE SE TIVER CAMPANHA SELECIONADA) */}
            {filtroCampanha && sequenciaEmails.length > 0 && (
              <Panel $borderLeft="#6f42c1">
                <PanelTitle><i className="fa-solid fa-envelope-open-text text-purple"></i> Funil de Engajamento de E-mails</PanelTitle>
                <PanelSubtitle>Acompanhe os cliques de cada e-mail cadastrado nesta campanha.</PanelSubtitle>
                
                <EngagementListsContainer>
                  
                  {seqFrios.length > 0 && (
                    <EngagementColumn>
                      <h5 className="col-title text-blue"><i className="fa-solid fa-snowflake"></i> Broadcast Frios</h5>
                      {seqFrios.map(email => (
                        <EmailRow key={email.id} onClick={() => abrirModalCliquesDetalhado(email)}>
                          <div className="email-info">
                            <span className="badge-step">Etapa {email.ordem_etapa}</span>
                            <span className="email-name">{email.titulo_email}</span>
                          </div>
                          <div className="clicks-badge">
                            {getCliquesDoEmail(email)} cliques <i className="fa-solid fa-chevron-right"></i>
                          </div>
                        </EmailRow>
                      ))}
                    </EngagementColumn>
                  )}

                  {seqQuentes.length > 0 && (
                    <EngagementColumn>
                      <h5 className="col-title text-red"><i className="fa-solid fa-fire"></i> Broadcast Quentes</h5>
                      {seqQuentes.map(email => (
                        <EmailRow key={email.id} onClick={() => abrirModalCliquesDetalhado(email)}>
                          <div className="email-info">
                            <span className="badge-step">Etapa {email.ordem_etapa}</span>
                            <span className="email-name">{email.titulo_email}</span>
                          </div>
                          <div className="clicks-badge">
                            {getCliquesDoEmail(email)} cliques <i className="fa-solid fa-chevron-right"></i>
                          </div>
                        </EmailRow>
                      ))}
                    </EngagementColumn>
                  )}

                  {seqPosClique.length > 0 && (
                    <EngagementColumn>
                      <h5 className="col-title text-orange"><i className="fa-solid fa-bolt"></i> Pós-Clique</h5>
                      {seqPosClique.map(email => (
                        <EmailRow key={email.id} onClick={() => abrirModalCliquesDetalhado(email)}>
                          <div className="email-info">
                            <span className="badge-step">Etapa {email.ordem_etapa}</span>
                            <span className="email-name">{email.titulo_email}</span>
                          </div>
                          <div className="clicks-badge">
                            {getCliquesDoEmail(email)} cliques <i className="fa-solid fa-chevron-right"></i>
                          </div>
                        </EmailRow>
                      ))}
                    </EngagementColumn>
                  )}

                </EngagementListsContainer>
              </Panel>
            )}

            <DashboardGrid>
              <Panel $borderTop="#17a2b8">
                <PanelTitle className="text-center">Efetividade Geral</PanelTitle>
                <PanelSubtitle className="text-center">Comparativo do período filtrado.</PanelSubtitle>
                <ChartContainer>
                  {dadosPizza.length === 0 ? (
                     <EmptyChartMsg>Nenhum dado para analisar.</EmptyChartMsg>
                  ) : (
                    <>
                      <ResponsiveContainer minHeight={1}>
                        <PieChart>
                          <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                            {dadosPizza.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <LegendContainer>
                        {dadosPizza.map(d => (
                          <LegendItem key={d.name}>
                            <div className="color-box" style={{ background: d.color }}></div>
                            {d.name} ({d.value})
                          </LegendItem>
                        ))}
                      </LegendContainer>
                    </>
                  )}
                </ChartContainer>
              </Panel>

              <Panel>
                <PanelTitle><i className="fa-solid fa-medal text-blue"></i> Ranking de Vendas (Rateadas)</PanelTitle>
                <TableContainer>
                  <Table>
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th className="text-center">Inscrições</th>
                        <th className="text-right">Receita Gerada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosEquipe.length === 0 ? (
                        <tr><td colSpan="3" className="text-center text-muted">Nenhuma venda para este mês.</td></tr>
                      ) : (
                        dadosEquipe.map((v, index) => (
                          <tr key={index}>
                            <td>
                              <strong>
                                {index === 0 && <i className="fa-solid fa-crown text-yellow"></i>} {v.nome}
                              </strong>
                            </td>
                            <td className="text-center">
                              <Badge className="badge-gray">{v.quantidade}</Badge>
                            </td>
                            <td className="text-right text-green font-bold">
                              {formatarMoeda(v.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </TableContainer>
              </Panel>
            </DashboardGrid>

            <DashboardGrid>
              <Panel>
                <PanelTitle><i className="fa-solid fa-handshake text-green"></i> Últimos Negócios Fechados</PanelTitle>
                <TableContainer>
                  <Table>
                    <thead>
                      <tr>
                        <th>Negociação</th>
                        <th>Origem/Vendedor</th>
                        <th className="text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimasVendas.length === 0 ? (
                        <tr><td colSpan="3" className="text-center text-muted">Nenhuma venda concluída no período.</td></tr>
                      ) : (
                        ultimasVendas.map(op => (
                          <tr key={op.id}>
                            <td>
                              <strong>{op.titulo}</strong>
                              <div className="date-subtext">{formatarData(op.atualizado_em || op.criado_em)}</div>
                            </td>
                            <td>
                              <Badge className="badge-blue">
                                {op.origem_venda === 'landing_page' ? '🤖 Landing Page' : (op.vendedor_nome || 'Equipe')}
                              </Badge>
                            </td>
                            <td className="text-right text-green font-bold large-text">
                              {formatarMoeda(op.valor)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </TableContainer>
              </Panel>

              <Panel $borderTop="#28a745">
                <PanelTitle><i className="fa-solid fa-users-viewfinder text-green"></i> Lista Nominal de Inscritos (Convertidos)</PanelTitle>
                <TableContainer $maxHeight="500px">
                  <Table>
                    <thead className="sticky-head">
                      <tr>
                        <th>Lead (Contato)</th>
                        <th>Curso Base</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaInscritosFiltrada.length === 0 ? (
                        <tr><td colSpan="3" className="text-center text-muted">Nenhuma inscrição encontrada para este período/curso.</td></tr>
                      ) : (
                        listaInscritosFiltrada.map(ins => {
                          let emailDisplay = "Sem E-mail";
                          try {
                            const emails = typeof ins.emails_json === 'string' ? JSON.parse(ins.emails_json) : ins.emails_json;
                            if (emails && emails.length > 0) emailDisplay = emails[0];
                          } catch(e) {}
                          
                          let fonesDisplay = "Sem Telefone";
                          try {
                            const fones = typeof ins.telefones_json === 'string' ? JSON.parse(ins.telefones_json) : ins.telefones_json;
                            if (fones && fones.length > 0) fonesDisplay = fones[0];
                          } catch(e) {}

                          return (
                            <tr key={ins.oportunidade_id}>
                              <td>
                                <strong>{ins.contato_nome}</strong>
                                <div className="contact-subtext"><i className="fa-solid fa-envelope"></i> {emailDisplay}</div>
                                <div className="contact-subtext"><i className="fa-solid fa-phone"></i> {fonesDisplay}</div>
                              </td>
                              <td className="text-blue font-bold">
                                {ins.curso_nome}
                              </td>
                              <td className="date-text">
                                {formatarData(ins.data_inscricao)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </TableContainer>
              </Panel>
            </DashboardGrid>
          </>
        )}

        {/* MODAL DE CLIQUES DETALHADOS */}
        {mostrarModalCliques && (
          <ModalOverlay onClick={() => setMostrarModalCliques(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <div>
                  <h3 className="text-blue"><i className="fa-solid fa-mouse-pointer"></i> Relatório de Cliques</h3>
                  <div className="subtitle">{emailSelecionado?.titulo_email} (Etapa {emailSelecionado?.ordem_etapa})</div>
                </div>
                <CloseButton onClick={() => setMostrarModalCliques(false)}>&times;</CloseButton>
              </ModalHeader>
              
              <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                {carregandoCliquesModal ? (
                  <LoadingContainer>
                    <i className="fa-solid fa-spinner fa-spin"></i><br/>Buscando detalhes...
                  </LoadingContainer>
                ) : cliquesAgrupadosModal.length === 0 ? (
                  <EmptyChartMsg>Nenhum clique registrado para este e-mail.</EmptyChartMsg>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <th>Contato (Lead)</th>
                        <th>Links Clicados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cliquesAgrupadosModal.map(lead => (
                        <tr key={lead.nome + lead.email}>
                          <td style={{ verticalAlign: 'top' }}>
                            <strong>{lead.nome}</strong>
                            <div className="contact-subtext">{lead.email}</div>
                          </td>
                          <td>
                            {lead.interacoes.map((int, i) => (
                              <ClickBadge key={i}>
                                <span className="link-name">{int.link_descricao}</span>
                                <span className="link-time">{formatarDataHora(int.criado_em)}</span>
                              </ClickBadge>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
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
  padding: 30px;
  background-color: #f4f7f6;
  min-height: calc(100vh - 70px);
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 25px;
`;

const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;

const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

/* === ÁREA DE FILTROS MODERNOS === */
const FiltersContainer = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const FilterPillWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  background: ${props => props.$hasValue ? '#eef4fa' : '#ffffff'};
  border: 1px solid ${props => props.$hasValue ? '#b8cde1' : '#cbd5e1'};
  color: #2c3e50;
  padding: 10px 18px;
  border-radius: 50px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);

  &:hover {
    background: #e7f3ff;
    border-color: #007bff;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,123,255,0.1);
  }

  span {
    margin: 0 10px;
    strong { color: #007bff; }
  }

  .icon { color: #6c757d; font-size: 1.05rem; }
  .arrow { color: #007bff; font-size: 0.8rem; }
`;

const HiddenMonthInput = styled.input`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  opacity: 0;
  cursor: pointer;
  
  /* Corrige o cursor no Windows */
  &::-webkit-calendar-picker-indicator {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; height: 100%; cursor: pointer; opacity: 0;
  }
`;

const ClearFilterBtn = styled.button`
  position: absolute;
  right: -8px;
  top: -8px;
  background: #ffffff;
  color: #dc3545;
  border: 1px solid #f5c6cb;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s;

  &:hover { background: #dc3545; color: #fff; transform: scale(1.1); }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #ffffff;
  border: 1px solid #edf2f9;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  min-width: 250px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  padding: 8px 0;
  list-style: none;
  margin: 0;
  animation: fadeInDown 0.2s ease-out;

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const CustomDropdownItem = styled.li`
  padding: 12px 20px;
  font-size: 0.95rem;
  color: ${props => props.$active ? '#007bff' : '#495057'};
  background: ${props => props.$active ? '#f0f7ff' : 'transparent'};
  font-weight: ${props => props.$active ? '700' : '500'};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f8fafc;
    color: #007bff;
  }
`;

const LoadingContainer = styled.div`
  text-align: center; padding: 60px; color: #6c757d; font-size: 1.1rem;
  i { font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1; }
`;

// --- KPIS ---
const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const KpiCard = styled.div`
  background: ${props => props.$bgColor || '#ffffff'};
  border-left: 5px solid ${props => props.$borderColor || '#ccc'};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  display: flex; flex-direction: column; justify-content: center;
  transition: transform 0.2s;

  &:hover { transform: translateY(-4px); }

  .kpi-header { display: flex; justify-content: space-between; align-items: center; }
  .kpi-label { color: #64748b; font-size: 0.85rem; font-weight: 700; }
  .kpi-value { font-size: 1.8rem; font-weight: 800; color: #2c3e50; margin: 10px 0; }
  .kpi-subtitle { font-size: 0.85rem; font-weight: 600; }
`;

// --- PANELS & DASHBOARDS ---
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid #edf2f9;
  border-left: ${props => props.$borderLeft ? `5px solid ${props.$borderLeft}` : 'none'};
  border-top: ${props => props.$borderTop ? `5px solid ${props.$borderTop}` : 'none'};
  margin-bottom: 30px;
  overflow: hidden;
`;

const PanelTitle = styled.h4`
  margin: 0; padding: 20px 20px 5px 20px; color: #2c3e50; font-size: 1.1rem; font-weight: 700;
  display: flex; align-items: center; gap: 10px;
  &.text-center { justify-content: center; }
  
  .text-blue { color: #007bff; }
  .text-green { color: #28a745; }
  .text-purple { color: #6f42c1; }
`;

const PanelSubtitle = styled.p`
  margin: 0; padding: 0 20px 15px 20px; color: #6c757d; font-size: 0.85rem; border-bottom: 1px solid #edf2f9;
  &.text-center { text-align: center; }
`;

// --- ENGAJAMENTO DE E-MAILS (NOVO VISUAL) ---
const EngagementListsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  background: #fbfbfc;
`;

const EngagementColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  .col-title {
    margin: 0 0 10px 0;
    font-size: 0.95rem;
    font-weight: 700;
    display: flex; align-items: center; gap: 6px;
    &.text-blue { color: #007bff; }
    &.text-red { color: #dc3545; }
    &.text-orange { color: #fd7e14; }
  }
`;

const EmailRow = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);

  &:hover {
    border-color: #007bff;
    box-shadow: 0 4px 10px rgba(0,123,255,0.1);
    transform: translateX(4px);
  }

  .email-info {
    display: flex; flex-direction: column; gap: 4px;
    .badge-step { font-size: 0.7rem; background: #eef4fa; color: #1F4E79; padding: 2px 6px; border-radius: 4px; width: max-content; font-weight: 700;}
    .email-name { font-size: 0.9rem; font-weight: 600; color: #333; }
  }

  .clicks-badge {
    background: #f0f7ff; color: #007bff; font-weight: 700; font-size: 0.85rem; padding: 6px 12px; border-radius: 20px;
    display: flex; align-items: center; gap: 8px; border: 1px solid #cce5ff;
  }
`;

// --- MODAL ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
  z-index: 9999; backdrop-filter: blur(2px); padding: 20px;
`;

const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: 700px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #edf2f9; background: #fbfbfc; border-radius: 12px 12px 0 0;
  h3 { margin: 0; color: #2c3e50; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;}
  .subtitle { font-size: 0.85rem; color: #6c757d; margin-top: 4px; font-weight: 600;}
`;

const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; color: #a0aec0; cursor: pointer; transition: 0.2s;
  &:hover { color: #dc3545; }
`;

const ClickBadge = styled.div`
  display: inline-flex; align-items: center; background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin: 4px; gap: 8px;
  .link-name { font-size: 0.8rem; font-weight: 700; color: #007bff; }
  .link-time { font-size: 0.75rem; color: #888; }
`;

// --- CHARTS ---
const ChartContainer = styled.div`
  width: 100%; height: 280px; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center;
`;

const EmptyChartMsg = styled.div`
  height: 100%; display: flex; align-items: center; justify-content: center; color: #a0aec0; font-style: italic; text-align: center;
`;

const LegendContainer = styled.div`
  display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; margin-top: 10px;
`;
const LegendItem = styled.div`
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #495057; font-weight: 600;
  .color-box { width: 12px; height: 12px; border-radius: 3px; }
`;

// --- TABLES ---
const TableContainer = styled.div`
  padding: 0; overflow-x: auto; max-height: ${props => props.$maxHeight || 'auto'};
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse;

  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; }
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; color: #2c3e50; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background-color: #f8fafc; }
  
  .sticky-head th { position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
  
  .text-center { text-align: center; } .text-right { text-align: right; }
  .text-muted { color: #a0aec0; font-style: italic; }
  .text-blue { color: #007bff; } .text-green { color: #28a745; } .text-yellow { color: #f59e0b; margin-right: 6px; }
  .font-bold { font-weight: 700; } .large-text { font-size: 1.05rem; }
  
  .date-subtext { font-size: 0.8rem; color: #6c757d; margin-top: 3px; }
  .date-text { font-size: 0.9rem; color: #495057; }
  .contact-subtext { font-size: 0.8rem; color: #6c757d; margin-top: 3px; i { width: 14px; text-align: center; } }
`;

const Badge = styled.span`
  padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; display: inline-block;

  &.badge-gray { background: #f1f5f9; color: #475569; }
  &.badge-blue { background: #e7f3ff; color: #007bff; }
  &.badge-primary { background: #eef4fa; color: #1F4E79; }
  &.badge-success { background: #f4fbf5; color: #28a745; }
`;