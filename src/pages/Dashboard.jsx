// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export function Dashboard() {
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [etapasDaCampanha, setEtapasDaCampanha] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtro inteligente do Dashboard
  const [filtroCampanha, setFiltroCampanha] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // 1. Carrega todas as campanhas e oportunidades ao abrir a tela
  useEffect(() => {
    async function carregarDadosBase() {
      setCarregando(true);
      try {
        const [resOps, resCamp] = await Promise.all([
          axios.get(`${API_URL}/oportunidades`, getHeaders()),
          axios.get(`${API_URL}/campanhas`, getHeaders())
        ]);
        setOportunidades(resOps.data);
        setCampanhas(resCamp.data);
      } catch (erro) {
        console.error('Erro ao carregar base do dashboard', erro);
      } finally {
        setCarregando(false);
      }
    }
    carregarDadosBase();
  }, []);

  // 2. Se o usuário escolher uma campanha específica, busca as etapas dela para montar o funil
  useEffect(() => {
    async function buscarEtapas() {
      if (filtroCampanha) {
        try {
          const resEtapas = await axios.get(`${API_URL}/campanhas/${filtroCampanha}/etapas`, getHeaders());
          setEtapasDaCampanha(resEtapas.data);
        } catch (erro) {
          console.error(erro);
        }
      } else {
        setEtapasDaCampanha([]);
      }
    }
    buscarEtapas();
  }, [filtroCampanha]);

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarData(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  // === FILTRANDO OS DADOS COM BASE NA ESCOLHA DO USUÁRIO ===
  const opsExibidas = filtroCampanha 
    ? oportunidades.filter(op => op.campanha_id === parseInt(filtroCampanha))
    : oportunidades;

  // === CÁLCULOS MATEMÁTICOS PARA OS CARDS ===
  let totalAberto = 0, totalGanho = 0, totalPerdido = 0;
  let qtdAberto = 0, qtdGanho = 0, qtdPerdido = 0;

  opsExibidas.forEach(op => {
    const valor = Number(op.valor) || 0;
    if (op.status === 'ganho') {
      totalGanho += valor;
      qtdGanho++;
    } else if (op.status === 'perdido') {
      totalPerdido += valor;
      qtdPerdido++;
    } else {
      totalAberto += valor;
      qtdAberto++;
    }
  });

  const ticketMedio = qtdGanho > 0 ? (totalGanho / qtdGanho) : 0;

  // === MÁGICA DOS GRÁFICOS DINÂMICOS ===
  let dadosGraficoBarras = [];
  let tituloGraficoBarras = '';

  if (filtroCampanha) {
    // Se escolheu uma campanha: Mostra o Funil (Etapas)
    tituloGraficoBarras = 'Distribuição no Funil (Em Aberto)';
    dadosGraficoBarras = etapasDaCampanha.map(etapa => {
      const opsNaEtapa = opsExibidas.filter(op => op.etapa_id === etapa.id && op.status === 'aberto');
      return {
        nome: etapa.nome,
        Quantidade: opsNaEtapa.length,
        Valor: opsNaEtapa.reduce((acc, op) => acc + (Number(op.valor) || 0), 0)
      };
    });
  } else {
    // Se "Todas as Campanhas": Compara as campanhas entre si!
    tituloGraficoBarras = 'Volume em Aberto por Campanha';
    dadosGraficoBarras = campanhas.map(camp => {
      const opsNaCamp = opsExibidas.filter(op => op.campanha_id === camp.id && op.status === 'aberto');
      return {
        nome: camp.nome,
        Quantidade: opsNaCamp.length,
        Valor: opsNaCamp.reduce((acc, op) => acc + (Number(op.valor) || 0), 0)
      };
    }).filter(d => d.Quantidade > 0); // Oculta campanhas zeradas
  }

  // === DADOS PARA O GRÁFICO DE PIZZA (STATUS GERAL) ===
  const dadosPizza = [
    { name: 'Ganhos', value: qtdGanho, color: '#28a745' },
    { name: 'Perdidos', value: qtdPerdido, color: '#dc3545' },
    { name: 'Em Aberto', value: qtdAberto, color: '#007bff' }
  ].filter(d => d.value > 0); 

  // Tabela de Vendas Recentes (Filtrada pela campanha selecionada)
  const ultimasVendas = opsExibidas
    .filter(op => op.status === 'ganho')
    .sort((a, b) => new Date(b.atualizado_em || b.criado_em) - new Date(a.atualizado_em || a.criado_em))
    .slice(0, 5);

  return (
    <div>
      <Header titulo="Inteligência de Vendas" />

      <div className="page-container">
        
        {/* === TOPO: TÍTULO E FILTRO GLOBAL === */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>Dashboard Gerencial</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>
              Métricas e conversões baseadas nos seus resultados.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <label style={{ color: '#555', fontWeight: 'bold', fontSize: '0.95rem' }}><i className="fa-solid fa-filter"></i> Analisar:</label>
            <select 
              value={filtroCampanha} 
              onChange={(e) => setFiltroCampanha(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: '#007bff', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              <option value="">Todas as Campanhas (Visão Macro)</option>
              {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Calculando inteligência...
          </div>
        ) : (
          <>
            {/* === 4 CARDS DE DESTAQUE === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              
              <div className="panel" style={{ borderLeft: '5px solid #007bff', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>VALOR NO FUNIL</div>
                  <i className="fa-solid fa-chart-line" style={{ color: '#007bff', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalAberto)}</div>
                <div style={{ fontSize: '0.85rem', color: '#007bff', fontWeight: 'bold' }}>{qtdAberto} negócios negociando</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #28a745', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>RECEITA GANHA</div>
                  <i className="fa-solid fa-check-circle" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalGanho)}</div>
                <div style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 'bold' }}>{qtdGanho} contratos fechados</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #17a2b8', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>TICKET MÉDIO</div>
                  <i className="fa-solid fa-ticket" style={{ color: '#17a2b8', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(ticketMedio)}</div>
                <div style={{ fontSize: '0.85rem', color: '#17a2b8', fontWeight: 'bold' }}>Média de valor por fechamento</div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #dc3545', padding: '20px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>VALOR PERDIDO</div>
                  <i className="fa-solid fa-circle-xmark" style={{ color: '#dc3545', fontSize: '1.2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{formatarMoeda(totalPerdido)}</div>
                <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 'bold' }}>{qtdPerdido} negócios perdidos</div>
              </div>

            </div>

            {/* === ÁREA DE GRÁFICOS === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              
              {/* Gráfico 1: Barras (Funil ou Comparativo) */}
              <div className="panel" style={{ margin: 0, padding: '20px' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{tituloGraficoBarras}</h4>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '20px' }}>Exibe apenas negociações ativas (não fechadas/perdidas).</p>
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
                            <Cell key={`cell-${index}`} fill={filtroCampanha ? (index > 2 ? '#ff9800' : '#007bff') : '#722ed1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Pizza de Taxa de Conversão */}
              <div className="panel" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333', textAlign: 'center' }}>Efetividade Geral</h4>
                <p style={{ color: '#999', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center' }}>Distribuição de resultados dos negócios criados.</p>
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

            {/* === TABELA DE VENDAS RECENTES === */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-trophy" style={{ color: '#f1c40f', fontSize: '1.2rem' }}></i> 
                <span>Últimas Vendas Concluídas {filtroCampanha && <span style={{color: '#999', fontSize: '0.85rem', fontWeight: 'normal'}}>(Nesta campanha)</span>}</span>
              </div>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555', fontSize: '0.9rem' }}>
                      <th style={{ padding: '15px' }}>Negociação</th>
                      <th style={{ padding: '15px' }}>Prefeitura</th>
                      {!filtroCampanha && <th style={{ padding: '15px' }}>Campanha</th>}
                      <th style={{ padding: '15px' }}>Data do Fechamento</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>Valor Fechado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasVendas.length === 0 ? (
                      <tr><td colSpan={!filtroCampanha ? 5 : 4} style={{ textAlign: 'center', padding: '30px', color: '#999', fontStyle: 'italic' }}>Nenhuma venda concluída para os filtros selecionados.</td></tr>
                    ) : (
                      ultimasVendas.map(op => (
                        <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>{op.titulo}</td>
                          <td style={{ padding: '15px', color: '#555' }}>
                            {op.empresa_nome ? <><i className="fa-solid fa-building" style={{color:'#aaa', marginRight:'5px'}}></i>{op.empresa_nome}</> : '-'}
                          </td>
                          {!filtroCampanha && (
                            <td style={{ padding: '15px' }}>
                              <span style={{ background: '#e9ecef', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', color: '#444', fontWeight: 'bold' }}>{op.campanha_nome || 'Avulsa'}</span>
                            </td>
                          )}
                          <td style={{ padding: '15px', color: '#777', fontSize: '0.9rem' }}>
                            <i className="fa-regular fa-calendar" style={{marginRight:'5px'}}></i>
                            {formatarData(op.atualizado_em || op.criado_em)}
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

          </>
        )}
      </div>
    </div>
  );
}