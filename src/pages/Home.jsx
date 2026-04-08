// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';
import { CardInfo } from '../componentes/CardInfo.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function Home() {
  const navigate = useNavigate(); 

  const [contatos, setContatos] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [primeiroNome, setPrimeiroNome] = useState('Usuário'); // <-- Estado do nome

  // Saudação dinâmica baseada na hora do dia
  const horaAtual = new Date().getHours();
  let saudacao = 'Boa noite';
  if (horaAtual >= 5 && horaAtual < 12) saudacao = 'Bom dia';
  else if (horaAtual >= 12 && horaAtual < 18) saudacao = 'Boa tarde';

  const perfilUsuario = localStorage.getItem('perfil'); // admin, gestor ou vendedor
  const meuUsuarioId = parseInt(localStorage.getItem('usuarioId') || '0');

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  // EFEITO 1: Descobrir o nome do usuário lendo o Token JWT
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload); 
        // Pega apenas a primeira palavra do nome
        setPrimeiroNome(payload.nome.split(' ')[0]);
      } catch (error) {
        console.error('Erro ao ler nome do usuário na Home', error);
      }
    }
  }, []);

  // EFEITO 2: Carregar os dados da Dashboard
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
    <>
      <Header titulo="Centro de Comando" />

      <PageContainer>
        {/* === BOAS VINDAS === */}
        <WelcomeSection>
          <div className="welcome-text">
            <h2>{saudacao}, {primeiroNome}! 👋</h2>
            <p>
              {perfilUsuario === 'vendedor' 
                ? 'Aqui está o resumo da sua carteira de clientes.' 
                : 'Aqui está o resumo da operação de toda a empresa.'}
            </p>
          </div>
          {perfilUsuario !== 'admin' && (
            <BadgeRole>
              <i className="fa-solid fa-user"></i> Conta Vendedor
            </BadgeRole>
          )}
        </WelcomeSection>

        {/* === CARDS SUPERIORES === */}
        <CardsGrid>
          <CardInfo icone="fa-folder-open" label="Negócios em Andamento" valor={carregando ? "..." : negociosAbertos.length} cor="blue" />
          <CardInfo icone="fa-check-circle" label={perfilUsuario === 'vendedor' ? "Minhas Vendas" : "Faturamento Total"} valor={carregando ? "..." : formatarMoeda(valorGanho)} cor="green" />
          <CardInfo icone="fa-bullhorn" label="Cursos / Campanhas" valor={carregando ? "..." : campanhasAtivas} cor="yellow" />
          <CardInfo icone="fa-address-book" label="Base de Contatos" valor={carregando ? "..." : totalContatos} cor="purple" />
        </CardsGrid>

        {/* === ÁREA CENTRAL DIVIDIDA (GRID) === */}
        <DashboardGrid>
          
          {/* LADO ESQUERDO: Tabela de Negócios em Aberto */}
          <Panel className="span-2">
            <PanelHeader>
              <div className="title">
                <i className="fa-solid fa-fire" style={{ color: '#ff9800' }}></i> Negócios em Andamento (Recentes)
              </div>
              <ActionLink onClick={() => navigate('/funil')}>Ver Funil Completo &rarr;</ActionLink>
            </PanelHeader>
            
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Título / Prefeitura</th>
                    <th>Campanha</th>
                    {perfilUsuario !== 'vendedor' && <th>Vendedor</th>}
                    <th className="align-right">Valor Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr><td colSpan={perfilUsuario !== 'vendedor' ? 4 : 3} className="text-center">Carregando dados...</td></tr>
                  ) : ultimosNegocios.length === 0 ? (
                    <tr><td colSpan={perfilUsuario !== 'vendedor' ? 4 : 3} className="text-center text-muted">Nenhum negócio em aberto no momento.</td></tr>
                  ) : (
                    ultimosNegocios.map(op => (
                      <tr key={op.id}>
                        <td>
                          <strong className="title-text">{op.titulo}</strong>
                          <div className="subtitle-text">
                            <i className="fa-solid fa-building"></i> {op.empresa_nome || 'Avulso'}
                          </div>
                        </td>
                        <td>
                          {op.campanha_nome ? (
                            <CampanhaBadge>{op.campanha_nome}</CampanhaBadge>
                          ) : '-'}
                        </td>
                        {perfilUsuario !== 'vendedor' && (
                          <td className="seller-cell">
                            <i className="fa-solid fa-user-tie"></i> {op.vendedor_nome || 'Não Atribuído'}
                          </td>
                        )}
                        <td className="align-right value-cell">
                          {formatarMoeda(op.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableContainer>
          </Panel>

          {/* LADO DIREITO SUPERIOR: Gráfico de Eficiência */}
          <Panel>
            <PanelHeader>
              <div className="title">
                <i className="fa-solid fa-chart-pie" style={{ color: '#17a2b8' }}></i> Taxa de Conversão
              </div>
            </PanelHeader>
            <ChartWrapper>
              {carregando ? (
                <div className="text-muted">Calculando...</div>
              ) : dadosGrafico.length === 0 ? (
                <div className="text-muted text-center">Nenhum dado de negócio para gerar o gráfico.</div>
              ) : (
                <>
                  <div className="chart-container">
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
                  <LegendContainer>
                    {dadosGrafico.map(d => (
                      <LegendItem key={d.name}>
                        <div className="color-box" style={{ background: d.color }}></div>
                        {d.name} ({d.value})
                      </LegendItem>
                    ))}
                  </LegendContainer>
                </>
              )}
            </ChartWrapper>
          </Panel>

          {/* LADO DIREITO INFERIOR: Ações Rápidas */}
          <Panel>
            <PanelHeader>
              <div className="title">
                <i className="fa-solid fa-bolt" style={{ color: '#52c41a' }}></i> Atalhos Rápidos
              </div>
            </PanelHeader>
            <QuickActionsWrapper>
              <ShortcutButton onClick={() => navigate('/contatos')}>
                <i className="fa-solid fa-user-plus text-blue"></i> Gerenciar Contatos
              </ShortcutButton>
              <ShortcutButton onClick={() => navigate('/funil')}>
                <i className="fa-solid fa-layer-group text-yellow"></i> Acessar o Pipeline
              </ShortcutButton>
              <ShortcutButton onClick={() => navigate('/empresas')}>
                <i className="fa-solid fa-building-columns text-purple"></i> Base de Prefeituras
              </ShortcutButton>
              
              {/* O vendedor não vê o Dashboard de Inteligência */}
              {perfilUsuario !== 'vendedor' && (
                <DashboardButton onClick={() => navigate('/dashboard')}>
                  <i className="fa-solid fa-chart-line text-green"></i> Ver Dashboard Completo
                </DashboardButton>
              )}
            </QuickActionsWrapper>
          </Panel>

        </DashboardGrid>
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

const WelcomeSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
  gap: 15px;

  .welcome-text {
    h2 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }
    p {
      color: #6c757d;
      font-size: 0.95rem;
      margin: 5px 0 0 0;
    }
  }
`;

const BadgeRole = styled.div`
  background: #e9ecef;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #495057;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;

  @media (min-width: 1024px) {
    .span-2 {
      grid-column: span 2;
    }
  }
`;

const Panel = styled.div`
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #edf2f9;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
`;

const PanelHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid #edf2f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fbfbfc;

  .title {
    font-weight: 600;
    color: #2c3e50;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.05rem;
  }
`;

const ActionLink = styled.button`
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;

  &:hover {
    color: #0056b3;
    text-decoration: underline;
  }
`;

// --- TABELA ---
const TableContainer = styled.div`
  padding: 10px 24px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px 0;
    border-bottom: 2px solid #edf2f9;
    color: #6c757d;
    font-size: 0.85rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  td {
    padding: 15px 0;
    border-bottom: 1px solid #edf2f9;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background-color: #f8fafc;
  }

  .align-right { text-align: right; }
  .text-center { text-align: center; padding: 20px; }
  .text-muted { color: #999; font-style: italic; }

  .title-text {
    color: #2c3e50;
    font-size: 0.95rem;
    display: block;
  }

  .subtitle-text {
    font-size: 0.8rem;
    color: #6c757d;
    margin-top: 4px;
  }

  .seller-cell {
    font-size: 0.85rem;
    color: #495057;
    i { color: #722ed1; }
  }

  .value-cell {
    font-weight: 700;
    color: #007bff;
    font-size: 1rem;
  }
`;

const CampanhaBadge = styled.span`
  background: #e9ecef;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #495057;
`;

// --- GRÁFICOS ---
const ChartWrapper = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .chart-container {
    width: 100%;
    height: 200px;
  }
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-top: 15px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #495057;
  font-weight: 600;

  .color-box {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
`;

// --- ATALHOS ---
const QuickActionsWrapper = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ShortcutButton = styled.button`
  width: 100%;
  padding: 14px 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;

  i {
    width: 20px;
    text-align: center;
    font-size: 1.1rem;
  }

  .text-blue { color: #007bff; }
  .text-yellow { color: #faad14; }
  .text-purple { color: #722ed1; }

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
`;

const DashboardButton = styled(ShortcutButton)`
  background: #f6ffed;
  border-color: #b7eb8f;
  color: #135200;

  .text-green { color: #52c41a; }

  &:hover {
    background: #e6f7ff;
    border-color: #91d5ff;
    color: #0050b3;
    
    .text-green { color: #1890ff; }
  }
`;