import { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

export function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Controle das abas de visualização
  const [abaAtiva, setAbaAtiva] = useState('ativas'); // 'ativas' ou 'arquivadas'

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [informacaoExtra, setInformacaoExtra] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cargosAlvo, setCargosAlvo] = useState([]);
  const listaCargosDisponiveis = ['Prefeito', 'Secretário', 'Licita', 'CI-R', 'CI-E', 'Teste'];

  const etapasPadrao = ['CONTATO 1° E-MAIL', 'CONTATO TEL.', 'IDENTIFICAÇÃO DO INTERESSE', 'NÃO QUER LIGAÇÃO', 'VENDA REALIZADA', 'PERDIDO'];
  const [etapas, setEtapas] = useState(etapasPadrao);
  const [novaEtapa, setNovaEtapa] = useState('');

  const [modulos, setModulos] = useState([]);
  const [modNome, setModNome] = useState('');
  const [modValor, setModValor] = useState(''); 
  const [modEvento, setModEvento] = useState('');
  const [modEventoFim, setModEventoFim] = useState(''); 

  // Estados para a Trava de Segurança (Exclusão Matemática)
  const [modalExcluir, setModalExcluir] = useState(false);
  const [campanhaExcluir, setCampanhaExcluir] = useState(null);
  const [contaMath, setContaMath] = useState({ a: 0, b: 0, resultado: 0 });
  const [respostaMath, setRespostaMath] = useState('');

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
    } catch (erro) { console.error(erro); }
  }

  function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function abrirModalNovo() {
    setEditandoId(null); 
    setNome(''); 
    setDescricao(''); 
    setInformacaoExtra('');
    setDataInicio(''); 
    setDataFim(''); 
    setCargosAlvo([]);
    setEtapas(etapasPadrao); 
    setModulos([]); 
    setMostrarModal(true);
  }

  function abrirModalEdicao(camp) {
    setEditandoId(camp.id); 
    setNome(camp.nome); 
    setDescricao(camp.descricao || '');
    setInformacaoExtra(camp.informacao_extra || '');
    setDataInicio(camp.data_inicio ? camp.data_inicio.split('T')[0] : '');
    setDataFim(camp.data_fim ? camp.data_fim.split('T')[0] : '');
    
    let cargosSalvos = [];
    try { if (camp.cargos_alvo) cargosSalvos = typeof camp.cargos_alvo === 'string' ? JSON.parse(camp.cargos_alvo) : camp.cargos_alvo; } catch(e) {}
    setCargosAlvo(cargosSalvos || []);
    
    const modsFormatados = (camp.listaModulos || []).map(m => ({
      id: m.id, nome: m.nome, valor: m.valor,
      data_evento: m.data_evento ? m.data_evento.split('T')[0] : '',
      data_evento_fim: m.data_evento_fim ? m.data_evento_fim.split('T')[0] : ''
    }));
    setModulos(modsFormatados); setMostrarModal(true);
  }

  function toggleCargo(cargo) { setCargosAlvo(prev => prev.includes(cargo) ? prev.filter(c => c !== cargo) : [...prev, cargo]); }
  function adicionarEtapa() { if (novaEtapa.trim() !== '') { setEtapas([...etapas, novaEtapa]); setNovaEtapa(''); } }
  function removerEtapa(index) { const novas = [...etapas]; novas.splice(index, 1); setEtapas(novas); }

  function adicionarModulo() {
    if (!modNome.trim()) return alert('O nome do módulo é obrigatório.');
    setModulos([...modulos, { 
      nome: modNome, valor: modValor ? parseFloat(modValor) : 0,
      data_evento: modEvento || null, data_evento_fim: modEventoFim || null 
    }]);
    setModNome(''); setModValor(''); setModEvento(''); setModEventoFim('');
  }

  function removerModulo(index) { const novos = [...modulos]; novos.splice(index, 1); setModulos(novos); }
  function atualizarModulo(index, campo, valorCampo) {
    const novos = [...modulos];
    novos[index][campo] = campo === 'valor' ? (parseFloat(valorCampo) || 0) : valorCampo;
    setModulos(novos);
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    if (!editandoId && etapas.length === 0) return alert('Adicione pelo menos uma etapa para o funil.');
    
    const payload = { 
        nome, 
        descricao, 
        informacao_extra: informacaoExtra, 
        data_inicio: dataInicio || null, 
        data_fim: dataFim || null, 
        cargos_alvo: cargosAlvo, 
        modulos 
    };
    
    try {
      if (editandoId) { 
        await axios.put(`${API_URL}/campanhas/${editandoId}`, payload, getHeaders()); 
      } else { 
        await axios.post(`${API_URL}/campanhas`, { ...payload, etapas }, getHeaders()); 
      }
      setMostrarModal(false); 
      carregarCampanhas();
    } catch (erro) { 
      console.error(erro);
      alert(erro.response?.data?.erro || 'Erro ao salvar configurações da campanha.'); 
    }
  }

  // --- LÓGICA DE ARQUIVAR ---
  async function alternarArquivamento(id, statusAtualArquivado) {
    const acao = statusAtualArquivado ? 'desarquivar' : 'arquivar';
    if (!window.confirm(`Tem certeza que deseja ${acao} este curso?`)) return;

    try {
      await axios.put(`${API_URL}/campanhas/${id}/arquivar`, { arquivada: !statusAtualArquivado }, getHeaders());
      carregarCampanhas();
    } catch (error) {
      alert('Erro ao alterar status de arquivamento.');
    }
  }

  // --- LÓGICA DE EXCLUSÃO COM SEGURANÇA MATEMÁTICA ---
  function iniciarExclusao(camp) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setContaMath({ a, b, resultado: a + b });
    setRespostaMath('');
    setCampanhaExcluir(camp);
    setModalExcluir(true);
  }

  async function processarExclusao(e) {
    e.preventDefault();
    if (parseInt(respostaMath) !== contaMath.resultado) {
      return alert('O cálculo matemático está incorreto. Tente novamente.');
    }

    try { 
      await axios.delete(`${API_URL}/campanhas/${campanhaExcluir.id}`, getHeaders()); 
      setModalExcluir(false);
      carregarCampanhas(); 
      alert('Campanha excluída definitivamente!');
    } catch (error) { 
      console.error(error); 
      alert(error.response?.data?.erro || 'O banco de dados bloqueou a exclusão porque existem clientes atrelados a esta campanha.'); 
    }
  }

  function formatarDataBR(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR');
  }

  const campanhasFiltradas = campanhas.filter(camp => 
    abaAtiva === 'arquivadas' ? camp.arquivada === true : (camp.arquivada === false || camp.arquivada === null)
  );

  return (
    <div>
      <Header titulo="Gestão de Cursos / Campanhas" />
      <div className="page-container">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#333' }}>Cursos e Lançamentos</h2>
            <p style={{ color: '#777', fontSize: '0.9rem', marginTop: '5px' }}>Configure os cursos, público alvo e módulos.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                onClick={() => setAbaAtiva('ativas')} 
                style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', background: abaAtiva === 'ativas' ? '#1F4E79' : '#e9ecef', color: abaAtiva === 'ativas' ? '#fff' : '#666' }}>
                <i className="fa-solid fa-folder-open"></i> Cursos Ativos
              </button>
              <button 
                onClick={() => setAbaAtiva('arquivadas')} 
                style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', background: abaAtiva === 'arquivadas' ? '#6c757d' : '#e9ecef', color: abaAtiva === 'arquivadas' ? '#fff' : '#666' }}>
                <i className="fa-solid fa-box-archive"></i> Arquivados
              </button>
            </div>
          </div>

          <button onClick={abrirModalNovo} style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: 'fit-content' }}>
            <i className="fa-solid fa-plus"></i> Novo Curso
          </button>
        </div>

        {campanhasFiltradas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', borderRadius: '8px', color: '#777' }}>
            Nenhuma campanha encontrada nesta categoria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {campanhasFiltradas.map(camp => (
              <div key={camp.id} className="panel" style={{ padding: '20px', border: '1px solid #ddd', opacity: abaAtiva === 'arquivadas' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: abaAtiva === 'arquivadas' ? '#666' : '#007bff' }}><i className="fa-solid fa-graduation-cap"></i> {camp.nome}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => alternarArquivamento(camp.id, camp.arquivada)} style={{ background: 'none', border: 'none', color: '#6c757d', cursor: 'pointer', padding: '5px', fontSize: '1.2rem' }} title={camp.arquivada ? "Desarquivar" : "Arquivar"}>
                      <i className={`fa-solid ${camp.arquivada ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                    </button>
                    <button onClick={() => abrirModalEdicao(camp)} style={{ background: 'none', border: 'none', color: '#ffc107', cursor: 'pointer', padding: '5px', fontSize: '1.2rem' }} title="Editar"><i className="fa-solid fa-pen-to-square"></i></button>
                    <button onClick={() => iniciarExclusao(camp)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px', fontSize: '1.2rem' }} title="Excluir Definitivamente"><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
                <p style={{ color: '#555', fontSize: '0.9rem', minHeight: '40px', marginBottom: '10px' }}>{camp.descricao || 'Sem descrição definida.'}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#f4f6f8', padding: '8px', borderRadius: '4px', marginTop: '10px' }}>
                  <div><i className="fa-solid fa-play" style={{ color: '#28a745' }}></i> Início: {formatarDataBR(camp.data_inicio)}</div>
                  <div><i className="fa-solid fa-stop" style={{ color: '#dc3545' }}></i> Fim: {formatarDataBR(camp.data_fim)}</div>
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
        )}

        {/* MODAL DE CONTA MATEMÁTICA PARA EXCLUSÃO */}
        {modalExcluir && (
          <div className="modal-overlay" onClick={() => setModalExcluir(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '100%', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '15px' }}></i>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Confirmação de Exclusão</h3>
              <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '20px' }}>
                Você está prestes a excluir o curso <strong>{campanhaExcluir?.nome}</strong> e todas as suas etapas e módulos.<br/>Esta ação não pode ser desfeita.
              </p>
              
              <div style={{ background: '#f8d7da', padding: '15px', borderRadius: '8px', border: '1px solid #f5c6cb', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#721c24', marginBottom: '10px' }}>
                  Para confirmar, resolva o cálculo abaixo:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                  <span>{contaMath.a}</span> + <span>{contaMath.b}</span> = 
                  <input 
                    type="number" 
                    value={respostaMath} 
                    onChange={e => setRespostaMath(e.target.value)} 
                    style={{ width: '80px', padding: '8px', fontSize: '1.2rem', textAlign: 'center', border: '2px solid #ccc', borderRadius: '6px' }} 
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <button onClick={() => setModalExcluir(false)} style={{ flex: 1, padding: '12px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={processarExclusao} style={{ flex: 1, padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Excluir Curso</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PADRÃO DE CRIAÇÃO / EDIÇÃO */}
        {mostrarModal && (
          <div className="modal-overlay" onClick={() => setMostrarModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '30px', borderRadius: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{editandoId ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={salvarCampanha}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome do Curso/Campanha *</label>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  
                  <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '8px', border: '1px solid #d0d7de', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#dc3545' }}>Data Limite (Fim)</label>
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Descrição Breve</label>
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} rows="2"></textarea>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Informação Extra</label>
                    <textarea value={informacaoExtra} onChange={e => setInformacaoExtra(e.target.value)} placeholder="Use este espaço para links, detalhes ou observações..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} rows="3"></textarea>
                  </div>
                </div>

                <div style={{ background: '#f4fbf5', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#28a745' }}><i className="fa-solid fa-calendar-days"></i> Gerenciar Módulos e Preços</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px dashed #c3e6cb' }}>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Novo Módulo</label><input type="text" value={modNome} onChange={e => setModNome(e.target.value)} placeholder="Nome" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>Preço</label><input type="number" step="0.01" value={modValor} onChange={e => setModValor(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #007bff' }} /></div>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Início da Aula</label><input type="date" value={modEvento} onChange={e => setModEvento(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                    <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Fim da Aula</label><input type="date" value={modEventoFim} onChange={e => setModEventoFim(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} /></div>
                    <button type="button" onClick={adicionarModulo} style={{ padding: '9px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ ADD</button>
                  </div>
                  
                  {modulos.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {modulos.map((mod, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                          <input type="text" value={mod.nome} onChange={e => atualizarModulo(index, 'nome', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
                          <input type="number" step="0.01" value={mod.valor} onChange={e => atualizarModulo(index, 'valor', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #007bff', borderRadius: '4px', background: '#e7f3ff' }} />
                          <input type="date" value={mod.data_evento || ''} onChange={e => atualizarModulo(index, 'data_evento', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Data Início" />
                          <input type="date" value={mod.data_evento_fim || ''} onChange={e => atualizarModulo(index, 'data_evento_fim', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} title="Data Fim" />
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