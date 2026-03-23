// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';
import { CardInfo } from '../componentes/CardInfo.jsx';

export function Home() {
  const [contatos, setContatos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => {
    async function carregarDashboard() {
      setCarregando(true);
      try {
        // Busca Contatos, Etapas do Funil e Oportunidades (Cartões) tudo de uma vez
        const [resContatos, resEtapas, resOportunidades] = await Promise.all([
          axios.get(`${API_URL}/contatos`, getHeaders()),
          axios.get(`${API_URL}/etapas`, getHeaders()),
          axios.get(`${API_URL}/oportunidades`, getHeaders())
        ]);
        
        setContatos(resContatos.data);
        setEtapas(resEtapas.data);
        setOportunidades(resOportunidades.data);
      } catch (erro) {
        console.error('Erro ao buscar dados do dashboard:', erro);
      } finally {
        setCarregando(false);
      }
    }

    carregarDashboard();
  }, []);

  // === CALCULANDO OS DADOS REAIS DO BANCO ===
  
  // 1. Total de Contatos e Tabela
  const totalContatos = contatos.length;
  const ultimosContatos = [...contatos].reverse().slice(0, 4); 
  
  // 2. Total de Negócios (Soma a quantidade de cartões)
  const negociosAbertos = oportunidades.length; 
  
  // 3. Valor Total em Propostas (Soma o valor em R$ de todos os cartões)
  const somaValores = oportunidades.reduce((acumulador, op) => acumulador + Number(op.valor || 0), 0);
  const valorFormatado = somaValores.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 4. Calculando a Saúde do Funil Dinamicamente
  const paletaDeCores = ['#1890ff', '#722ed1', '#faad14', '#52c41a', '#eb2f96', '#13c2c2'];
  
  const resumoFunil = etapas.map((etapa, index) => {
    // Quantos cartões estão nesta etapa específica?
    const quantidadeNaEtapa = oportunidades.filter(op => op.etapa_id === etapa.id).length;
    
    // Calcula a porcentagem para a barrinha não passar de 100%
    const porcentagem = negociosAbertos === 0 ? 0 : Math.round((quantidadeNaEtapa / negociosAbertos) * 100);
    
    return {
      etapa: etapa.nome,
      quantidade: quantidadeNaEtapa,
      cor: paletaDeCores[index % paletaDeCores.length], // Pega uma cor diferente para cada coluna
      porcentagem: `${porcentagem}%`
    };
  });

  return (
    <div>
      <Header titulo="Dashboard Geral" />

      <div className="page-container">
        
        {/* === TOP CARDS DINÂMICOS === */}
        <div className="card-info-grid">
          <CardInfo icone="fa-users" label="Total de Pessoas" valor={carregando ? "..." : totalContatos} cor="blue" />
          <CardInfo icone="fa-folder-open" label="Negócios no Funil" valor={carregando ? "..." : negociosAbertos} cor="yellow" />
          <CardInfo icone="fa-handshake" label="Valor em Pipeline" valor={carregando ? "..." : valorFormatado} cor="green" />
        </div>

        {/* === ÁREA CENTRAL DIVIDIDA (GRID) === */}
        <div className="dashboard-grid">
          
          {/* LADO ESQUERDO: Tabela de Últimos Contatos */}
          <div className="panel">
            <div className="panel-title">
              <i className="fa-solid fa-clock-rotate-left" style={{color: '#007bff'}}></i> 
              Últimos Contatos Cadastrados
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Empresa / Prefeitura</th>
                    <th>Telefone</th>
                    <th>Cargo</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Carregando dados do servidor...</td></tr>
                  ) : ultimosContatos.length === 0 ? (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Nenhum contato cadastrado.</td></tr>
                  ) : (
                    ultimosContatos.map(contato => (
                      <tr key={contato.id}>
                        <td style={{fontWeight: 600, color: '#1c1e21'}}>{contato.nome}</td>
                        <td style={{color: '#555'}}>
                          {contato.empresa_nome ? (
                            <><i className="fa-solid fa-building" style={{color: '#888', marginRight:'5px'}}></i> {contato.empresa_nome}</>
                          ) : (
                            <span style={{color: '#aaa', fontStyle: 'italic'}}>Sem vínculo</span>
                          )}
                        </td>
                        <td style={{fontWeight: 500}}>{contato.telefones || '-'}</td>
                        <td><span className={`badge ${contato.cargo || 'default'}`}>{contato.cargo || '-'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LADO DIREITO: Funil e Ações Rápidas */}
          <div className="sidebar-panels">
            <div className="panel" style={{marginBottom: '20px'}}>
              <div className="panel-title">
                <i className="fa-solid fa-filter" style={{color: '#faad14'}}></i> Saúde do Funil
              </div>
              <div className="funnel-container">
                {carregando ? (
                  <div style={{textAlign: 'center', padding: '10px', color: '#888'}}>Calculando...</div>
                ) : resumoFunil.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '10px', color: '#888'}}>Nenhum funil configurado.</div>
                ) : (
                  resumoFunil.map((item, index) => (
                    <div className="funnel-stage" key={index}>
                      {/* Oculta textos muito longos com reticências para não quebrar o layout */}
                      <div className="funnel-info" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={item.etapa}>
                        {item.etapa}
                      </div>
                      <div className="funnel-bar-container">
                        <div className="funnel-bar" style={{ width: item.porcentagem, backgroundColor: item.cor }}></div>
                      </div>
                      <div className="funnel-count" title={`${item.porcentagem} dos negócios`}>
                        {item.quantidade}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fica de lição de casa depois conectar esses botões com o useNavigate para abrir as telas certas! */}
            <div className="panel">
              <div className="panel-title">
                <i className="fa-solid fa-bolt" style={{color: '#52c41a'}}></i> Ações Rápidas
              </div>
              <button className="quick-action-btn"><i className="fa-solid fa-user-plus" style={{color: '#007bff'}}></i> Cadastrar Novo Contato</button>
              <button className="quick-action-btn"><i className="fa-solid fa-bullseye" style={{color: '#faad14'}}></i> Criar Oportunidade</button>
              <button className="quick-action-btn"><i className="fa-solid fa-building" style={{color: '#722ed1'}}></i> Nova Empresa/Prefeitura</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}