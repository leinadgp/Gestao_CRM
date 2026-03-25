// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // NOVO: Para fazer os botões navegarem
import { Header } from '../componentes/Header.jsx';
import { CardInfo } from '../componentes/CardInfo.jsx';

export function Home() {
  const navigate = useNavigate(); // Inicializa o navegador

  const [contatos, setContatos] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Saudação dinâmica baseada na hora do dia
  const horaAtual = new Date().getHours();
  let saudacao = 'Boa noite';
  if (horaAtual >= 5 && horaAtual < 12) saudacao = 'Bom dia';
  else if (horaAtual >= 12 && horaAtual < 18) saudacao = 'Boa tarde';

  const nomeUsuario = localStorage.getItem('nome') || 'Gestor';

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

  // === CÁLCULOS DOS CARDS ===
  const totalContatos = contatos.length;
  const campanhasAtivas = campanhas.length;
  
  const negociosAbertos = oportunidades.filter(op => op.status === 'aberto');
  const negociosGanhos = oportunidades.filter(op => op.status === 'ganho');

  const valorGanho = negociosGanhos.reduce((acc, op) => acc + Number(op.valor || 0), 0);

  // Pega os 5 negócios abertos mais recentes
  const ultimosNegocios = [...negociosAbertos].slice(0, 5);

  return (
    <div>
      <Header titulo="Centro de Comando" />

      <div className="page-container">
        
        {/* === BOAS VINDAS === */}
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>{saudacao}, {nomeUsuario}! 👋</h2>
          <p style={{ color: '#777', fontSize: '0.95rem', marginTop: '5px' }}>
            Aqui está o resumo da sua operação hoje. Foco nas prefeituras!
          </p>
        </div>

        {/* === CARDS SUPERIORES === */}
        <div className="card-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <CardInfo icone="fa-folder-open" label="Negócios em Aberto" valor={carregando ? "..." : negociosAbertos.length} cor="blue" />
          <CardInfo icone="fa-check-circle" label="Total Ganho" valor={carregando ? "..." : formatarMoeda(valorGanho)} cor="green" />
          <CardInfo icone="fa-bullhorn" label="Campanhas Ativas" valor={carregando ? "..." : campanhasAtivas} cor="yellow" />
          <CardInfo icone="fa-address-book" label="Total de Contatos" valor={carregando ? "..." : totalContatos} cor="purple" />
        </div>

        {/* === ÁREA CENTRAL DIVIDIDA (GRID) === */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* LADO ESQUERDO: Tabela de Negócios em Aberto */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><i className="fa-solid fa-fire" style={{color: '#ff9800'}}></i> Negócios em Aberto Recentes</div>
              <button onClick={() => navigate('/funil')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>Ver Funil &rarr;</button>
            </div>
            
            <div className="table-responsive" style={{ padding: '10px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#666' }}>
                    <th style={{ padding: '10px 0' }}>Título / Prefeitura</th>
                    <th>Campanha</th>
                    <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr><td colSpan="3" style={{textAlign: 'center', padding: '20px'}}>Carregando dados...</td></tr>
                  ) : ultimosNegocios.length === 0 ? (
                    <tr><td colSpan="3" style={{textAlign: 'center', padding: '20px', color: '#999'}}>Nenhum negócio em aberto no momento.</td></tr>
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

          {/* LADO DIREITO: Painéis Menores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Ações Rápidas (AGORA FUNCIONAM!) */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                <i className="fa-solid fa-bolt" style={{color: '#52c41a'}}></i> Atalhos Rápidos
              </div>
              <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => navigate('/contatos')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                  <i className="fa-solid fa-user-plus" style={{color: '#007bff', width: '25px'}}></i> Gerenciar Contatos
                </button>
                <button onClick={() => navigate('/funil')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                  <i className="fa-solid fa-layer-group" style={{color: '#faad14', width: '25px'}}></i> Ir para o Funil de Vendas
                </button>
                <button onClick={() => navigate('/empresas')} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: '#333', transition: '0.2s' }}>
                  <i className="fa-solid fa-building-columns" style={{color: '#722ed1', width: '25px'}}></i> Base de Prefeituras
                </button>
              </div>
            </div>

            {/* Resumo de Campanhas */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title" style={{ padding: '15px 20px', borderBottom: '1px solid #eee' }}>
                <i className="fa-solid fa-bullhorn" style={{color: '#dc3545'}}></i> Volume por Campanha
              </div>
              <div style={{ padding: '15px' }}>
                {carregando ? (
                  <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>Carregando...</div>
                ) : campanhas.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>Nenhuma campanha criada.</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {campanhas.map(camp => {
                      const qtd = oportunidades.filter(op => op.campanha_id === camp.id && op.status === 'aberto').length;
                      return (
                        <li key={camp.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>
                          <span style={{ color: '#555', fontWeight: 'bold' }}>{camp.nome}</span>
                          <span style={{ background: '#e7f3ff', color: '#007bff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{qtd} abertos</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}