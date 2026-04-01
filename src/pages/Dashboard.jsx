import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export function Dashboard() {
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [etapasDaCampanha, setEtapasDaCampanha] = useState([]);
  
  const [todosModulos, setTodosModulos] = useState([]);
  const [modulosDaCampanha, setModulosDaCampanha] = useState([]);
  const [relatorioCliques, setRelatorioCliques] = useState([]);
  
  // NOVO: Estado para a lista de pessoas inscritas
  const [inscritos, setInscritos] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [filtroCampanha, setFiltroCampanha] = useState('');
  
  const dataAtual = new Date();
  const mesAtualString = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const [mesFiltro, setMesFiltro] = useState(mesAtualString); 

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => {
    async function carregarDadosBase() {
      setCarregando(true);
      try {
        const [resOps, resCamp, resInscritos] = await Promise.all([
          axios.get(`${API_URL}/oportunidades`, getHeaders()),
          axios.get(`${API_URL}/campanhas`, getHeaders()),
          axios.get(`${API_URL}/dashboard/inscritos`, getHeaders()) // Busca a lista nominal de convertidos
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
          const resEtapas = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/etapas`, getHeaders());
          setEtapasDaCampanha(resEtapas.data);
          setModulosDaCampanha(todosModulos.filter(m => m.campanha_id === parseInt(filtroCampanha)));
          
          const resCliques = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/relatorio-cliques`, getHeaders());
          setRelatorioCliques(resCliques.data);
        } catch (erro) {
          console.error(erro);
        }
      } else {
        setEtapasDaCampanha([]);
        setModulosDaCampanha([]);
        setRelatorioCliques([]);
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
        
        vendasFracionadas.push({
          ...op,
          valorContabil: valorPorModulo,
          dataCompetencia: dataCompetencia,
          modulo_id_fracionado: idMod
        });
      });
    } else {
      vendasFracionadas.push({
        ...op,
        valorContabil: Number(op.valor),
        dataCompetencia: op.atualizado_em || op.criado_em,
        modulo_id_fracionado: null
      });
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
      if (statusAndamento.includes(op.status)) {
        totalAberto += Number(op.valor) || 0;
        qtdAberto++;
      } else if (statusPerdido.includes(op.status)) {
        totalPerdido += Number(op.valor) || 0;
        qtdPerdido++;
      }
    }
  });

  const ticketMedio = qtdGanhaCompetencia > 0 ? (totalGanho / qtdGanhaCompetencia) : 0;

  let dadosGraficoBarras = [];
  let tituloGraficoBarras = '';

  if (filtroCampanha) {
    tituloGraficoBarras = 'Distribuição no Funil (Pipeline Ativo)';
    dadosGraficoBarras = etapasDaCampanha.map(etapa => {
      const opsNaEtapa = opsGeraisFiltradas.filter(op => op.etapa_id === etapa.id && statusAndamento.includes(op.status));
      return { nome: etapa.nome, Quantidade: opsNaEtapa.length, Valor: opsNaEtapa.reduce((acc, op) => acc + (Number(op.valor) || 0), 0) };
    });
  } else {
    tituloGraficoBarras = 'Volume de Negociações Ativas por Curso';
    dadosGraficoBarras = campanhas.map(camp => {
      const opsNaCamp = opsGeraisFiltradas.filter(op => op.campanha_id === camp.id && statusAndamento.includes(op.status));
      return { nome: camp.nome, Quantidade: opsNaCamp.length, Valor: opsNaCamp.reduce((acc, op) => acc + (Number(op.valor) || 0), 0) };
    }).filter(d => d.Quantidade > 0); 
  }

  const dadosPizza = [
    { name: 'Sucesso (Ganhas)', value: qtdGanhaCompetencia, color: '#28a745' },
    { name: 'Perdidos (Descarte)', value: qtdPerdido, color: '#dc3545' },
    { name: 'Pipeline (Em andamento)', value: qtdAberto, color: '#007bff' }
  ].filter(d => d.value > 0); 

  const rankingVendedores = {};
  vendasNoMes.forEach(v => {
    let nomeVendedor = v.vendedor_nome || 'Não Atribuído';
    if (v.origem_venda === 'landing_page') nomeVendedor = 'Automático (Landing Page)';

    if (!rankingVendedores[nomeVendedor]) {
      rankingVendedores[nomeVendedor] = { nome: nomeVendedor, total: 0, quantidade: 0 };
    }
    rankingVendedores[nomeVendedor].total += v.valorContabil;
    rankingVendedores[nomeVendedor].quantidade += 1;
  });
  const dadosEquipe = Object.values(rankingVendedores).sort((a, b) => b.total - a.total);

  const dadosModulos = modulosDaCampanha.map(mod => {
    const vendasDesteModulo = vendasNoMes.filter(v => v.modulo_id_fracionado === mod.id);
    return {
      nome: mod.nome,
      Inscrições: vendasDesteModulo.length,
      Receita: vendasDesteModulo.reduce((acc, v) => acc + v.valorContabil, 0)
    };
  });

  const ultimasVendas = opsGeraisFiltradas
    .filter(op => statusSucesso.includes(op.status))
    .sort((a, b) => new Date(b.atualizado_em || b.criado_em) - new Date(a.atualizado_em || a.criado_em))
    .slice(0, 5);

  // Filtragem da lista nominal de inscritos com base nos filtros da tela
  const listaInscritosFiltrada = inscritos.filter(inscrito => {
    let passaCampanha = true;
    if (filtroCampanha) {
      // Filtrar pelo nome do curso não é o ideal se tiver o ID, mas como a query traz o nome:
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

  return (
    <div>
      <Header titulo="Inteligência de Vendas" />

      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Dashboard de Lançamentos</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>
              Análise financeira por competência (Rateio por Módulo e Mês da Aula).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <label style={{ color: '#555', fontWeight: 'bold', fontSize: '0.95rem' }}><i className="fa-regular fa-calendar-days"></i> Competência (Aula):</label>
              <input 
                type="month" 
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
              />
              {mesFiltro && (
                <button onClick={() => setMesFiltro('')} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', marginLeft: '5px' }} title="Limpar Filtro de Mês">
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <label style={{ color: '#555', fontWeight: 'bold', fontSize: '0.95rem' }}><i className="fa-solid fa-filter"></i> Curso:</label>
              <select 
                value={filtroCampanha} 
                onChange={(e) => setFiltroCampanha(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: '#007bff', cursor: 'pointer', fontSize: '0.95rem', maxWidth: '200px' }}
              >
                <option value="">Todos (Visão Macro)</option>
                {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Calculando relatórios...
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="panel" style={{ borderLeft: '5px solid #007bff', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>VALOR NEGOCIANDO</div>
                  <i className="fa-solid fa-chart-line" style={{ color: '#007bff', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalAberto)}</div>
                <div style={{ fontSize: '0.85rem', color: '#007bff', fontWeight: 'bold' }}>{qtdAberto} negócios em aberto</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #28a745', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f4fbf5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>RECEITA FRACIONADA</div>
                  <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalGanho)}</div>
                <div style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 'bold' }}>{qtdGanhaCompetencia} inscrições no mês</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #17a2b8', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>TICKET POR MÓDULO</div>
                  <i className="fa-solid fa-ticket" style={{ color: '#17a2b8', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(ticketMedio)}</div>
                <div style={{ fontSize: '0.85rem', color: '#17a2b8', fontWeight: 'bold' }}>Média de valor por inscrição</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #dc3545', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>VALOR PERDIDO</div>
                  <i className="fa-solid fa-circle-xmark" style={{ color: '#dc3545', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalPerdido)}</div>
                <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 'bold' }}>{qtdPerdido} negócios descartados</div>
              </div>
            </div>

            {filtroCampanha && relatorioCliques.length > 0 && (
              <div className="panel" style={{ margin: '0 0 30px 0', padding: '20px', borderLeft: '5px solid #17a2b8' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}><i className="fa-solid fa-mouse-pointer" style={{ color: '#17a2b8' }}></i> Engajamento de E-mails</h4>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '15px' }}>Cliques reais por etapa da automação.</p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {relatorioCliques.map(rel => (
                    <div key={rel.etapa_email} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', flex: '1', minWidth: '150px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#007bff' }}>Etapa {rel.etapa_email}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: '5px 0' }}>{rel.total_cliques} <span style={{fontSize: '0.8rem', color: '#777', fontWeight: 'normal'}}>cliques</span></div>
                      <div style={{ fontSize: '0.75rem', color: '#17a2b8', fontWeight: 'bold' }}>Em {rel.leads_unicos} leads únicos</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filtroCampanha && modulosDaCampanha.length > 0 && (
              <div className="panel" style={{ margin: '0 0 30px 0', padding: '20px', borderLeft: '5px solid #722ed1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#333' }}><i className="fa-solid fa-calendar-days" style={{ color: '#722ed1' }}></i> Fechamentos por Turma / Módulo (No mês selecionado)</h4>
                    <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>Distribuição da receita e quantidade de inscrições por módulo.</p>
                  </div>
                </div>
                <div style={{ width: '100%', height: 250 }}>
                  {dadosModulos.every(d => d.Inscrições === 0) ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontStyle: 'italic' }}>Nenhuma venda fracionada para este mês.</div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={dadosModulos} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="nome" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value, name) => [name === 'Receita' ? formatarMoeda(value) : value, name]} />
                        <Bar dataKey="Inscrições" fill="#28a745" radius={[0, 4, 4, 0]} barSize={20} />
                        <Bar dataKey="Receita" fill="#722ed1" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="panel" style={{ margin: 0, padding: '20px' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{tituloGraficoBarras}</h4>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '20px' }}>Exibe apenas negociações ativas no funil.</p>
                <div style={{ width: '100%', height: 300 }}>
                  {dadosGraficoBarras.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontStyle: 'italic' }}>Nenhum negócio ativo para exibir.</div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={dadosGraficoBarras} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value, name) => [name === 'Valor' ? formatarMoeda(value) : value, name]} />
                        <Bar dataKey="Quantidade" fill="#007bff" radius={[4, 4, 0, 0]}>
                          {dadosGraficoBarras.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={filtroCampanha ? (index > 2 ? '#ff9800' : '#007bff') : '#17a2b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="panel" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333', textAlign: 'center' }}>Efetividade (Por Status Geral)</h4>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>Comparativo geral do período filtrado.</p>
                <div style={{ width: '100%', flex: 1, minHeight: '250px' }}>
                  {dadosPizza.length === 0 ? (
                     <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontStyle: 'italic' }}>Nenhum dado para analisar.</div>
                  ) : (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                          {dadosPizza.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  {dadosPizza.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: d.color }}></div>
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-title" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-medal" style={{ color: '#007bff', fontSize: '1.2rem' }}></i> 
                  <span>Ranking de Vendas (Inscrições Rateadas)</span>
                </div>
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555', fontSize: '0.9rem' }}>
                        <th style={{ padding: '15px' }}>Vendedor</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Inscrições</th>
                        <th style={{ padding: '15px', textAlign: 'right' }}>Receita Gerada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosEquipe.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>Nenhuma venda rateada para este mês.</td></tr>
                      ) : (
                        dadosEquipe.map((v, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>
                              {index === 0 && <i className="fa-solid fa-crown" style={{color: '#f1c40f', marginRight: '8px'}}></i>}
                              {v.nome}
                            </td>
                            <td style={{ padding: '15px', textAlign: 'center', color: '#555', fontWeight: 'bold' }}>
                              <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '12px' }}>{v.quantidade}</span>
                            </td>
                            <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                              {formatarMoeda(v.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-title" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-handshake" style={{ color: '#28a745', fontSize: '1.2rem' }}></i> 
                  <span>Últimos Negócios Fechados</span>
                </div>
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555', fontSize: '0.9rem' }}>
                        <th style={{ padding: '15px' }}>Negociação</th>
                        <th style={{ padding: '15px' }}>Origem/Vendedor</th>
                        <th style={{ padding: '15px', textAlign: 'right' }}>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimasVendas.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>Nenhuma venda concluída no período.</td></tr>
                      ) : (
                        ultimasVendas.map(op => (
                          <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px' }}>
                              <div style={{ fontWeight: 'bold', color: '#333' }}>{op.titulo}</div>
                              <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '3px' }}>{formatarData(op.atualizado_em || op.criado_em)}</div>
                            </td>
                            <td style={{ padding: '15px' }}>
                              <span style={{ background: '#e7f3ff', color: '#007bff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {op.origem_venda === 'landing_page' ? '🤖 Landing Page' : (op.vendedor_nome || 'Equipe')}
                              </span>
                            </td>
                            <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#28a745', fontSize: '1.05rem' }}>
                              {formatarMoeda(op.valor)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SEÇÃO NOVA: LISTA DE INSCRITOS (CONVERTIDOS) */}
            <div className="panel" style={{ margin: '0 0 30px 0', borderTop: '5px solid #28a745' }}>
              <div className="panel-title" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-users-viewfinder" style={{ color: '#28a745', fontSize: '1.2rem' }}></i> 
                <span>Lista Nominal de Inscritos (Convertidos)</span>
              </div>
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555', fontSize: '0.9rem' }}>
                      <th style={{ padding: '15px' }}>Lead (Contato)</th>
                      <th style={{ padding: '15px' }}>Curso Base</th>
                      <th style={{ padding: '15px' }}>Data da Inscrição</th>
                      <th style={{ padding: '15px' }}>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaInscritosFiltrada.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>Nenhuma inscrição encontrada para este período/curso.</td></tr>
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
                          <tr key={ins.oportunidade_id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px' }}>
                              <div style={{ fontWeight: 'bold', color: '#333' }}>{ins.contato_nome}</div>
                              <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '3px' }}><i className="fa-solid fa-envelope"></i> {emailDisplay}</div>
                              <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '2px' }}><i className="fa-solid fa-phone"></i> {fonesDisplay}</div>
                            </td>
                            <td style={{ padding: '15px', color: '#007bff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {ins.curso_nome}
                            </td>
                            <td style={{ padding: '15px', fontSize: '0.9rem', color: '#555' }}>
                              {formatarData(ins.data_inscricao)}
                            </td>
                            <td style={{ padding: '15px' }}>
                              <span style={{ background: ins.origem_venda === 'landing_page' ? '#eef4fa' : '#f4fbf5', color: ins.origem_venda === 'landing_page' ? '#1F4E79' : '#28a745', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {ins.origem_venda === 'landing_page' ? 'Site / Formulário' : 'Venda Manual'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}