// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { Header } from '../componentes/Header.jsx';
import { CardInfo } from '../componentes/CardInfo.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function Home() {
  const navigate = useNavigate(); 

  const [contatos, setContatos] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Saudação dinâmica baseada na hora do dia
  const horaAtual = new Date().getHours();
  let saudacao = 'Boa noite';
  if (horaAtual >= 5 && horaAtual < 12) saudacao = 'Bom dia';
  else if (horaAtual >= 12 && horaAtual < 18) saudacao = 'Boa tarde';

  const nomeUsuario = localStorage.getItem('nome') || 'Usuário';
  const perfilUsuario = localStorage.getItem('perfil'); // admin, gestor ou vendedor
  const meuUsuarioId = parseInt(localStorage.getItem('usuarioId') || '0');

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => {
    async function carregarHome() {
      setCarregando(true);
      try {
        const [resContatos, resOportunidades, resCampanhas] = await Promise.all([
          axios.get(`${API_URL}/contatos`, getHeaders()),
          axios.get(`${API_URL}/oportunidades`, getHeaders()),
          axios.get(`${API_URL}/campanhas`, getHeaders())
        ]);
        
        setContatos(resContatos.data);
        setOportunidades(resOportunidades.data);
        setCampanhas(resCampanhas.data);
      } catch (erro) {
        console.error('Erro ao buscar dados da home:', erro);
      } finally {
        setCarregando(false);
      }
    }

    carregarHome();
  }, []);

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // === LENTE DE VISÃO: ADMIN/GESTOR VS VENDEDOR ===
  const opsFiltradas = perfilUsuario === 'vendedor' 
    ? oportunidades.filter(op => op.vendedor_id === meuUsuarioId) 
    : oportunidades;

  // === AGRUPADORES INTELIGENTES DE STATUS ===
  const statusSucesso = ['ganho', 'inscricao'];
  const statusPerdido = ['perdido', 'naofunciona', 'naoatendeu'];
  const statusAndamento = ['aberto', 'tarefa', 'avaliar', 'interessada'];

  // === CÁLCULOS DOS CARDS ===
  const totalContatos = contatos.length;
  const campanhasAtivas = campanhas.length;
  
  const negociosAbertos = opsFiltradas.filter(op => statusAndamento.includes(op.status));
  const negociosGanhos = opsFiltradas.filter(op => statusSucesso.includes(op.status));
  const negociosPerdidos = opsFiltradas.filter(op => statusPerdido.includes(op.status));

  const valorGanho = negociosGanhos.reduce((acc, op) => acc + Number(op.valor || 0), 0);

  // Pega os 5 negócios abertos mais recentes (filtrado pela lente)
  const ultimosNegocios = [...negociosAbertos]
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 5);

  // Dados para o Mini Gráfico de Eficiência
  const dadosGrafico = [
    { name: 'Fechados', value: negociosGanhos.length, color: '#28a745' },
    { name: 'Perdidos', value: negociosPerdidos.length, color: '#dc3545' },
    { name: 'Em Andamento', value: negociosAbertos.length, color: '#007bff' }
  ].filter(d => d.value > 0);

  return (
    <div>
      <Header titulo="Centro de Comando" />

      <div className="page-container">
        
        {/* === BOAS VINDAS === */}
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ color: '#333', margin: 0 }}>{saudacao}, {nomeUsuario}! 👋</h2>
            <p style={{ color: '#777', fontSize: '0.95rem', marginTop: '5px' }}>
              {perfilUsuario === 'vendedor' 
                ? 'Aqui está o resumo da sua carteira de clientes.' 
                : 'Aqui está o resumo da operação de toda a empresa.'}
            </p>
          </div>
          {perfilUsuario !== 'admin' && (
            <div style={{ background: '#e9ecef', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>
              <i className="fa-solid fa-user" style={{marginRight: '5px'}}></i> Conta Vendedor
            </div>
          )}
        </div>

        {/* === CARDS SUPERIORES === */}
        <div className="card-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <CardInfo icone="fa-folder-open" label="Negócios em Andamento" valor={carregando ? "..." : negociosAbertos.length} cor="blue" />
          <CardInfo icone="fa-check-circle" label={perfilUsuario === 'vendedor' ? "Minhas Vendas" : "Faturamento Total"} valor={carregando ? "..." : formatarMoeda(valorGanho)} cor="green" />
          <CardInfo icone="fa-bullhorn" label="Cursos / Campanhas" valor={carregando ? "..." : campanhasAtivas} cor="yellow" />
          <CardInfo icone="fa-address-book" label="Base de Contatos" valor={carregando ? "..." : totalContatos} cor="purple" />
        </div>

        {/* === ÁREA CENTRAL DIVIDIDA (GRID) === */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          
          {/* LADO ESQUERDO: Tabela de Negócios em Aberto */}
          <div className="panel" style={{ margin: 0, gridColumn: 'span 2' }}>
            <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><i className="fa-solid fa-fire" style={{color: '#ff9800'}}></i> Negócios em Andamento (Recentes)</div>
              <button onClick={() => navigate('/funil')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>Ver Funil Completo &rarr;</button>
            </div>
            
            <div className="table-responsive" style={{ padding: '10px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#666' }}>
                    <th style={{ padding: '10px 0' }}>Título / Prefeitura</th>
                    <th>Campanha</th>
                    {perfilUsuario !== 'vendedor' && <th>Vendedor</th>}
                    <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr><td colSpan={perfilUsuario !== 'vendedor' ? 4 : 3} style={{textAlign: 'center', padding: '20px'}}>Carregando dados...</td></tr>
                  ) : ultimosNegocios.length === 0 ? (
                    <tr><td colSpan={perfilUsuario !== 'vendedor' ? 4 : 3} style={{textAlign: 'center', padding: '20px', color: '#999'}}>Nenhum negócio em aberto no momento.</td></tr>
                  ) : (
                    ultimosNegocios.map(op => (
                      <tr key={op.id} style={{ borderBottom: '1px dashed #eee' }}>
                        <td style={{ padding: '12px 0' }}>
                          <strong style={{ color: '#333' }}>{op.titulo}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '3px' }}>
                            <i className="fa-solid fa-building"></i> {op.empresa_nome || 'Avulso'}
                          </div>
                        </td>
                        <td>
                          {op.campanha_nome ? (
                            <span style={{ background: '#e9ecef', padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>
                              {op.campanha_nome}
                            </span>
                          ) : '-'}
                        </td>
                        {perfilUsuario !== 'vendedor' && (
                          <td style={{ fontSize: '0.85rem', color: '#666' }}>
                            <i className="fa-solid fa-user-tie" style={{color: '#722ed1', marginRight: '4px'}}></i> {op.vendedor_nome || 'Não Atribuído'}
                          </td>
                        )}
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#007bff' }}>
                          {formatarMoeda(op.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LADO DIREITO: Gráfico de Eficiência */}
          <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <i className="fa-solid fa-chart-pie" style={{color: '#17a2b8'}}></i> Taxa de Conversão
            </div>
            <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {carregando ? (
                <div style={{ color: '#999', fontSize: '0.85rem' }}>Calculando...</div>
              ) : dadosGrafico.length === 0 ? (
                <div style={{ color: '#999', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>Nenhum dado de negócio para gerar o gráfico.</div>
              ) : (
                <>
                  <div style={{ width: '100%', height: '200px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={dadosGrafico} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                          {dadosGrafico.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {dadosGrafico.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#555', fontWeight: 'bold' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }}></div>
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* LADO DIREITO INFERIOR: Ações Rápidas */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
              <i className="fa-solid fa-bolt" style={{color: '#52c41a'}}></i> Atalhos Rápidos
            </div>
            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/contatos')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                <i className="fa-solid fa-user-plus" style={{color: '#007bff', width: '25px'}}></i> Gerenciar Contatos
              </button>
              <button onClick={() => navigate('/funil')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                <i className="fa-solid fa-layer-group" style={{color: '#faad14', width: '25px'}}></i> Acessar o Pipeline
              </button>
              <button onClick={() => navigate('/empresas')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                <i className="fa-solid fa-building-columns" style={{color: '#722ed1', width: '25px'}}></i> Base de Prefeituras
              </button>
              
              {/* O vendedor não vê o Dashboard de Inteligência, só as telas operacionais */}
              {perfilUsuario !== 'vendedor' && (
                <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '12px', background: '#e6f4ea', border: '1px solid #c3e6cb', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#155724', transition: '0.2s' }}>
                  <i className="fa-solid fa-chart-line" style={{color: '#28a745', width: '25px'}}></i> Ver Dashboard Completo
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}