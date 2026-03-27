// src/pages/Disparos.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

export function Disparos() {
  const API_URL = 'https://server-js-gestao.onrender.com';

  const WEBHOOK_TESTE = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/teste-disparo';

  const [campanhas, setCampanhas] = useState([]);
  const [statusCampanhas, setStatusCampanhas] = useState({});
  const [sequenciaAtual, setSequenciaAtual] = useState([]);

  // Estados do Formulário
  const [cursoAlvo, setCursoAlvo] = useState('');
  const [tipoFunil, setTipoFunil] = useState('BROADCAST'); 
  const [ordemEtapa, setOrdemEtapa] = useState('1');
  const [dataDisparo, setDataDisparo] = useState('');
  const [horasEspera, setHorasEspera] = useState('');
  
  const [tituloemail, setTituloemail] = useState('');
  const [cabecalhoEmail, setCabecalhoEmail] = useState('');
  const [emailCru, setEmailCru] = useState('');

  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [modoVisual, setModoVisual] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const preparacaoRef = useRef(null);

  const editorOptions = {
    buttonList: [
      ['undo', 'redo'], ['font', 'fontSize', 'formatBlock'],
      ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
      ['fontColor', 'hiliteColor', 'textStyle'], ['removeFormat'],
      ['outdent', 'indent'], ['align', 'horizontalRule', 'list', 'lineHeight'],
      ['link'], ['fullScreen', 'showBlocks', 'codeView']
    ],
    defaultTag: 'p',
    minHeight: '300px',
    attributesWhitelist: { all: 'style', a: 'href|target|style|class|rel' }
  };

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  function escapeHtml(valor = '') {
    return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function getEmailPadrao() {
    return `<p style="margin:0 0 15px 0;">Prezado(a),</p><p style="margin:0 0 15px 0;">O cotidiano do <strong>Controle Interno Municipal</strong> exige muito mais do que conhecimento teórico. Exige soluções práticas, segurança jurídica e aderência à realidade de cada município.</p>`.trim();
  }

  function montarUrlRastreada({ redirect, descricao, etapaAtual, cursoNome }) {
    const base = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/rastreio2';
    const emailPlaceholder = '{{$json.EmailLimpo}}';
    return `${base}?redirect=${encodeURIComponent(redirect)}&email=${emailPlaceholder}&descricao=${encodeURIComponent(descricao || '')}&etapa=${encodeURIComponent(String(etapaAtual || ''))}&curso=${encodeURIComponent(cursoNome || '')}`;
  }

  function inserirSnippet(snippet) { setEmailCru(prev => `${prev || ''}${snippet}`); }
  function inserirParagrafo() { inserirSnippet(`\n<p style="margin:0 0 15px 0;">Novo parágrafo aqui.</p>\n`); }
  function inserirTituloSecundario() { inserirSnippet(`\n<h2 style="margin:0 0 15px 0;font-size:18px;color:#1F4E79;">Título da seção</h2>\n`); }
  function inserirLinhaSeparadora() { inserirSnippet(`\n<div style="height:1px;background:#e5e5e5;margin:20px 0;"></div>\n`); }

  function inserirBotaoRastreado() {
    const textoBotao = window.prompt('Texto do botão:', 'Selecionar os temas prioritários');
    if (!textoBotao) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique (para o n8n):', 'Link Pesquisa Cursos') || 'Link Pesquisa Cursos';
    const cursoSelecionado = campanhas.find(c => c.id === Number(cursoAlvo));
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: ordemEtapa, cursoNome: cursoSelecionado?.nome || '' });

    inserirSnippet(`
<div style="text-align: center; padding: 10px 20px; margin: 15px 0;">
  <a href="${linkRastreado}" target="_blank" style="display:inline-block; padding:14px 26px; background-color:#218553; color:#ffffff; font-weight:bold; text-decoration:none; font-size:14px; border-radius:6px; border:1px solid #218553;">
    ${textoBotao}
  </a>
</div><p><br></p>`.trim());
  }

  function inserirLinkTextoRastreado() {
    const textoLink = window.prompt('Texto do link:', 'Acessar o site');
    if (!textoLink) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique (para o n8n):', 'link-texto') || 'link-texto';
    const cursoSelecionado = campanhas.find(c => c.id === Number(cursoAlvo));
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: ordemEtapa, cursoNome: cursoSelecionado?.nome || '' });

    inserirSnippet(` <a href="${linkRastreado}" target="_blank" style="color:#1F4E79;text-decoration:underline;font-weight:bold;">${escapeHtml(textoLink)}</a> `);
  }

  function montarHtmlFinal({ titulo = tituloemail, cabecalho = cabecalhoEmail, conteudo = emailCru, etapaEmail = ordemEtapa, cursoNome = '' } = {}) {
    const tituloSeguro = escapeHtml(titulo || 'E-mail');
    const cabecalhoSeguro = escapeHtml(cabecalho || '');
    const conteudoHtml = conteudo || getEmailPadrao();
    const linkSite = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'Link Site', etapaAtual: etapaEmail, cursoNome });
    const linkBot = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'bot', etapaAtual: etapaEmail, cursoNome });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tituloSeguro}</title></head><body style="margin:0;padding:0;background-color:#f4f6f8;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;font-family:Arial,sans-serif;font-size:14px;color:#1F4E79;">${cabecalhoSeguro ? `<tr><td style="background-color:#1F4E79;color:#ffffff;padding:16px 20px;text-align:center;font-weight:bold;font-size:15px;">${cabecalhoSeguro}</td></tr>` : ''}<tr><td style="padding:30px 30px 10px 30px;line-height:1.6;text-align:justify;">${conteudoHtml}</td></tr><tr><td style="padding:10px 24px 25px 24px;color:#1F4E79;"><p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Fico à disposição!</p><p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Atenciosamente,</p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;"><strong>Camila Silveira Guimarães</strong></p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Setor Comercial</p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 3541 3355</p><p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 98443-2097</p><p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;"><a href="${linkSite}" target="_blank" style="color:#1F4E79;text-decoration:none;font-weight:bold;">www.gestao.srv.br</a></p><a href="${linkBot}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:bold;">.</a></td></tr></table></td></tr></table></body></html>`;
  }

  const campanhaSelecionada = useMemo(() => campanhas.find(c => c.id === Number(cursoAlvo)), [campanhas, cursoAlvo]);

  useEffect(() => {
    const perfil = localStorage.getItem('perfil');
    if (perfil !== 'admin') { window.location.href = '/empresas'; return; }
    carregarCampanhas();
  }, []);

  useEffect(() => {
    if (cursoAlvo) { carregarSequencia(cursoAlvo); } 
    else { setSequenciaAtual([]); }
  }, [cursoAlvo]);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      setCampanhas(res.data);
      const statusInicial = {};
      res.data.forEach(c => { statusInicial[c.id] = c.status_motor || 'ocioso'; });
      setStatusCampanhas(statusInicial);
    } catch (erro) { console.error('Erro campanhas', erro); }
  }

  async function carregarSequencia(campanhaId) {
    try {
      const res = await axios.get(`${API_URL}/sequencia-emails/${campanhaId}`, getHeaders());
      setSequenciaAtual(res.data);
    } catch (erro) { console.error('Erro ao buscar sequência', erro); }
  }

  async function salvarCardEmail(e) {
    e.preventDefault();
    if (!cursoAlvo) return alert('Selecione a Campanha.');
    setSalvandoConfig(true);

    const payload = {
      campanha_id: cursoAlvo,
      tipo_funil: tipoFunil,
      ordem_etapa: ordemEtapa,
      data_disparo_exata: tipoFunil === 'BROADCAST' ? dataDisparo : null,
      horas_espera: tipoFunil === 'POS_CLIQUE' ? horasEspera : null,
      cargo_alvo: 'Todos', // Hardcoded invisível
      titulo_email: tituloemail,
      cabecalho_email: cabecalhoEmail,
      html_email: emailCru
    };

    try {
      await axios.post(`${API_URL}/sequencia-emails`, payload, getHeaders());
      alert('💾 E-mail adicionado à sequência com sucesso!');
      carregarSequencia(cursoAlvo);
      setTituloemail(''); setCabecalhoEmail(''); setEmailCru('');
    } catch (erro) { alert('❌ Erro ao guardar e-mail.'); } 
    finally { setSalvandoConfig(false); }
  }

  async function deletarCard(id) {
    if (!window.confirm("Tem certeza que deseja apagar este e-mail da sequência?")) return;
    try {
      await axios.delete(`${API_URL}/sequencia-emails/${id}`, getHeaders());
      carregarSequencia(cursoAlvo);
    } catch (error) { alert("Erro ao deletar e-mail."); }
  }

  function carregarParaEdicao(emailConfig) {
    setTipoFunil(emailConfig.tipo_funil);
    setOrdemEtapa(emailConfig.ordem_etapa);
    setDataDisparo(emailConfig.data_disparo_exata ? emailConfig.data_disparo_exata.split('T')[0] : '');
    setHorasEspera(emailConfig.horas_espera || '');
    setTituloemail(emailConfig.titulo_email || '');
    setCabecalhoEmail(emailConfig.cabecalho_email || '');
    setEmailCru(emailConfig.html_email || '');
    if (preparacaoRef.current) preparacaoRef.current.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleEnviarTeste() {
    if (!tituloemail) return alert('Preencha o assunto do e-mail.');
    setEnviandoTeste(true);
    try {
      const emailCruTeste = emailCru.replace(/\{\{\$json\.EmailLimpo\}\}/g, 'leinadgp@gmail.com');
      await fetch(WEBHOOK_TESTE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailCru: emailCruTeste, cabecalhoEmail, tituloemail, etapa: ordemEtapa, curso: cursoAlvo })
      });
      alert('✅ E-mail de teste enviado para o n8n!');
    } catch (error) { alert('❌ Erro no teste.'); } 
    finally { setEnviandoTeste(false); }
  }

  const broadcasts = sequenciaAtual.filter(e => e.tipo_funil === 'BROADCAST');
  const posCliques = sequenciaAtual.filter(e => e.tipo_funil === 'POS_CLIQUE');

  const htmlPreviewFinal = montarHtmlFinal({ titulo: tituloemail, cabecalho: cabecalhoEmail, conteudo: emailCru, etapaEmail: ordemEtapa, cursoNome: campanhaSelecionada?.nome || '' });

  return (
    <div>
      <Header titulo="Construtor de Funis e Automação" />
      <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>

        <div className="panel" style={{ padding: '20px', marginBottom: '20px', background: '#eef2f5', border: '1px solid #cdd4db', borderRadius: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1F4E79' }}>1. Selecione a Campanha para gerenciar o Funil:</label>
          <select value={cursoAlvo} onChange={e => setCursoAlvo(e.target.value)} style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '6px', border: '1px solid #1F4E79', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <option value="">-- Escolha uma Campanha --</option>
            {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {cursoAlvo && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '5px solid #007bff', border: '1px solid #ddd' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}><i className="fa-solid fa-calendar-days"></i> Funil Broadcast (Frios)</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>E-mails disparados em datas exatas para a base.</p>
              
              {broadcasts.length === 0 && <div style={{ padding: '15px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', color: '#999' }}>Nenhum e-mail agendado.</div>}
              {broadcasts.map(email => (
                <div key={email.id} style={{ background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
                    Etapa {email.ordem_etapa}
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{email.titulo_email}</div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}><i className="fa-regular fa-clock"></i> Disparo: {email.data_disparo_exata ? new Date(email.data_disparo_exata).toLocaleDateString('pt-BR') : 'Sem data'}</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => carregarParaEdicao(email)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => deletarCard(email.id)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#ffeeba', color: '#856404', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fffcf5', padding: '20px', borderRadius: '8px', borderTop: '5px solid #fd7e14', border: '1px solid #f8e1c5' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#fd7e14' }}><i className="fa-solid fa-fire"></i> Funil Pós-Clique (Quentes)</h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>E-mails disparados após o Lead clicar em um link.</p>
              
              {posCliques.length === 0 && <div style={{ padding: '15px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', color: '#999' }}>Nenhum e-mail engatilhado.</div>}
              {posCliques.map(email => (
                <div key={email.id} style={{ background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fd7e14', marginBottom: '5px' }}>
                    Etapa {email.ordem_etapa}
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{email.titulo_email}</div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}><i className="fa-solid fa-hourglass-half"></i> Espera: + {email.horas_espera} horas</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => carregarParaEdicao(email)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => deletarCard(email.id)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#ffeeba', color: '#856404', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={preparacaoRef} className="panel" style={{ borderTop: '5px solid #6f42c1', padding: '30px', marginBottom: '30px', opacity: cursoAlvo ? 1 : 0.5, pointerEvents: cursoAlvo ? 'auto' : 'none' }}>
          <div style={{ marginBottom: '20px' }}><h2 style={{ margin: 0, color: '#333' }}>2. Adicionar Novo E-mail ao Funil</h2></div>

          <form onSubmit={salvarCardEmail}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', background: '#f4f7f6', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
              
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Qual Funil? *</label>
                <select value={tipoFunil} onChange={e => setTipoFunil(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #6f42c1', fontWeight: 'bold', color: '#6f42c1' }}>
                  <option value="BROADCAST">Broadcast (Data Fixa)</option>
                  <option value="POS_CLIQUE">Pós-Clique (Gatilho de Tempo)</option>
                </select>
              </div>

              {tipoFunil === 'BROADCAST' ? (
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px', color: '#007bff' }}><i className="fa-regular fa-calendar"></i> Data de Disparo *</label>
                  <input type="date" required value={dataDisparo} onChange={e => setDataDisparo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              ) : (
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px', color: '#fd7e14' }}><i className="fa-solid fa-hourglass-half"></i> Aguardar quantas horas? *</label>
                  <input type="number" required placeholder="Ex: 48 (para 2 dias)" value={horasEspera} onChange={e => setHorasEspera(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              )}

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Ordem (Etapa) *</label>
                <input type="number" required placeholder="Ex: 1" value={ordemEtapa} onChange={e => setOrdemEtapa(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Assunto do E-mail *</label>
                <input type="text" required value={tituloemail} onChange={e => setTituloemail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px', color: '#1F4E79' }}>
                <i className="fa-solid fa-window-maximize"></i> Texto da Faixa Azul Superior (Opcional)
              </label>
              <input type="text" value={cabecalhoEmail} onChange={e => setCabecalhoEmail(e.target.value)} placeholder="Ex: Não seguimos tendências genéricas. Queremos realizar capacitações que resolvam problemas reais." style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #1F4E79', backgroundColor: '#eef4fa' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Conteúdo do E-mail (Miolo) *</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setMostrarPreview(true)} style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}><i className="fa-solid fa-eye"></i> Pré-visualizar HTML Final</button>
                  <button type="button" onClick={() => setModoVisual(!modoVisual)} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}><i className="fa-solid fa-code"></i> {modoVisual ? 'Modo HTML Cru' : 'Modo Visual (Editor)'}</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <button type="button" onClick={inserirParagrafo} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Parágrafo</button>
                <button type="button" onClick={inserirTituloSecundario} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Título</button>
                <button type="button" onClick={inserirLinhaSeparadora} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Linha</button>
                <button type="button" onClick={inserirLinkTextoRastreado} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #007bff', background: '#e7f3ff', cursor: 'pointer', fontWeight: 'bold', color: '#0056b3' }}>+ Link rastreado</button>
                <button type="button" onClick={inserirBotaoRastreado} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #28a745', background: '#eaf7ed', cursor: 'pointer', fontWeight: 'bold', color: '#19692c' }}>+ Botão Verde</button>
                <button type="button" onClick={() => setEmailCru(getEmailPadrao())} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dc3545', background: '#fdecea', cursor: 'pointer', fontWeight: 'bold', color: '#b02a37' }}>Restaurar modelo</button>
              </div>

              {modoVisual ? (
                <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <SunEditor setOptions={editorOptions} setContents={emailCru} onChange={setEmailCru} />
                </div>
              ) : (
                <textarea required value={emailCru} onChange={e => setEmailCru(e.target.value)} style={{ width: '100%', minHeight: '300px', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'monospace', backgroundColor: '#2d2d2d', color: '#f8f8f2' }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleEnviarTeste} disabled={enviandoTeste} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-paper-plane"></i> Disparo de Teste</button>
              <button type="submit" disabled={salvandoConfig} style={{ background: '#6f42c1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-plus"></i> Salvar na Sequência</button>
            </div>
          </form>
        </div>

        {mostrarPreview && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarPreview(false)}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Visualização Final do E-mail</h3>
                <button onClick={() => setMostrarPreview(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <div style={{ padding: '0', flex: 1, backgroundColor: '#f4f6f8' }}>
                <iframe srcDoc={htmlPreviewFinal} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}