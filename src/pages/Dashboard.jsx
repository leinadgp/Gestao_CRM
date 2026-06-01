import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { emailDoFunilDisparo, TIPOS_FUNIL_BROADCAST } from '../config/disparos.js';
import { InscritosOportunidadeEditor } from '../componentes/InscritosOportunidadeEditor.jsx';
import { exportarLinhasComoCsv, flattenExportInscritosDashboard } from '../utils/exportarCsv.js';
import { temPermissaoEspecial } from '../utils/permissoes.js';

// --- UTILITÁRIOS ---
const parseJSONSeguro = (dado, fallback = []) => {
  if (dado == null || dado === '') return fallback;
  if (Array.isArray(dado)) return dado;
  if (typeof dado === 'object') return fallback;
  if (typeof dado !== 'string') return fallback;
  try {
    let parsed = JSON.parse(dado);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export function Dashboard() {
  // --- ESTADOS: DADOS DA API ---
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [todosModulos, setTodosModulos] = useState([]);
  const [inscritos, setInscritos] = useState([]);
  
  // --- ESTADOS: ENGAJAMENTO ---
  const [sequenciaEmails, setSequenciaEmails] = useState([]);
  const [relatorioCliques, setRelatorioCliques] = useState([]);
  
  // --- ESTADOS: MODAL ---
  const [mostrarModalCliques, setMostrarModalCliques] = useState(false);
  const [carregandoCliquesModal, setCarregandoCliquesModal] = useState(false);
  const [emailSelecionado, setEmailSelecionado] = useState(null);
  const [dadosCliquesModal, setDadosCliquesModal] = useState([]);
  const [erroModal, setErroModal] = useState(null);
  const [inscritoDetalhe, setInscritoDetalhe] = useState(null);
  const [exportandoInscritos, setExportandoInscritos] = useState(false);
  const [excluindoInscricao, setExcluindoInscricao] = useState(false);
  const podeExcluirInscricao = temPermissaoEspecial('excluir_inscricao');
  
  // --- ESTADOS: CONTROLE DE TELA ---
  const [carregando, setCarregando] = useState(true);
  const [erroGlobal, setErroGlobal] = useState(null);
  
  // --- ESTADOS: FILTROS ---
  const [filtroCampanha, setFiltroCampanha] = useState('');
  const [dropdownCampanhaAberto, setDropdownCampanhaAberto] = useState(false);
  const dropdownRef = useRef(null);

  const dataAtual = new Date();
  const mesAtualString = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const [mesFiltro, setMesFiltro] = useState(mesAtualString); 

  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // --- EFEITOS ---
  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownCampanhaAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Carrega os dados Base
  useEffect(() => {
    async function carregarDadosBase() {
      setCarregando(true);
      setErroGlobal(null);
      try {
        const config = getHeaders();
        const [resOps, resCamp, resInscritos] = await Promise.all([
          axios.get(`${API_URL}/oportunidades`, config),
          axios.get(`${API_URL}/campanhas`, config),
          axios.get(`${API_URL}/dashboard/inscritos`, config)
        ]);
        
        setOportunidades(resOps.data);
        setCampanhas(resCamp.data);
        setInscritos(resInscritos.data);

        // Busca módulos das campanhas
        const promessasModulos = resCamp.data.map(c => axios.get(`${API_URL}/campanhas/${c.id}/modulos`, config));
        const respostasModulos = await Promise.all(promessasModulos);
        setTodosModulos(respostasModulos.flatMap(r => r.data));

      } catch (erro) {
        console.error('Erro ao carregar base do dashboard', erro);
        setErroGlobal('Não foi possível carregar os dados do dashboard.');
      } finally {
        setCarregando(false);
      }
    }
    carregarDadosBase();
  }, [API_URL]);

  // Carrega dados específicos da Campanha quando o filtro muda
  useEffect(() => {
    async function buscarDadosExtrasDaCampanha() {
      if (!filtroCampanha) {
        setRelatorioCliques([]);
        setSequenciaEmails([]);
        return;
      }
      
      try {
        const config = getHeaders();
        const [resCliques, resSeq] = await Promise.all([
          axios.get(`${API_URL}/campanhas/${filtroCampanha}/relatorio-cliques`, config),
          axios.get(`${API_URL}/sequencia-emails/${filtroCampanha}`, config)
        ]);
        setRelatorioCliques(resCliques.data);
        setSequenciaEmails(resSeq.data);
      } catch (erro) {
        console.error('Erro ao buscar dados extras da campanha', erro);
      }
    }
    buscarDadosExtrasDaCampanha();
  }, [filtroCampanha, API_URL]);


  // --- FUNÇÕES DE FORMATAÇÃO ---
  const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const formatarDataHora = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const formatarMesApresentacao = (yyyyMM) => {
    if(!yyyyMM) return 'Todos os Meses';
    const [ano, mes] = yyyyMM.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes)-1]}/${ano}`;
  };

  // --- AÇÕES DO MODAL ---
  async function abrirModalCliquesDetalhado(email) {
    setEmailSelecionado(email);
    setMostrarModalCliques(true);
    setCarregandoCliquesModal(true);
    setErroModal(null);
    try {
      const res = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/funil/${email.tipo_funil}/etapa/${email.ordem_etapa}/cliques`, getHeaders());
      const cliquesReais = res.data.filter(c => c.link_descricao && c.link_descricao.toLowerCase() !== 'bot');
      setDadosCliquesModal(cliquesReais);
    } catch (error) {
      console.error('Erro ao buscar detalhes de cliques.', error);
      setErroModal('Falha ao carregar detalhes dos cliques.');
      setDadosCliquesModal([]);
    } finally {
      setCarregandoCliquesModal(false);
    }
  }

  // ==========================================
  // MEMOIZAÇÕES DE ALTA PERFORMANCE
  // ==========================================
  
  const statusSucesso = useMemo(() => ['ganho', 'inscricao'], []);
  const statusPerdido = useMemo(() => ['perdido', 'naofunciona', 'naoatendeu'], []);
  const statusAndamento = useMemo(() => ['aberto', 'tarefa', 'avaliar', 'interessada', 'naofunciona', 'naoatendeu'], []);

  const obterDataCompetencia = (op, idMod) => {
    const infoMod = idMod ? todosModulos.find((m) => Number(m.id) === Number(idMod)) : null;
    return infoMod?.data_evento
      || infoMod?.data_evento_fim
      || infoMod?.data_inicio_vendas
      || op.atualizado_em
      || op.criado_em
      || null;
  };

  const campanhasAtivas = useMemo(() => campanhas.filter(c => !c.arquivada), [campanhas]);
  const campanhaIdsAtivas = useMemo(() => new Set(campanhasAtivas.map(c => c.id)), [campanhasAtivas]);

  const opsGeraisFiltradas = useMemo(() => {
    const base = oportunidades.filter(op => campanhaIdsAtivas.has(Number(op.campanha_id)));
    return filtroCampanha 
      ? base.filter(op => op.campanha_id === parseInt(filtroCampanha)) 
      : base;
  }, [oportunidades, filtroCampanha, campanhaIdsAtivas]);

  const opsPorCompetencia = useMemo(() => {
    const itens = [];
    opsGeraisFiltradas.forEach((op) => {
      const idsMods = parseJSONSeguro(op.modulos_ids, []);
      if (idsMods.length > 0) {
        const valorPorModulo = Number(op.valor) / idsMods.length;
        idsMods.forEach((idMod) => {
          itens.push({
            ...op,
            valorContabil: valorPorModulo,
            dataCompetencia: obterDataCompetencia(op, idMod),
            modulo_id_fracionado: idMod,
          });
        });
      } else {
        itens.push({
          ...op,
          valorContabil: Number(op.valor),
          dataCompetencia: obterDataCompetencia(op, null),
          modulo_id_fracionado: null,
        });
      }
    });
    return itens;
  }, [opsGeraisFiltradas, todosModulos]);

  const vendasNoMes = useMemo(() => {
    return opsPorCompetencia.filter((venda) => {
      if (!statusSucesso.includes(venda.status)) return false;
      if (!mesFiltro) return true;
      const mesAnoVenda = venda.dataCompetencia ? venda.dataCompetencia.substring(0, 7) : '';
      return mesAnoVenda === mesFiltro;
    });
  }, [opsPorCompetencia, statusSucesso, mesFiltro]);

  const kpis = useMemo(() => {
    let totalGanho = 0;
    vendasNoMes.forEach(v => { totalGanho += v.valorContabil; });

    let totalAberto = 0, qtdAberto = 0;
    let totalPerdido = 0, qtdPerdido = 0;

    opsPorCompetencia.forEach((op) => {
      if (mesFiltro) {
        const mesAno = op.dataCompetencia ? op.dataCompetencia.substring(0, 7) : '';
        if (mesAno !== mesFiltro) return;
      }
      if (statusAndamento.includes(op.status)) {
        totalAberto += Number(op.valorContabil) || 0;
        qtdAberto += 1;
      } else if (statusPerdido.includes(op.status)) {
        totalPerdido += Number(op.valorContabil) || 0;
        qtdPerdido += 1;
      }
    });

    return {
      totalGanho,
      qtdGanhaCompetencia: vendasNoMes.length,
      totalAberto,
      qtdAberto,
      totalPerdido,
      qtdPerdido,
      ticketMedio: vendasNoMes.length > 0 ? (totalGanho / vendasNoMes.length) : 0
    };
  }, [vendasNoMes, opsPorCompetencia, mesFiltro, statusAndamento, statusPerdido]);

  const dadosPizza = useMemo(() => {
    return [
      { name: 'Sucesso (Ganhas)', value: kpis.qtdGanhaCompetencia, color: '#28a745' },
      { name: 'Perdidos (Descarte)', value: kpis.qtdPerdido, color: '#dc3545' },
      { name: 'Pipeline (Andamento)', value: kpis.qtdAberto, color: '#007bff' }
    ].filter(d => d.value > 0);
  }, [kpis]);

  const dadosEquipe = useMemo(() => {
    const ranking = {};
    vendasNoMes.forEach(v => {
      let nomeVendedor = v.vendedor_nome || 'Não Atribuído';
      if (v.origem_venda === 'landing_page') nomeVendedor = 'Automático (Landing Page)';
      if (!ranking[nomeVendedor]) ranking[nomeVendedor] = { nome: nomeVendedor, total: 0, quantidade: 0 };
      
      ranking[nomeVendedor].total += v.valorContabil;
      ranking[nomeVendedor].quantidade += 1;
    });
    return Object.values(ranking).sort((a, b) => b.total - a.total);
  }, [vendasNoMes]);

  const ultimasVendas = useMemo(() => {
    return opsGeraisFiltradas
      .filter(op => statusSucesso.includes(op.status))
      .sort((a, b) => new Date(b.atualizado_em || b.criado_em) - new Date(a.atualizado_em || a.criado_em))
      .slice(0, 5);
  }, [opsGeraisFiltradas, statusSucesso]);

  const listaInscritosFiltrada = useMemo(() => {
    return inscritos.filter(inscrito => {
      let passaCampanha = true;
      if (filtroCampanha) {
        const campSelecionada = campanhas.find(c => c.id === parseInt(filtroCampanha));
        if (campSelecionada && inscrito.curso_nome !== campSelecionada.nome) passaCampanha = false;
      }
      let passaMes = true;
      if (mesFiltro) {
        const idsMods = parseJSONSeguro(inscrito.modulos_ids, []);
        const mesesCompetencia = idsMods
          .map((idMod) => {
            const infoMod = todosModulos.find((m) => Number(m.id) === Number(idMod));
            const dataCompetencia = infoMod?.data_evento || infoMod?.data_evento_fim || infoMod?.data_inicio_vendas || inscrito.data_inscricao;
            return dataCompetencia ? dataCompetencia.substring(0, 7) : '';
          })
          .filter(Boolean);
        if (!mesesCompetencia.length && inscrito.data_inscricao) {
          mesesCompetencia.push(inscrito.data_inscricao.substring(0, 7));
        }
        if (!mesesCompetencia.includes(mesFiltro)) passaMes = false;
      }
      return passaCampanha && passaMes;
    });
  }, [inscritos, filtroCampanha, campanhas, mesFiltro, todosModulos]);

  function recarregarInscritos() {
    const config = getHeaders();
    return axios.get(`${API_URL}/dashboard/inscritos`, config).then((res) => {
      setInscritos(res.data);
      return res.data;
    });
  }

  async function excluirInscricaoDashboard() {
    if (!inscritoDetalhe || !podeExcluirInscricao) return;
    const msg = `Remover a inscrição de "${inscritoDetalhe.contato_nome}"?\n\nA negociação voltará ao funil como "aberta" e os dados de inscritos serão limpos.`;
    if (!window.confirm(msg)) return;

    setExcluindoInscricao(true);
    try {
      await axios.delete(
        `${API_URL}/dashboard/inscritos/${inscritoDetalhe.oportunidade_id}`,
        getHeaders()
      );
      setInscritoDetalhe(null);
      await recarregarInscritos();
      alert('Inscrição removida com sucesso.');
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao excluir inscrição.');
    } finally {
      setExcluindoInscricao(false);
    }
  }

  function exportarInscritos() {
    setExportandoInscritos(true);
    try {
      const linhas = flattenExportInscritosDashboard(listaInscritosFiltrada, parseJSONSeguro);
      if (!exportarLinhasComoCsv(linhas, 'inscritos_dashboard')) {
        alert('Nenhum inscrito para exportar com os filtros atuais.');
      }
    } finally {
      setExportandoInscritos(false);
    }
  }

  const cliquesAgrupadosModal = useMemo(() => {
    return Object.values((dadosCliquesModal || []).reduce((acc, clique) => {
      const chave = clique.contato_id;
      if (!acc[chave]) {
        let emailEx = 'Sem e-mail';
        const eArr = parseJSONSeguro(clique.emails_json, []);
        if (eArr.length) emailEx = eArr[0];
        
        acc[chave] = { nome: clique.contato_nome, email: emailEx, interacoes: [] };
      }
      acc[chave].interacoes.push(clique);
      return acc;
    }, {}));
  }, [dadosCliquesModal]);

  const emailsEngajamento = useMemo(
    () => sequenciaEmails.filter(emailDoFunilDisparo),
    [sequenciaEmails]
  );

  function getCliquesDoEmail(email) {
    const etapa = Number(email.ordem_etapa);
    const rels = relatorioCliques.filter((r) => Number(r.etapa_email) === etapa);
    if (!rels.length) return 0;
    const tipos = TIPOS_FUNIL_BROADCAST.includes(email.tipo_funil)
      ? TIPOS_FUNIL_BROADCAST
      : [email.tipo_funil];
    const match = rels.find((r) => tipos.includes(r.tipo_funil));
    if (match) return parseInt(match.total_cliques, 10) || 0;
    return rels.reduce((acc, r) => acc + (parseInt(r.total_cliques, 10) || 0), 0);
  }

  const campanhaSelecionada = campanhasAtivas.find(c => c.id === parseInt(filtroCampanha));

  // --- RENDERIZAÇÃO ---
  if (erroGlobal) {
    return (
      <PageContainer>
        <ErrorMessage>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <p>{erroGlobal}</p>
          <button onClick={() => window.location.reload()}>Recarregar Página</button>
        </ErrorMessage>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TopSection>
        <div>
          <Title>Dashboard Estratégico</Title>
          <Subtitle>Análise financeira e engajamento da automação.</Subtitle>
        </div>

        <FiltersContainer>
          {/* BOTÃO MÊS */}
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
            
          </FilterPillWrapper>

          {/* BOTÃO CAMPANHA */}
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
                {campanhasAtivas.map(c => (
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
              <div className="kpi-value">{formatarMoeda(kpis.totalAberto)}</div>
              <div className="kpi-subtitle" style={{ color: '#007bff' }}>{kpis.qtdAberto} negócios em aberto</div>
            </KpiCard>

            <KpiCard $borderColor="#28a745" $bgColor="#f4fbf5">
              <div className="kpi-header">
                <span className="kpi-label">RECEITA FRACIONADA</span>
                <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#28a745' }}></i>
              </div>
              <div className="kpi-value">{formatarMoeda(kpis.totalGanho)}</div>
              <div className="kpi-subtitle" style={{ color: '#28a745' }}>{kpis.qtdGanhaCompetencia} inscrições no mês</div>
            </KpiCard>

            <KpiCard $borderColor="#17a2b8">
              <div className="kpi-header">
                <span className="kpi-label">TICKET POR MÓDULO</span>
                <i className="fa-solid fa-ticket" style={{ color: '#17a2b8' }}></i>
              </div>
              <div className="kpi-value">{formatarMoeda(kpis.ticketMedio)}</div>
              <div className="kpi-subtitle" style={{ color: '#17a2b8' }}>Média de valor por inscrição</div>
            </KpiCard>

            <KpiCard $borderColor="#dc3545">
              <div className="kpi-header">
                <span className="kpi-label">VALOR PERDIDO</span>
                <i className="fa-solid fa-circle-xmark" style={{ color: '#dc3545' }}></i>
              </div>
              <div className="kpi-value">{formatarMoeda(kpis.totalPerdido)}</div>
              <div className="kpi-subtitle" style={{ color: '#dc3545' }}>{kpis.qtdPerdido} negócios descartados</div>
            </KpiCard>
          </KpiGrid>

          {/* ENGAJAMENTO DE E-MAILS */}
          {filtroCampanha && emailsEngajamento.length > 0 && (
            <Panel $borderLeft="#6f42c1">
              <PanelTitle><i className="fa-solid fa-envelope-open-text text-purple"></i> Funil de Engajamento de E-mails</PanelTitle>
              <PanelSubtitle>Sequência única de disparos — cliques por etapa.</PanelSubtitle>

              <EngagementListsContainer>
                <EngagementColumn>
                  <h5 className="col-title text-blue"><i className="fa-solid fa-envelope"></i> Sequência da campanha</h5>
                  {emailsEngajamento.map((email) => (
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
              <TabelaResponsiva>
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
                          <td data-label="Vendedor">
                            <strong>
                              {index === 0 && <i className="fa-solid fa-crown text-yellow"></i>} {v.nome}
                            </strong>
                          </td>
                          <td data-label="Inscrições" className="text-center">
                            <Badge className="badge-gray">{v.quantidade}</Badge>
                          </td>
                          <td data-label="Receita Gerada" className="text-right text-green font-bold">
                            {formatarMoeda(v.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TabelaResponsiva>
            </Panel>
          </DashboardGrid>

          <DashboardGrid>
            <Panel>
              <PanelTitle><i className="fa-solid fa-handshake text-green"></i> Últimos Negócios Fechados</PanelTitle>
              <TabelaResponsiva>
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
                          <td data-label="Negociação">
                            <strong>{op.titulo}</strong>
                            <div className="date-subtext">{formatarData(op.atualizado_em || op.criado_em)}</div>
                          </td>
                          <td data-label="Vendedor">
                            <Badge className="badge-blue">
                              {op.origem_venda === 'landing_page' ? '🤖 Landing Page' : (op.vendedor_nome || 'Equipe')}
                            </Badge>
                          </td>
                          <td data-label="Valor" className="text-right text-green font-bold large-text">
                            {formatarMoeda(op.valor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TabelaResponsiva>
            </Panel>

            <Panel $borderTop="#28a745" $fullWidth>
              <PanelHeaderRow>
                <PanelTitle style={{ paddingBottom: 0 }}>
                  <i className="fa-solid fa-users-viewfinder text-green"></i> Lista Nominal de Inscritos
                </PanelTitle>
                <BtnExportarInscritos
                  type="button"
                  disabled={exportandoInscritos || listaInscritosFiltrada.length === 0}
                  onClick={exportarInscritos}
                >
                  {exportandoInscritos ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <i className="fa-solid fa-file-csv" />
                  )}
                  Exportar inscritos
                </BtnExportarInscritos>
              </PanelHeaderRow>
              <PanelSubtitle style={{ paddingTop: 0, paddingLeft: 20 }}>
                Clique em uma linha para ver e editar os dados completos.
              </PanelSubtitle>

              {listaInscritosFiltrada.length === 0 ? (
                <InscritosEmpty>Nenhuma inscrição encontrada para este período.</InscritosEmpty>
              ) : (
                <InscritosListaCompacta>
                  <InscritosListaHead>
                    <span>Nome</span>
                    <span>Prefeitura</span>
                    <span>Curso</span>
                    <span className="col-qtd">Qtd.</span>
                  </InscritosListaHead>
                  {listaInscritosFiltrada.map((ins) => {
                    const listaInsc = parseJSONSeguro(ins.inscritos_json, []).filter((p) => p.nome || p.email);
                    const qtd = ins.qtd_inscritos || listaInsc.length || 0;
                    return (
                      <InscritosListaRow
                        key={ins.oportunidade_id}
                        type="button"
                        onClick={() => setInscritoDetalhe(ins)}
                      >
                        <span className="col-nome" title={ins.contato_nome}>
                          {ins.contato_nome || '—'}
                        </span>
                        <span className="col-pref" title={ins.empresa_nome}>
                          {ins.empresa_nome || '—'}
                        </span>
                        <span className="col-curso" title={ins.curso_nome}>
                          {ins.curso_nome || '—'}
                        </span>
                        <span className="col-qtd">{qtd}</span>
                      </InscritosListaRow>
                    );
                  })}
                </InscritosListaCompacta>
              )}
            </Panel>
          </DashboardGrid>
        </>
      )}

      {inscritoDetalhe && (() => {
        const emails = parseJSONSeguro(inscritoDetalhe.emails_json, []);
        const telefones = parseJSONSeguro(inscritoDetalhe.telefones_json, []);
        const listaInsc = parseJSONSeguro(inscritoDetalhe.inscritos_json, []).filter((p) => p.nome || p.email);
        const qtd = inscritoDetalhe.qtd_inscritos || listaInsc.length || 0;

        return (
          <ModalOverlay onClick={() => setInscritoDetalhe(null)}>
            <ModalContent $large onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <div>
                  <h3 className="text-green"><i className="fa-solid fa-user-graduate" /> Inscrição</h3>
                  <div className="subtitle">{inscritoDetalhe.contato_nome} · {inscritoDetalhe.empresa_nome || 'Sem prefeitura'}</div>
                </div>
                <CloseButton onClick={() => setInscritoDetalhe(null)}>&times;</CloseButton>
              </ModalHeader>

              <ModalBody>
                <DetalheResumoGrid>
                  <DetalheItem>
                    <label>Contato (lead)</label>
                    <div>{inscritoDetalhe.contato_nome || '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Prefeitura</label>
                    <div>{inscritoDetalhe.empresa_nome || '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Curso</label>
                    <div className="text-blue">{inscritoDetalhe.curso_nome || '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Data</label>
                    <div>{formatarData(inscritoDetalhe.data_inscricao)}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>E-mail do lead</label>
                    <div>{emails.length ? emails.join(', ') : '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Telefone do lead</label>
                    <div>{telefones.length ? telefones.join(', ') : '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Quantidade de inscritos</label>
                    <div><strong>{qtd}</strong></div>
                  </DetalheItem>
                </DetalheResumoGrid>

                {listaInsc.length > 0 && (
                  <>
                    <DetalheSectionTitle><i className="fa-solid fa-users" /> Inscritos cadastrados</DetalheSectionTitle>
                    <DetalheInscritosLista>
                      {listaInsc.map((p, i) => (
                        <DetalheInscritoCard key={i}>
                          <strong>{p.nome || 'Sem nome'}</strong>
                          {p.email && <span><i className="fa-solid fa-envelope" /> {p.email}</span>}
                          {p.telefone && <span><i className="fa-solid fa-phone" /> {p.telefone}</span>}
                          {p.cargo && <span><i className="fa-solid fa-briefcase" /> {p.cargo}</span>}
                          {p.formacao && <span><i className="fa-solid fa-graduation-cap" /> {p.formacao}</span>}
                        </DetalheInscritoCard>
                      ))}
                    </DetalheInscritosLista>
                  </>
                )}

                <InscritosOportunidadeEditor
                  oportunidadeId={inscritoDetalhe.oportunidade_id}
                  titulo="Editar inscritos"
                  onSalvo={async () => {
                    const dados = await recarregarInscritos();
                    const atualizado = dados.find((d) => Number(d.oportunidade_id) === Number(inscritoDetalhe.oportunidade_id));
                    if (atualizado) setInscritoDetalhe(atualizado);
                  }}
                />

                <ModalAcoesRodape>
                  {podeExcluirInscricao ? (
                    <BtnExcluirInscricao
                      type="button"
                      disabled={excluindoInscricao}
                      onClick={excluirInscricaoDashboard}
                    >
                      {excluindoInscricao ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> Excluindo...</>
                      ) : (
                        <><i className="fa-solid fa-trash" /> Excluir inscrição</>
                      )}
                    </BtnExcluirInscricao>
                  ) : (
                    <span className="hint-sem-perm">
                      <i className="fa-solid fa-lock" /> Somente usuários autorizados pelo administrador podem excluir inscrições.
                    </span>
                  )}
                </ModalAcoesRodape>
              </ModalBody>
            </ModalContent>
          </ModalOverlay>
        );
      })()}

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
              ) : erroModal ? (
                <ErrorMessage>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <p>{erroModal}</p>
                </ErrorMessage>
              ) : cliquesAgrupadosModal.length === 0 ? (
                <EmptyChartMsg>Nenhum clique registrado para este e-mail.</EmptyChartMsg>
              ) : (
                <TabelaResponsiva>
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
                          <td data-label="Contato" style={{ verticalAlign: 'top' }}>
                            <strong>{lead.nome}</strong>
                            <div className="contact-subtext">{lead.email}</div>
                          </td>
                          <td data-label="Links Clicados">
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
                </TabelaResponsiva>
              )}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

    </PageContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const ErrorMessage = styled.div`
  background-color: #fff3f3; color: #dc3545; border: 1px solid #ffcaca; padding: 30px; border-radius: 8px; text-align: center; max-width: 500px; margin: 40px auto;
  i { font-size: 2rem; margin-bottom: 10px; }
  button { margin-top: 15px; padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
  button:hover { background-color: #c82333; }
`;

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
  @media (max-width: 768px) { padding: 15px; }
`;

const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; }
`;

const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;

const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

const FiltersContainer = styled.div`
  display: flex; gap: 15px; flex-wrap: wrap;
  @media (max-width: 768px) { width: 100%; }
`;

const FilterPillWrapper = styled.div`
  position: relative; display: inline-block;
  @media (max-width: 768px) { flex: 1; min-width: 200px; }
`;

const FilterButton = styled.button`
  display: flex; align-items: center; justify-content: space-between; background: ${props => props.$hasValue ? '#eef4fa' : '#ffffff'};
  border: 1px solid ${props => props.$hasValue ? '#b8cde1' : '#cbd5e1'}; color: #2c3e50; padding: 10px 18px; border-radius: 10px; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02); width: 100%;
  &:hover { background: #e7f3ff; border-color: #007bff; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,123,255,0.1); }
  span { margin: 0 10px; strong { color: #007bff; } }
  .icon { color: #6c757d; font-size: 1.05rem; } .arrow { color: #007bff; font-size: 0.8rem; }
`;

const HiddenMonthInput = styled.input`
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
  &::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; cursor: pointer; opacity: 0; }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; border: 1px solid #edf2f9; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 250px; max-height: 300px; overflow-y: auto; z-index: 1000; padding: 8px 0; list-style: none; margin: 0; animation: fadeInDown 0.2s ease-out;
  @media (max-width: 768px) { left: 0; right: auto; width: 100%; }
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;

const CustomDropdownItem = styled.li`
  padding: 12px 20px; font-size: 0.95rem; color: ${props => props.$active ? '#007bff' : '#495057'}; background: ${props => props.$active ? '#f0f7ff' : 'transparent'}; font-weight: ${props => props.$active ? '700' : '500'}; cursor: pointer; transition: background 0.2s;
  &:hover { background: #f8fafc; color: #007bff; }
`;

const LoadingContainer = styled.div`
  text-align: center; padding: 60px; color: #6c757d; font-size: 1.1rem;
  i { font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1; }
`;

const KpiGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px;
`;

const KpiCard = styled.div`
  background: ${props => props.$bgColor || '#ffffff'}; border-left: 5px solid ${props => props.$borderColor || '#ccc'}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: center; transition: transform 0.2s;
  &:hover { transform: translateY(-4px); }
  .kpi-header { display: flex; justify-content: space-between; align-items: center; }
  .kpi-label { color: #64748b; font-size: 0.85rem; font-weight: 700; }
  .kpi-value { font-size: 1.8rem; font-weight: 800; color: #2c3e50; margin: 10px 0; }
  .kpi-subtitle { font-size: 0.85rem; font-weight: 600; }
`;

const DashboardGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; border-left: ${props => props.$borderLeft ? `5px solid ${props.$borderLeft}` : 'none'}; border-top: ${props => props.$borderTop ? `5px solid ${props.$borderTop}` : 'none'}; overflow: hidden;
  ${props => props.$fullWidth && 'grid-column: 1 / -1;'}
`;

const PanelTitle = styled.h4`
  margin: 0; padding: 20px 20px 5px 20px; color: #2c3e50; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 10px;
  &.text-center { justify-content: center; }
  .text-blue { color: #007bff; } .text-green { color: #28a745; } .text-purple { color: #6f42c1; }
`;

const PanelSubtitle = styled.p`
  margin: 0; padding: 0 20px 15px 20px; color: #6c757d; font-size: 0.85rem; border-bottom: 1px solid #edf2f9;
  &.text-center { text-align: center; }
`;

const EngagementListsContainer = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 20px; background: #fbfbfc;
`;

const EngagementColumn = styled.div`
  display: flex; flex-direction: column; gap: 10px;
  .col-title { margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 6px; &.text-blue { color: #007bff; } &.text-red { color: #dc3545; } &.text-orange { color: #fd7e14; } }
`;

const EmailRow = styled.div`
  background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  &:hover { border-color: #007bff; box-shadow: 0 4px 10px rgba(0,123,255,0.1); transform: translateX(4px); }
  .email-info { display: flex; flex-direction: column; gap: 4px; .badge-step { font-size: 0.7rem; background: #eef4fa; color: #1F4E79; padding: 2px 6px; border-radius: 4px; width: max-content; font-weight: 700;} .email-name { font-size: 0.9rem; font-weight: 600; color: #333; } }
  .clicks-badge { background: #f0f7ff; color: #007bff; font-weight: 700; font-size: 0.85rem; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px; border: 1px solid #cce5ff; }
`;

const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px); padding: 20px;
`;

const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: ${(p) => (p.$large ? '920px' : '700px')}; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #edf2f9; background: #fbfbfc; border-radius: 12px 12px 0 0;
  h3 { margin: 0; color: #2c3e50; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;} .subtitle { font-size: 0.85rem; color: #6c757d; margin-top: 4px; font-weight: 600;}
`;

const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; color: #a0aec0; cursor: pointer; transition: 0.2s; &:hover { color: #dc3545; }
`;

const ClickBadge = styled.div`
  display: inline-flex; align-items: center; background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin: 4px; gap: 8px;
  .link-name { font-size: 0.8rem; font-weight: 700; color: #007bff; } .link-time { font-size: 0.75rem; color: #888; }
`;

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
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #495057; font-weight: 600; .color-box { width: 12px; height: 12px; border-radius: 3px; }
`;

// === RESPONSIVIDADE EM TABELAS PARA O MOBILE ===

const TabelaResponsiva = styled.div`
  padding: 0; overflow-x: auto; max-height: ${props => props.$maxHeight || 'auto'};
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 500px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; }
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; color: #2c3e50; }
  tr:last-child td { border-bottom: none; } tr:hover td { background-color: #f8fafc; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
  
  .text-center { text-align: center; } .text-right { text-align: right; } .text-muted { color: #a0aec0; font-style: italic; } 
  .text-blue { color: #007bff; } .text-green { color: #28a745; } .text-yellow { color: #f59e0b; margin-right: 6px; }
  .font-bold { font-weight: 700; } .large-text { font-size: 1.05rem; }
  .date-subtext { font-size: 0.8rem; color: #6c757d; margin-top: 3px; } .date-text { font-size: 0.9rem; color: #495057; } 
  .contact-subtext { font-size: 0.8rem; color: #6c757d; margin-top: 3px; i { width: 14px; text-align: center; } }

  @media (max-width: 768px) {
    min-width: unset; display: block;
    thead, tbody, th, td, tr { display: block; }
    thead tr { position: absolute; top: -9999px; left: -9999px; }
    tr {
      border: 1px solid #edf2f9; border-radius: 12px; margin: 15px; padding: 10px; background: #fff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }
    td {
      border: none; border-bottom: 1px solid #f1f5f9; position: relative; padding: 12px 10px 12px 40%; 
      text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; min-height: 40px;
    }
    td:last-child { border-bottom: none; }
    td::before {
      position: absolute; top: 50%; left: 10px; transform: translateY(-50%); width: 35%; padding-right: 10px; 
      white-space: nowrap; text-align: left; font-weight: 700; color: #6c757d; font-size: 0.75rem; 
      content: attr(data-label); text-transform: uppercase;
    }
    .text-center, .text-right { text-align: right; }
  }
`;

const Badge = styled.span`
  padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; display: inline-block;
  &.badge-gray { background: #f1f5f9; color: #475569; } &.badge-blue { background: #e7f3ff; color: #007bff; } &.badge-primary { background: #eef4fa; color: #1F4E79; } &.badge-success { background: #f4fbf5; color: #28a745; }
`;

const PanelHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px 20px 0;
`;

const BtnExportarInscritos = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #198754;
  background: #e6f4ea;
  color: #195326;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  &:hover:not(:disabled) { background: #d1e7dd; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const InscritosEmpty = styled.p`
  margin: 0;
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
  font-style: italic;
`;

const inscritosGridCols = 'minmax(120px, 1.2fr) minmax(140px, 1.4fr) minmax(100px, 1fr) 52px';

const InscritosListaCompacta = styled.div`
  margin: 8px 16px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  max-height: 420px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

const InscritosListaHead = styled.div`
  display: grid;
  grid-template-columns: ${inscritosGridCols};
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.03em;
  position: sticky;
  top: 0;
  z-index: 1;
  .col-qtd { text-align: center; }
`;

const InscritosListaRow = styled.button`
  display: grid;
  grid-template-columns: ${inscritosGridCols};
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-size: 0.88rem;
  color: #334155;
  transition: background 0.15s;
  align-items: center;

  &:last-child { border-bottom: none; }
  &:hover { background: #f0fdf4; }
  &:focus-visible { outline: 2px solid #28a745; outline-offset: -2px; }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .col-nome { font-weight: 700; color: #1e293b; }
  .col-curso { color: #007bff; font-weight: 600; font-size: 0.82rem; }
  .col-qtd {
    text-align: center;
    font-weight: 800;
    color: #166534;
    background: #f0fdf4;
    border-radius: 6px;
    padding: 4px 0;
    font-size: 0.85rem;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 4px;
    span::before {
      content: attr(data-label);
      font-size: 0.68rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .col-nome::before { content: 'Nome'; }
    .col-pref::before { content: 'Prefeitura'; }
    .col-curso::before { content: 'Curso'; }
    .col-qtd::before { content: 'Qtd.'; }
    .col-qtd { width: fit-content; }
  }
`;

const DetalheResumoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
`;

const DetalheItem = styled.div`
  label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  div {
    font-size: 0.92rem;
    color: #1e293b;
    font-weight: 600;
    word-break: break-word;
  }
  .text-blue { color: #007bff; }
`;

const DetalheSectionTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DetalheInscritosLista = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
`;

const ModalAcoesRodape = styled.div`
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  .hint-sem-perm {
    font-size: 0.82rem;
    color: #94a3b8;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const BtnExcluirInscricao = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #f8d7da;
  background: #fff5f5;
  color: #dc3545;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  &:hover:not(:disabled) { background: #dc3545; color: #fff; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const DetalheInscritoCard = styled.div`
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong { font-size: 0.9rem; color: #0f172a; }
  span {
    font-size: 0.82rem;
    color: #475569;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
    word-break: break-word;
    i { color: #94a3b8; margin-top: 3px; flex-shrink: 0; }
  }
`;