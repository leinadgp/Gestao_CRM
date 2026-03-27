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
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Múltiplos Cargos Alvo
  const [cargosAlvo, setCargosAlvo] = useState([]);
  const listaCargosDisponiveis = ['Prefeito', 'Secretário', 'Licita', 'CI-R', 'CI-E'];

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

  useEffect(() => { 
    carregarCampanhas(); 
  }, []);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      const campanhasComModulos = await Promise.all(res.data.map(async (camp) => {
        const resMods = await axios.get(`${API_URL}/campanhas/${camp.id}/modulos`, getHeaders());
        return { ...camp, listaModulos: resMods.data };
      }));
      setCampanhas(campanhasComModulos);
    } catch (erro) { 
      console.error('Erro ao buscar campanhas', erro); 
    }
  }

  function formatarMoeda(valor) { 
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
  }

  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setDescricao('');
    setDataInicio(''); setDataFim(''); setCargosAlvo([]);
    setEtapas(['Contato Feito', 'Reunião Agendada', 'Proposta Enviada', 'Em Negociação']);
    setModulos([]); setMostrarModal(true);
  }

  function abrirModalEdicao(camp) {
    setEditandoId(camp.id); 
    setNome(camp.nome); 
    setDescricao(camp.descricao || '');
    setDataInicio(camp.data_inicio ? camp.data_inicio.split('T')[0] : '');
    setDataFim(camp.data_fim ? camp.data_fim.split('T')[0] : '');
    
    let cargosSalvos = [];
    try {
      if (camp.cargos_alvo) cargosSalvos = typeof camp.cargos_alvo === 'string' ? JSON.parse(camp.cargos_alvo) : camp.cargos_alvo;
    } catch(e) {}
    setCargosAlvo(cargosSalvos || []);
    
    const modsFormatados = (camp.listaModulos || []).map(m => ({
      id: m.id, nome: m.nome, valor: m.valor,
      data_inicio_vendas: m.data_inicio_vendas ? m.data_inicio_vendas.split('T')[0] : '',
      data_fim_vendas: m.data_fim_vendas ? m.data_fim_vendas.split('T')[0] : '',
      data_evento: m.data_evento ? m.data_evento.split('T')[0] : ''
    }));
    setModulos(modsFormatados); setMostrarModal(true);
  }

  function toggleCargo(cargo) {
    setCargosAlvo(prev => prev.includes(cargo) ? prev.filter(c => c !== cargo) : [...prev, cargo]);
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
  function atualizarModuloNaLista(index, campo, valorCampo) {
    const novos = [...modulos];
    novos[index][campo] = campo === 'valor' ? (parseFloat(valorCampo) || 0) : valorCampo;
    setModulos(novos);
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    if (!editandoId && etapas.length === 0) return alert('Adicione pelo menos uma etapa para o funil.');
    
    const payload = { nome, descricao, data_inicio: dataInicio || null, data_fim: dataFim || null, cargos_alvo: cargosAlvo, modulos };
    
    try {
      if (editandoId) { await axios.put(`${API_URL}/campanhas/${editandoId}`, payload, getHeaders()); } 
      else { await axios.post(`${API_URL}/campanhas`, { ...payload, etapas }, getHeaders()); }
      setMostrarModal(false); carregarCampanhas();
    } catch (erro) { alert('Erro ao salvar campanha.'); }
  }

  async function deletarCampanha(id) {
    if(!window.confirm('Excluir esta Campanha/Curso?')) return;
    try { await axios.delete(`${API_URL}/campanhas/${id}`, getHeaders()); carregarCampanhas(); } 
    catch (error) { console.error(error); }
  }

  // ROTA MÁGICA DE INICIAR (Injeção de Leads)
  async function iniciarCampanha(campanha) {
    if (!window.confirm(`🚀 Deseja iniciar a automação para "${campanha.nome}"?\nIsso vai injetar os leads selecionados no Kanban e na fila de e-mails.`)) return;
    try {
      const res = await axios.post(`${API_URL}/campanhas/${campanha.id}/iniciar`, {}, getHeaders());
      alert(`✅ ${res.data.mensagem}`);
      carregarCampanhas();
    } catch (erro) {
      alert(erro.response?.data?.erro || 'Erro ao iniciar a automação.');
    }
  }

  // === NOVO: BOTÃO DE PAUSAR / RETOMAR ===
  async function alternarStatusMotor(campanha) {
    const novoStatus = campanha.status_motor === 'rodando' ? 'pausado' : 'rodando';
    const acao = novoStatus === 'pausado' ? 'PAUSAR' : 'RETOMAR';

    if (!window.confirm(`Deseja ${acao} os disparos automáticos de e-mail para a campanha "${campanha.nome}"?`)) return;

    try {
      await axios.put(`${API_URL}/campanhas/${campanha.id}/status-motor`, { status_motor: novoStatus }, getHeaders());
      carregarCampanhas();
    } catch (erro) {
      alert('Erro ao alterar status do motor.');
    }
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
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>Configure os cursos, público alvo e módulos.</p>
          </div>
          <button onClick={abrirModalNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Novo Curso
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {campanhas.map(camp => (
            <div 
              key={camp.id} className="panel" 
              style={{ padding: '20px', position: 'relative', border: camp.status_motor === 'rodando' ? '2px solid #28a745' : camp.status_motor === 'pausado' ? '2px solid #ffc107' : '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}><i className="fa-solid fa-graduation-cap"></i> {camp.nome}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => abrirModalEdicao(camp)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', padding: '5px', fontSize: '1.2rem' }} title="Editar">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button onClick={() => deletarCampanha(camp.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px', fontSize: '1.2rem' }} title="Excluir">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <p style={{ color: '#555', fontSize: '0.9rem', minHeight: '40px' }}>{camp.descricao || 'Sem descrição definida.'}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#f4f6f8', padding: '8px', borderRadius: '4px', marginTop: '10px' }}>
                <div><i className="fa-solid fa-play" style={{ color: '#28a745' }}></i> Início: {formatarDataBR(camp.data_inicio)}</div>
                <div><i className="fa-solid fa-stop" style={{ color: '#dc3545' }}></i> Fim: {formatarDataBR(camp.data_fim)}</div>
              </div>

              {/* BOTÕES DE CONTROLE DO MOTOR DE DISPAROS */}
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                {camp.status_motor === 'rodando' ? (
                  <>
                    <div style={{ flex: 1, padding: '10px', background: '#e6f4ea', color: '#155724', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #c3e6cb' }}>
                      <i className="fa-solid fa-check-circle"></i> Automação Ativa
                    </div>
                    <button onClick={() => alternarStatusMotor(camp)} style={{ padding: '10px 15px', background: '#ffc107', color: '#333', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} title="Pausar Envios">
                      <i className="fa-solid fa-pause"></i>
                    </button>
                  </>
                ) : camp.status_motor === 'pausado' ? (
                   <>
                    <div style={{ flex: 1, padding: '10px', background: '#fff3cd', color: '#856404', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #ffeeba' }}>
                      <i className="fa-solid fa-pause-circle"></i> Automação Pausada
                    </div>
                    <button onClick={() => alternarStatusMotor(camp)} style={{ padding: '10px 15px', background: '#28a745', color: '#fff', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }} title="Retomar Envios">
                      <i className="fa-solid fa-play"></i>
                    </button>
                  </>
                ) : (
                  <button onClick={() => iniciarCampanha(camp)} style={{ width: '100%', padding: '10px', background: '#28a745', color: '#fff', textAlign: 'center', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    <i className="fa-solid fa-rocket"></i> Iniciar Automação
                  </button>
                )}
              </div>

              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.85rem' }}><i className="fa-solid fa-calendar-days"></i> Turmas / Módulos ({camp.listaModulos?.length || 0})</h4>
                {camp.listaModulos?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {camp.listaModulos.map(mod => (
                      <div key={mod.id} style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', borderLeft: '3px solid #28a745', display: 'flex', justifyContent: 'space-between' }}>
                        <div><strong style={{ color: '#333', display: 'block' }}>{mod.nome}</strong></div>
                        <div style={{ fontWeight: 'bold', color: '#28a745' }}>{formatarMoeda(mod.valor)}</div>
                      </div>
                    ))}
                  </div>
                ) : (<span style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>Nenhum módulo.</span>)}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome do Curso/Campanha *</label>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  
                  {/* BARRAGEM & PÚBLICO ALVO */}
                  <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px', border: '1px solid #d0d7de', gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <h4 style={{ margin: '0', color: '#1F4E79' }}><i className="fa-solid fa-users-gear"></i> Automação: Público e Validade</h4>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Quais Cargos receberão a campanha? (Múltipla escolha)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {listaCargosDisponiveis.map(cargo => (
                          <label key={cargo} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: cargosAlvo.includes(cargo) ? '#e7f3ff' : '#fff', border: cargosAlvo.includes(cargo) ? '1px solid #007bff' : '1px solid #ccc', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={cargosAlvo.includes(cargo)} onChange={() => toggleCargo(cargo)} style={{ display: 'none' }} />
                            <span style={{ fontWeight: cargosAlvo.includes(cargo) ? 'bold' : 'normal', color: cargosAlvo.includes(cargo) ? '#007bff' : '#555' }}>{cargo}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#28a745' }}>Data de Início</label>
                      <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#dc3545' }}>Data Limite (Fim da Campanha)</label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2', marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Descrição Breve</label>
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} rows="2"></textarea>
                  </div>
                </div>

                <div style={{ background: '#f4fbf5', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}><i className="fa-solid fa-calendar-days"></i> Gerenciar Módulos e Preços</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px dashed #c3e6cb' }}>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Novo Módulo</label><input type="text" value={modNome} onChange={e => setModNome(e.target.value)} placeholder="Nome" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>Preço</label><input type="number" step="0.01" value={modValor} onChange={e => setModValor(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #007bff' }} /></div>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Data da Aula</label><input type="date" value={modEvento} onChange={e => setModEvento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                    <button type="button" onClick={adicionarModulo} style={{ padding: '9px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', gridColumn: 'span 3' }}>+ ADD MÓDULO</button>
                  </div>
                  {modulos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {modulos.map((mod, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                          <input type="text" value={mod.nome} onChange={e => atualizarModuloNaLista(index, 'nome', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
                          <input type="number" step="0.01" value={mod.valor} onChange={e => atualizarModuloNaLista(index, 'valor', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #007bff', borderRadius: '4px', background: '#e7f3ff' }} />
                          <input type="date" value={mod.data_evento || ''} onChange={e => atualizarModuloNaLista(index, 'data_evento', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
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
                  <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Configurações</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}