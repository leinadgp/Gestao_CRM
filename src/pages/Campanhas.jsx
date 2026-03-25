// src/pages/Campanhas.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  
  const [etapas, setEtapas] = useState(['Contato Feito', 'Reunião Agendada', 'Proposta Enviada', 'Em Negociação']);
  const [novaEtapa, setNovaEtapa] = useState('');

  const [modulos, setModulos] = useState([]);
  const [modNome, setModNome] = useState('');
  const [modInicio, setModInicio] = useState('');
  const [modFim, setModFim] = useState('');
  const [modEvento, setModEvento] = useState('');
  const [modValor, setModValor] = useState(''); 

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => { carregarCampanhas(); }, []);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      const campanhasComModulos = await Promise.all(res.data.map(async (camp) => {
        const resMods = await axios.get(`${API_URL}/campanhas/${camp.id}/modulos`, getHeaders());
        return { ...camp, listaModulos: resMods.data };
      }));
      setCampanhas(campanhasComModulos);
    } catch (erro) { console.error('Erro ao buscar campanhas', erro); }
  }

  function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setDescricao('');
    setEtapas(['Contato Feito', 'Reunião Agendada', 'Proposta Enviada', 'Em Negociação']);
    setModulos([]); setMostrarModal(true);
  }

  function abrirModalEdicao(camp) {
    setEditandoId(camp.id); setNome(camp.nome); setDescricao(camp.descricao || '');
    
    const modsFormatados = (camp.listaModulos || []).map(m => ({
      id: m.id, nome: m.nome, valor: m.valor,
      data_inicio_vendas: m.data_inicio_vendas ? m.data_inicio_vendas.split('T')[0] : '',
      data_fim_vendas: m.data_fim_vendas ? m.data_fim_vendas.split('T')[0] : '',
      data_evento: m.data_evento ? m.data_evento.split('T')[0] : ''
    }));
    setModulos(modsFormatados); setMostrarModal(true);
  }

  function adicionarEtapa() { if (novaEtapa.trim() !== '') { setEtapas([...etapas, novaEtapa]); setNovaEtapa(''); } }
  function removerEtapa(index) { const novas = [...etapas]; novas.splice(index, 1); setEtapas(novas); }

  function adicionarModulo() {
    if (!modNome.trim()) return alert('O nome do módulo é obrigatório.');
    setModulos([...modulos, { 
      nome: modNome, valor: modValor ? parseFloat(modValor) : 0,
      data_inicio_vendas: modInicio || null, data_fim_vendas: modFim || null, data_evento: modEvento || null 
    }]);
    setModNome(''); setModInicio(''); setModFim(''); setModEvento(''); setModValor('');
  }

  function removerModulo(index) { const novos = [...modulos]; novos.splice(index, 1); setModulos(novos); }

  // === NOVO: ATUALIZAR MÓDULO EXISTENTE NA LISTA ===
  function atualizarModuloNaLista(index, campo, valorCampo) {
    const novos = [...modulos];
    novos[index][campo] = campo === 'valor' ? (parseFloat(valorCampo) || 0) : valorCampo;
    setModulos(novos);
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    if (!editandoId && etapas.length === 0) return alert('Adicione pelo menos uma etapa para o funil.');
    try {
      if (editandoId) await axios.put(`${API_URL}/campanhas/${editandoId}`, { nome, descricao, modulos }, getHeaders());
      else await axios.post(`${API_URL}/campanhas`, { nome, descricao, etapas, modulos }, getHeaders());
      setMostrarModal(false); carregarCampanhas();
    } catch (erro) { alert('Erro ao salvar campanha.'); }
  }

  async function deletarCampanha(id) {
    if(!window.confirm('Excluir esta Campanha/Curso?')) return;
    try { await axios.delete(`${API_URL}/campanhas/${id}`, getHeaders()); carregarCampanhas(); } 
    catch (error) { console.error(error); }
  }

  function formatarDataBR(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR');
  }

  return (
    <div>
      <Header titulo="Gestão de Cursos / Campanhas" />

      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>Cursos e Lançamentos</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>Configure os cursos, módulos e preços.</p>
          </div>
          <button onClick={abrirModalNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Novo Curso
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {campanhas.map(camp => (
            <div 
              key={camp.id} className="panel" onClick={() => abrirModalEdicao(camp)} 
              style={{ padding: '20px', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.border = '1px solid #007bff'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}><i className="fa-solid fa-graduation-cap"></i> {camp.nome}</h3>
                <button onClick={(e) => { e.stopPropagation(); deletarCampanha(camp.id); }} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px' }} title="Excluir Curso">
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
              <p style={{ color: '#555', fontSize: '0.9rem', minHeight: '40px' }}>{camp.descricao || 'Sem descrição definida.'}</p>
              
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.85rem' }}><i className="fa-solid fa-calendar-days"></i> Turmas / Módulos ({camp.listaModulos?.length || 0})</h4>
                {camp.listaModulos?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {camp.listaModulos.map(mod => (
                      <div key={mod.id} style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', borderLeft: '3px solid #28a745', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong style={{ color: '#333', display: 'block' }}>{mod.nome}</strong>
                          <div style={{ color: '#666', marginTop: '4px' }}>Aula: {formatarDataBR(mod.data_evento)}</div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#28a745' }}>{formatarMoeda(mod.valor)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>Nenhum módulo cadastrado.</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {mostrarModal && (
          <div className="modal-overlay" onClick={() => setMostrarModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{editandoId ? 'Editar Curso Base' : 'Configurar Novo Curso/Campanha'}</h3>
                <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={salvarCampanha}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome do Curso/Campanha *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Descrição Breve</label>
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} rows="2"></textarea>
                </div>

                <div style={{ background: '#f4fbf5', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}><i className="fa-solid fa-calendar-days"></i> Gerenciar Módulos e Preços</h4>
                  
                  {/* === ADICIONAR NOVO MÓDULO === */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px dashed #c3e6cb' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Novo Módulo</label>
                      <input type="text" value={modNome} onChange={e => setModNome(e.target.value)} placeholder="Nome" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>Preço (R$)</label>
                      <input type="number" step="0.01" value={modValor} onChange={e => setModValor(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #007bff', background: '#e7f3ff' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Início Vendas</label>
                      <input type="date" value={modInicio} onChange={e => setModInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Fim Vendas</label>
                      <input type="date" value={modFim} onChange={e => setModFim(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Data da Aula</label>
                      <input type="date" value={modEvento} onChange={e => setModEvento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                    <button type="button" onClick={adicionarModulo} style={{ padding: '9px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ ADD</button>
                  </div>

                  {/* === LISTA DE MÓDULOS EDITÁVEIS === */}
                  {modulos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Módulos Cadastrados (Edite direto abaixo):</label>
                      {modulos.map((mod, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                          <input type="text" value={mod.nome} onChange={e => atualizarModuloNaLista(index, 'nome', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Nome do Módulo" />
                          <input type="number" step="0.01" value={mod.valor} onChange={e => atualizarModuloNaLista(index, 'valor', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #007bff', borderRadius: '4px', background: '#e7f3ff' }} title="Preço" />
                          <input type="date" value={mod.data_inicio_vendas || ''} onChange={e => atualizarModuloNaLista(index, 'data_inicio_vendas', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Início" />
                          <input type="date" value={mod.data_fim_vendas || ''} onChange={e => atualizarModuloNaLista(index, 'data_fim_vendas', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Fim" />
                          <input type="date" value={mod.data_evento || ''} onChange={e => atualizarModuloNaLista(index, 'data_evento', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Aula" />
                          <button type="button" onClick={() => removerModulo(index)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1.2rem' }}><i className="fa-solid fa-times-circle"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!editandoId && (
                  <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#007bff' }}><i className="fa-solid fa-list-ol"></i> Etapas do Funil</h4>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input type="text" value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); adicionarEtapa(); }}} />
                      <button type="button" onClick={adicionarEtapa} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '6px', cursor: 'pointer' }}>Adicionar</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {etapas.map((etp, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '10px 15px', borderRadius: '6px', border: '1px solid #ddd', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#555' }}><span style={{ color: '#007bff', marginRight: '10px' }}>{index + 1}.</span> {etp}</span>
                          <button type="button" onClick={() => removerEtapa(index)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}><i className="fa-solid fa-times"></i></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', color: '#333' }}>Cancelar</button>
                  <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Curso & Estrutura</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}