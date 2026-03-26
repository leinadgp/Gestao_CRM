// src/pages/Disparos.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

export function Disparos() {
  const API_URL = 'https://server-js-gestao.onrender.com';
  
  const WEBHOOK_TESTE = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/7f271a6b-4135-4126-9a8e-ef7ea3eaba9d';
  const WEBHOOK_INICIAR_CAMPANHA = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/iniciar-campanha';
  const WEBHOOK_CONTROLE_DISPARO = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/controle-disparo';

  const [campanhas, setCampanhas] = useState([]);
  const [configsSalvas, setConfigsSalvas] = useState({});
  const [statusCampanhas, setStatusCampanhas] = useState({}); 

  const [cursoAlvo, setCursoAlvo] = useState('');
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [etapa, setEtapa] = useState('');
  const [tituloemail, setTituloemail] = useState('');
  const [cabecalhoEmail, setCabecalhoEmail] = useState(''); // NOVO CAMPO
  const [emailCru, setEmailCru] = useState('');
  
  
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [modoVisual, setModoVisual] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const preparacaoRef = useRef(null);

  const editorOptions = {
    buttonList: [
      ['undo', 'redo'],
      ['font', 'fontSize', 'formatBlock'],
      ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
      ['fontColor', 'hiliteColor', 'textStyle'],
      ['removeFormat'],
      ['outdent', 'indent'],
      ['align', 'horizontalRule', 'list', 'lineHeight'],
      ['link'],
      ['fullScreen', 'showBlocks', 'codeView']
    ],
    defaultTag: 'p',
    minHeight: '300px'
  };

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => {
    const perfil = localStorage.getItem('perfil');
    if (perfil !== 'admin') {
      alert('🔒 Acesso Negado.');
      window.location.href = '/empresas';
      return;
    }
    carregarCampanhas();
    carregarConfigsSalvas();
  }, []);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      setCampanhas(res.data);
      const statusInicial = {};
      res.data.forEach(c => { statusInicial[c.id] = 'ocioso'; });
      setStatusCampanhas(statusInicial);
    } catch (erro) { console.error('Erro campanhas', erro); }
  }

  async function carregarConfigsSalvas() {
    try {
      const res = await axios.get(`${API_URL}/configuracoes-disparos`, getHeaders());
      const formatoParaEstado = {};
      res.data.forEach(conf => {
        formatoParaEstado[conf.campanha_id] = {
          cargoAlvo: conf.cargo_alvo, 
          etapa: conf.etapa, 
          tituloemail: conf.titulo_email, 
          cabecalhoEmail: conf.cabecalho_email, // BUSCA O NOVO CAMPO
          emailCru: conf.html_email
        };
      });
      setConfigsSalvas(formatoParaEstado);
    } catch (erro) { console.error('Erro configs', erro); }
  }

  async function salvarConfiguracaoCampanha(e) {
    e.preventDefault();
    if (!cursoAlvo) return alert("Selecione a Campanha.");
    setSalvandoConfig(true);

    const payload = { 
      campanha_id: cursoAlvo, cargo_alvo: cargoAlvo, etapa, 
      titulo_email: tituloemail, cabecalho_email: cabecalhoEmail, html_email: emailCru 
    };

    try {
      await axios.post(`${API_URL}/configuracoes-disparos`, payload, getHeaders());
      const novasConfigs = { ...configsSalvas, [cursoAlvo]: { cargoAlvo, etapa, tituloemail, cabecalhoEmail, emailCru } };
      setConfigsSalvas(novasConfigs);
      alert('💾 Configuração guardada no banco com sucesso!');
      setCursoAlvo(''); setCargoAlvo(''); setEtapa(''); setTituloemail(''); setCabecalhoEmail(''); setEmailCru('');
    } catch (erro) { alert('❌ Erro ao guardar configuração.'); } 
    finally { setSalvandoConfig(false); }
  }

  function carregarParaEdicao(campanhaId) {
    const config = configsSalvas[campanhaId];
    if (config) {
      setCursoAlvo(campanhaId.toString()); setCargoAlvo(config.cargoAlvo || ''); setEtapa(config.etapa || '');
      setTituloemail(config.tituloemail || ''); setCabecalhoEmail(config.cabecalhoEmail || ''); setEmailCru(config.emailCru || '');
      if (preparacaoRef.current) preparacaoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function handleEnviarTeste() {
    if (!emailCru || !tituloemail) return alert("Preencha o E-mail e o Título.");
    setEnviandoTeste(true);
    try {
      await fetch(WEBHOOK_TESTE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailCru, tituloemail, cabecalhoEmail, etapa, curso: cursoAlvo })
      });
      alert('✅ E-mail de teste processado!');
    } catch (error) { alert('❌ Erro no teste.'); } 
    finally { setEnviandoTeste(false); }
  }

  async function iniciarDisparo(campanha) {
    const config = configsSalvas[campanha.id];
    if (!config || !config.cargoAlvo || !config.emailCru || !config.tituloemail) {
      return alert(`⚠️ A campanha não possui configuração salva.`);
    }
    if (!window.confirm(`🚀 INICIAR CAMPANHA OFICIAL?\n\nCampanha: ${campanha.nome}\nAlvo: ${config.cargoAlvo}`)) return;

    const payload = { 
      html: config.emailCru, titulo: config.tituloemail, cabecalho_email: config.cabecalhoEmail,
      campanha_alvo: campanha.nome, cargo_alvo: config.cargoAlvo, etapa: config.etapa 
    };

    try {
      const res = await fetch(WEBHOOK_INICIAR_CAMPANHA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setStatusCampanhas(prev => ({ ...prev, [campanha.id]: 'rodando' })); alert(`✅ Campanha INICIADA!`); }
    } catch (error) { alert('❌ Erro no disparo.'); }
  }

  async function alterarStatusMotor(campanha, novoStatus) {
    const acao = novoStatus === "true" ? "RETOMAR" : "PAUSAR";
    if (!window.confirm(`Deseja ${acao} os disparos da campanha "${campanha.nome}"?`)) return;
    try {
      const res = await fetch(WEBHOOK_CONTROLE_DISPARO, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanha_nome: campanha.nome, status_disparo: novoStatus })
      });
      if (res.ok) { setStatusCampanhas(prev => ({ ...prev, [campanha.id]: novoStatus === "true" ? 'rodando' : 'pausado' })); }
    } catch (error) { alert(`❌ Erro no SMTP.`); }
  }

  return (
    <div>
      <Header titulo="Central de Disparos Múltiplos" />
      <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* PREPARAÇÃO */}
        <div ref={preparacaoRef} className="panel" style={{ borderTop: '5px solid #6f42c1', padding: '30px', marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}><h2 style={{ margin: 0, color: '#333' }}>1. Área de Preparação</h2></div>

          <form onSubmit={salvarConfiguracaoCampanha}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: '#f4f7f6', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Curso Alvo *</label>
                <select required value={cursoAlvo} onChange={e => setCursoAlvo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="">Selecione...</option>
                  {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Cargo Alvo *</label>
                <select required value={cargoAlvo} onChange={e => setCargoAlvo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="">Selecione...</option><option value="Prefeito">Prefeito</option><option value="Secretário">Secretário</option><option value="Licita">Licita</option><option value="CI-R">CI-R</option><option value="CI-E">CI-E</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Etapa</label>
                <select value={etapa} onChange={e => setEtapa(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="">Selecione...</option><option value="1">1º E-mail</option><option value="2">2º E-mail</option><option value="3">3º E-mail</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Assunto do E-mail *</label>
                <input type="text" required value={tituloemail} onChange={e => setTituloemail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
            </div>

            {/* NOVO CAMPO DE CABEÇALHO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px', color: '#1F4E79' }}>
                 <i className="fa-solid fa-window-maximize"></i> Texto da Faixa Azul Superior (Opcional)
              </label>
              <input 
                type="text" 
                value={cabecalhoEmail} 
                onChange={e => setCabecalhoEmail(e.target.value)} 
                placeholder="Ex: Não seguimos tendências genéricas. Queremos realizar capacitações que resolvam problemas reais." 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #1F4E79', backgroundColor: '#eef4fa' }} 
              />
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>Se deixar em branco, o e-mail não terá a faixa azul no topo.</small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Conteúdo do E-mail (Miolo) *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setMostrarPreview(true)} style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}><i className="fa-solid fa-eye"></i> Pré-visualizar</button>
                  <button type="button" onClick={() => setModoVisual(!modoVisual)} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}><i className="fa-solid fa-code"></i> {modoVisual ? 'Modo HTML Cru' : 'Modo Visual (Editor)'}</button>
                </div>
              </div>
              {modoVisual ? (
                <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <SunEditor setOptions={editorOptions} setContents={emailCru} onChange={setEmailCru} />
                </div>
              ) : (
                <textarea required value={emailCru} onChange={e => setEmailCru(e.target.value)} style={{ width: '100%', minHeight: '300px', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'monospace', backgroundColor: '#2d2d2d', color: '#f8f8f2' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button type="button" onClick={handleEnviarTeste} disabled={enviandoTeste} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-paper-plane"></i> Disparo de Teste</button>
              <button type="submit" disabled={salvandoConfig} style={{ background: '#6f42c1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-cloud-arrow-up"></i> Salvar no Banco e Engatilhar</button>
            </div>
          </form>
        </div>

        {/* CONTROLE */}
        <div className="panel" style={{ borderTop: '5px solid #007bff', padding: '30px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>2. Painel de Controle de Disparos</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {campanhas.map(campanha => {
              const status = statusCampanhas[campanha.id] || 'ocioso';
              const config = configsSalvas[campanha.id];
              return (
                <div key={campanha.id} style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd', borderLeft: `5px solid ${status === 'rodando' ? '#28a745' : status === 'pausado' ? '#ffc107' : '#6c757d'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: config ? '1px dashed #ccc' : 'none', paddingBottom: config ? '15px' : '0', marginBottom: config ? '15px' : '0' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.2rem' }}>{campanha.nome}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Status: <strong style={{ color: status === 'rodando' ? '#28a745' : status === 'pausado' ? '#ffc107' : '#6c757d' }}>{status === 'rodando' ? '🟢 RODANDO' : status === 'pausado' ? '🟡 PAUSADO' : '⚪ AGUARDANDO'}</strong></div>
                    </div>
                    {config && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {status === 'ocioso' && <button onClick={() => iniciarDisparo(campanha)} style={{ padding: '8px 15px', background: '#007bff', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Iniciar Disparos</button>}
                        {status === 'rodando' && <button onClick={() => alterarStatusMotor(campanha, "false")} style={{ padding: '8px 15px', background: '#ffc107', color: '#333', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Pausar</button>}
                        {status === 'pausado' && <button onClick={() => alterarStatusMotor(campanha, "true")} style={{ padding: '8px 15px', background: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retomar</button>}
                      </div>
                    )}
                  </div>
                  {config && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '5px' }}>🎯 Alvo: {config.cargoAlvo} | 📌 {config.etapa}º E-mail</div>
                        <div style={{ fontSize: '0.95rem', color: '#333', fontWeight: '500' }}>Assunto: {config.tituloemail}</div>
                      </div>
                      <button onClick={() => carregarParaEdicao(campanha.id)} style={{ background: 'none', border: '1px solid #6f42c1', color: '#6f42c1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Editar Banco</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL PREVIEW */}
        {mostrarPreview && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarPreview(false)}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, color: '#333' }}>Visualização do E-mail</h3><button onClick={() => setMostrarPreview(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button></div>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: '15px', marginBottom: '20px' }}><strong>Assunto:</strong> {tituloemail}</div>
                
                {/* PREVIEW SIMULANDO O N8N */}
                <div style={{ backgroundColor: '#f4f6f8', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                  <table width="600" style={{ backgroundColor: '#ffffff', fontFamily: 'Arial,sans-serif', fontSize: '14px', color: '#1F4E79' }}>
                    <tbody>
                      {cabecalhoEmail.trim() !== "" && (
                        <tr><td style={{ backgroundColor: '#1F4E79', color: '#ffffff', padding: '16px 20px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>{cabecalhoEmail}</td></tr>
                      )}
                      <tr><td style={{ padding: '30px', lineHeight: '1.6', textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: emailCru }} /></tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}