// src/pages/Funil.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Funil() {
  const [etapas, setEtapas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Campos do Formulário
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [contatoId, setContatoId] = useState('');
  const [etapaId, setEtapaId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

  useEffect(() => {
    carregarQuadro();
  }, []);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarQuadro() {
    setCarregando(true);
    try {
      const [resEtapas, resOportunidades, resEmpresas, resContatos] = await Promise.all([
        axios.get(`${API_URL}/etapas`, getHeaders()),
        axios.get(`${API_URL}/oportunidades`, getHeaders()),
        axios.get(`${API_URL}/empresas`, getHeaders()),
        axios.get(`${API_URL}/contatos`, getHeaders())
      ]);
      setEtapas(resEtapas.data);
      setOportunidades(resOportunidades.data);
      setEmpresas(resEmpresas.data);
      setContatos(resContatos.data);
    } catch (erro) {
      console.error('Erro ao carregar funil:', erro);
    } finally {
      setCarregando(false);
    }
  }

  // === CONTROLE DO MODAL ===
  function abrirModalNovo() {
    setEditandoId(null);
    setTitulo('');
    setValor('');
    setEmpresaId('');
    setContatoId('');
    setObservacoes('');
    setEtapaId(etapas.length > 0 ? etapas[0].id : ''); 
    setMostrarModal(true);
  }

  function abrirModalEdicao(op) {
    setEditandoId(op.id);
    setTitulo(op.titulo);
    setValor(op.valor);
    setEmpresaId(op.empresa_id || '');
    setContatoId(op.contato_id || '');
    setEtapaId(op.etapa_id);
    setObservacoes(op.observacoes || '');
    setMostrarModal(true);
  }

  function fecharModal() {
    setMostrarModal(false);
  }

  function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function salvarOportunidade(e) {
    e.preventDefault();
    const valorNumerico = valor.toString().replace(/\./g, '').replace(',', '.');

    const dados = {
      titulo, valor: valorNumerico || 0, empresa_id: empresaId || null, 
      contato_id: contatoId || null, etapa_id: etapaId, observacoes
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/oportunidades/${editandoId}`, dados, getHeaders());
      } else {
        await axios.post(`${API_URL}/oportunidades`, dados, getHeaders());
      }
      fecharModal();
      carregarQuadro();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao salvar oportunidade.');
    }
  }

  async function deletarOportunidade() {
    if(!window.confirm('Excluir este negócio?')) return;
    try {
      await axios.delete(`${API_URL}/oportunidades/${editandoId}`, getHeaders());
      fecharModal();
      carregarQuadro();
    } catch (error) {
      console.error(error);
    }
  }

  // === LÓGICA DE DRAG AND DROP (ARRASTAR E SOLTAR) ===
  
  // 1. Quando começa a arrastar o cartão
  function onDragStart(e, idDoCartao) {
    e.dataTransfer.setData('card_id', idDoCartao.toString());
  }

  // 2. Quando solta o cartão na nova coluna
  async function onDrop(e, idDaNovaEtapa) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('card_id');
    if (!cardId) return;

    // Acha o cartão que estamos movendo
    const oportunidade = oportunidades.find(op => op.id === parseInt(cardId));
    
    // Se soltou na mesma coluna, não faz nada
    if (!oportunidade || oportunidade.etapa_id === idDaNovaEtapa) return; 

    // Atualiza a tela imediatamente (Otimista) para não dar "soquinho" visual
    const oportunidadesAtualizadas = oportunidades.map(op => {
      if (op.id === parseInt(cardId)) {
        return { ...op, etapa_id: idDaNovaEtapa };
      }
      return op;
    });
    setOportunidades(oportunidadesAtualizadas);

    try {
      // Salva no banco de dados
      await axios.put(`${API_URL}/oportunidades/${cardId}`, {
        ...oportunidade,
        etapa_id: idDaNovaEtapa
      }, getHeaders());
    } catch (error) {
      console.error('Erro ao mover cartão', error);
      alert('Erro ao mover o cartão no servidor.');
      carregarQuadro(); // Se der erro, recarrega a tela para voltar ao original
    }
  }

  return (
    <div>
      <Header titulo="Funil de Vendas" />

      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#333' }}>Pipeline B2B / Governo</h2>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Arraste os cartões entre as colunas ou clique para editar.</p>
          </div>
          
          <button 
            onClick={abrirModalNovo} 
            style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <i className="fa-solid fa-plus-circle"></i>  Nova Oportunidade
          </button>
        </div>

        {/* === MODAL FLUTUANTE === */}
        {mostrarModal && (
          <div className="modal-overlay" onClick={fecharModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ color: '#333' }}>{editandoId ? 'Editar Negócio' : 'Criar Novo Negócio'}</h3>
                <button onClick={fecharModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}>&times;</button>
              </div>
              
              <form onSubmit={salvarOportunidade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Título da Negociação *</label>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Valor Estimado (R$)</label>
                  <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Etapa do Funil</label>
                  <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    {etapas.map(etp => <option key={etp.id} value={etp.id}>{etp.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Empresa / Prefeitura Alvo</label>
                  <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="">-- Nenhuma --</option>
                    {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Contato Principal</label>
                  <select value={contatoId} onChange={(e) => setContatoId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="">-- Nenhum --</option>
                    {contatos.map(cont => <option key={cont.id} value={cont.id}>{cont.nome}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#555', fontSize: '0.9rem' }}>Informações / Observações</label>
                  <textarea 
                    value={observacoes} 
                    onChange={(e) => setObservacoes(e.target.value)} 
                    rows="4" 
                    placeholder="Digite aqui o resumo das reuniões, o que falta enviar, etc..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} 
                  />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  {editandoId ? (
                    <button type="button" onClick={deletarOportunidade} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i> Excluir</button>
                  ) : <div></div>}
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={fecharModal} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* === O QUADRO KANBAN === */}
        {carregando ? (
          <div style={{textAlign: 'center', padding: '50px'}}>Carregando seu Funil de Vendas...</div>
        ) : (
          <div className="kanban-board">
            
            {etapas.map((etapa, indexEtapa) => {
              const cardsDestaColuna = oportunidades.filter(op => op.etapa_id === etapa.id);
              
              return (
                <div 
                  key={etapa.id} 
                  className="kanban-column"
                  onDragOver={(e) => e.preventDefault()} /* ESSA LINHA É OBRIGATÓRIA PARA SOLTAR FUNCIONAR */
                  onDrop={(e) => onDrop(e, etapa.id)}
                >
                  <div className="kanban-column-header">
                    <span className="kanban-column-title">{etapa.nome}</span>
                    <span className="kanban-column-badge">{cardsDestaColuna.length}</span>
                  </div>

                  {cardsDestaColuna.map(op => (
                    <div 
                      key={op.id} 
                      className={`kanban-card ${indexEtapa > 3 ? 'quente' : indexEtapa > 1 ? 'morno' : 'frio'}`}
                      draggable="true" 
                      onDragStart={(e) => onDragStart(e, op.id)}
                      onClick={() => abrirModalEdicao(op)}
                      title="Clique para editar ou arraste para mover"
                    >
                      <div className="kanban-card-title">{op.titulo}</div>
                      <div className="kanban-card-value">{formatarMoeda(op.valor)}</div>
                      
                      {op.empresa_nome && (
                        <div className="kanban-card-info">
                          <i className="fa-solid fa-building"></i> {op.empresa_nome}
                        </div>
                      )}
                      
                      {op.contato_nome && (
                        <div className="kanban-card-info">
                          <i className="fa-solid fa-user"></i> {op.contato_nome}
                        </div>
                      )}

                      {op.observacoes && (
                        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                          <i className="fa-solid fa-align-left"></i> Contém anotações
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {cardsDestaColuna.length === 0 && (
                    <div style={{textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '0.85rem', border: '1px dashed #ddd', borderRadius: '8px'}}>
                      Solte um negócio aqui
                    </div>
                  )}
                  
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  );
}