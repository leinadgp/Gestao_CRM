// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export function Dashboard() {
  const [oportunidades, setOportunidades] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => {
    carregarDados();
  }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarDados() {
    setCarregando(true);
    try {
      const [resOps, resEtapas] = await Promise.all([
        axios.get(`${API_URL}/oportunidades`, getHeaders()),
        axios.get(`${API_URL}/etapas`, getHeaders())
      ]);
      setOportunidades(resOps.data);
      setEtapas(resEtapas.data);
    } catch (erro) {
      console.error('Erro ao carregar dashboard', erro);
    } finally {
      setCarregando(false);
    }
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarData(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  // === CÁLCULOS MATEMÁTICOS PARA OS CARDS ===
  let totalAberto = 0, totalGanho = 0, totalPerdido = 0;
  let qtdAberto = 0, qtdGanho = 0, qtdPerdido = 0;

  oportunidades.forEach(op => {
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

  // === DADOS PARA O GRÁFICO DE BARRAS (FUNIL ATIVO) ===
  const dadosGraficoFunil = etapas.map(etapa => {
    const opsNaEtapa = oportunidades.filter(op => op.etapa_id === etapa.id && op.status === 'aberto');
    return {
      nome: etapa.nome,
      Quantidade: opsNaEtapa.length,
      Valor: opsNaEtapa.reduce((acc, op) => acc + (Number(op.valor) || 0), 0)
    };
  });

  // === DADOS PARA O GRÁFICO DE PIZZA (STATUS GERAL) ===
  const dadosPizza = [
    { name: 'Ganhos', value: qtdGanho, color: '#28a745' },
    { name: 'Perdidos', value: qtdPerdido, color: '#dc3545' },
    { name: 'Em Aberto', value: qtdAberto, color: '#007bff' }
  ].filter(d => d.value > 0); // Só mostra fatias que tem mais de 0

  // Pega as 5 últimas vendas GANHAS para a tabela de recentes
  const ultimasVendas = oportunidades
    .filter(op => op.status === 'ganho')
    .slice(0, 5);

  return (
    <div>
      <Header titulo="Dashboard Gerencial" />

      <div className="page-container">
        
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>Visão Geral de Vendas</h2>
          <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>
            Acompanhe o desempenho da sua pipeline e resultados das prefeituras.
          </p>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Calculando métricas...
          </div>
        ) : (
          <>
            {/* === CARDS DE DESTAQUE NO TOPO === */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              
              <div className="panel" style={{ borderLeft: '5px solid #007bff', padding: '20px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>VALOR EM NEGOCIAÇÃO</div>
                  <i className="fa-solid fa-chart-line" style={{ color: '#007bff', fontSize: '1.5rem' }}></i>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginTop: '10px' }}>
                  {formatarMoeda(totalAberto)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#007bff', marginTop: '5px', fontWeight: 'bold' }}>
                  {qtdAberto} negócios em andamento
                </div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #28a745', padding: '20px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>RECEITA CONQUISTADA (GANHO)</div>
                  <i className="fa-solid fa-check-circle" style={{ color: '#28a745', fontSize: '1.5rem' }}></i>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginTop: '10px' }}>
                  {formatarMoeda(totalGanho)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#28a745', marginTop: '5px', fontWeight: 'bold' }}>
                  {qtdGanho} contratos fechados
                </div>
              </div>

              <div className="panel" style={{ borderLeft: '5px solid #dc3545', padding: '20px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>VALOR PERDIDO</div>
                  <i className="fa-solid fa-circle-xmark" style={{ color: '#dc3545', fontSize: '1.5rem' }}></i>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginTop: '10px' }}>
                  {formatarMoeda(totalPerdido)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#dc3545', marginTop: '5px', fontWeight: 'bold' }}>
                  {qtdPerdido} negócios perdidos
                </div>
              </div>

            </div>

            {/* === ÁREA DE GRÁFICOS === */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
              
              {/* Gráfico 1: Barras do Funil */}
              <div className="panel" style={{ margin: 0, padding: '20px' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#333' }}>Distribuição de Negócios Abertos por Etapa</h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={dadosGraficoFunil} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value, name) => [name === 'Valor' ? formatarMoeda(value) : value, name]} />
                      <Bar dataKey="Quantidade" fill="#007bff" radius={[4, 4, 0, 0]}>
                        {dadosGraficoFunil.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index > 3 ? '#ff9800' : '#007bff'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Pizza de Taxa de Conversão */}
              <div className="panel" style={{ margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#333', textAlign: 'center' }}>Taxa de Conversão</h4>
                <div style={{ width: '100%', flex: 1, minHeight: '250px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={dadosPizza}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {dadosPizza.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#555' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: d.color }}></div>
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* === TABELA DE VENDAS RECENTES === */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title" style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                <i className="fa-solid fa-trophy" style={{ color: '#f1c40f' }}></i> Últimas Vendas Concluídas
              </div>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                      <th style={{ padding: '15px' }}>Negociação</th>
                      <th style={{ padding: '15px' }}>Prefeitura</th>
                      <th style={{ padding: '15px' }}>Data</th>
                      <th style={{ padding: '15px', textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasVendas.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Nenhuma venda concluída ainda.</td></tr>
                    ) : (
                      ultimasVendas.map(op => (
                        <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>{op.titulo}</td>
                          <td style={{ padding: '15px', color: '#555' }}>{op.empresa_nome || 'Avulso'}</td>
                          <td style={{ padding: '15px', color: '#777', fontSize: '0.9rem' }}>{formatarData(op.atualizado_em || op.criado_em)}</td>
                          <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>{formatarMoeda(op.valor)}</td>
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