import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

export function Disparos() {
  const API_URL = 'https://server-js-gestao.onrender.com';
  const WEBHOOK_TESTE = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/v2-teste-disparo';

  const [campanhas, setCampanhas] = useState([]);
  const [sequenciaAtual, setSequenciaAtual] = useState([]);

  const [cursoAlvo, setCursoAlvo] = useState('');
  const [tipoFunil, setTipoFunil] = useState('BROADCAST_FRIO'); 
  const [ordemEtapa, setOrdemEtapa] = useState('1');
  const [dataDisparo, setDataDisparo] = useState('');
  const [horasEspera, setHorasEspera] = useState('');
  const [diasExpiracao, setDiasExpiracao] = useState(''); // <-- NOVO ESTADO
  
  const [tituloemail, setTituloemail] = useState('');
  const [cabecalhoEmail, setCabecalhoEmail] = useState('');
  const [emailCru, setEmailCru] = useState('');

  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [modoVisual, setModoVisual] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [mostrarModalCliques, setMostrarModalCliques] = useState(false);
  const [dadosCliques, setDadosCliques] = useState([]);
  const [carregandoCliques, setCarregandoCliques] = useState(false);

  const [mostrarModalEnvios, setMostrarModalEnvios] = useState(false);
  const [dadosEnvios, setDadosEnvios] = useState({ enviados: [], fila: [], falhas: [] });
  const [carregandoEnvios, setCarregandoEnvios] = useState(false);

  const [emailSelecionadoModal, setEmailSelecionadoModal] = useState(null);
  
  const [leadsExpandidos, setLeadsExpandidos] = useState([]);
  const [editandoEmailId, setEditandoEmailId] = useState(null);

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

  function montarUrlRastreada({ redirect, descricao, etapaAtual, cursoId, tipoF }) {
    const base = `${API_URL}/rastreio`;
    const emailPlaceholder = '{{$json.EmailLimpo}}';
    return `${base}?redirect=${encodeURIComponent(redirect)}&email=${emailPlaceholder}&descricao=${encodeURIComponent(descricao || '')}&etapa=${encodeURIComponent(String(etapaAtual || ''))}&tipo=${encodeURIComponent(tipoF || 'BROADCAST_FRIO')}&curso=${encodeURIComponent(cursoId || '')}`;
  }

  function inserirSnippet(snippet) { setEmailCru(prev => `${prev || ''}${snippet}`); }
  function inserirParagrafo() { inserirSnippet(`\n<p style="margin:0 0 15px 0;color:#1F4E79;">Novo parágrafo aqui.</p>\n`); }
  function inserirTituloSecundario() { inserirSnippet(`\n<h2 style="margin:0 0 15px 0;font-size:18px;color:#1F4E79;">Título da seção</h2>\n`); }
  function inserirLinhaSeparadora() { inserirSnippet(`\n<div style="height:1px;background:#e5e5e5;margin:20px 0;"></div>\n`); }
  function inserirAvisoSeguranca() {
    inserirSnippet(`\n<p style="margin: 0px 0 15px 0; padding: 0 24px; color: #1F4E79; text-align: center; font-size: 13px;">Obs: O link acima é oficial e 100% seguro.</p>\n`);
  }
  
  function inserirListaNaoOrdenada() {
    inserirSnippet(`\n<ul style="margin: 0 0 15px 20px; padding: 0; color: #1F4E79; font-size: 14px; line-height: 1.6;">\n  <li style="margin-bottom: 8px;">Primeiro benefício aqui</li>\n  <li style="margin-bottom: 8px;">Segundo benefício aqui</li>\n  <li style="margin-bottom: 8px;">Terceiro benefício aqui</li>\n</ul>\n`);
  }

  function inserirListaOrdenada() {
    inserirSnippet(`\n<ol style="margin: 0 0 15px 20px; padding: 0; color: #1F4E79; font-size: 14px; line-height: 1.6;">\n  <li style="margin-bottom: 8px;">Passo 1 aqui</li>\n  <li style="margin-bottom: 8px;">Passo 2 aqui</li>\n  <li style="margin-bottom: 8px;">Passo 3 aqui</li>\n</ol>\n`);
  }

  function inserirBotaoRastreado() {
    const textoBotao = window.prompt('Texto do botão:', 'Selecionar os temas prioritários');
    if (!textoBotao) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique:', 'Botão Principal') || 'Botão Principal';
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: ordemEtapa, cursoId: cursoAlvo, tipoF: tipoFunil });
    
    const htmlBotao = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 15px 0;">
  <tr>
    <td align="center" style="padding: 15px 20px 10px 20px;">
      <a href="${linkRastreado}" target="_blank" style="display:inline-block;padding:14px 26px;background-color:#218553;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px;border-radius:6px;border:1px solid #1a6b42; text-align: center;">
        ${textoBotao}
      </a>
    </td>
  </tr>
</table>
    `;
    inserirSnippet(htmlBotao);
  }

  function inserirLinkTextoRastreado() {
    const textoLink = window.prompt('Texto do link:', 'Programa Avançado');
    if (!textoLink) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique:', 'Link no Texto') || 'Link no Texto';
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: ordemEtapa, cursoId: cursoAlvo, tipoF: tipoFunil });
    inserirSnippet(`<a href="${linkRastreado}" target="_blank" style="color:#1F4E79;text-decoration:underline;">${escapeHtml(textoLink)}</a>`);
  }

  function montarHtmlFinal({ titulo = tituloemail, cabecalho = cabecalhoEmail, conteudo = emailCru, etapaEmail = ordemEtapa, cursoId = cursoAlvo, tipoF = tipoFunil } = {}) {
    const tituloSeguro = escapeHtml(titulo || 'E-mail');
    const cabecalhoSeguro = escapeHtml(cabecalho || '');
    const conteudoHtml = conteudo || getEmailPadrao();
    const linkSite = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'Link Site', etapaAtual: etapaEmail, cursoId, tipoF });
    const linkBot = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'bot', etapaAtual: etapaEmail, cursoId, tipoF });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tituloSeguro}</title></head><body style="margin:0;padding:0;background-color:#f4f6f8;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;font-family:Arial,sans-serif;font-size:14px;color:#1F4E79;">${cabecalhoSeguro ? `<tr><td style="background-color:#1F4E79;color:#ffffff;padding:16px 20px;text-align:center;font-weight:bold;font-size:15px;">${cabecalhoSeguro}</td></tr>` : ''}<tr><td style="padding:30px 30px 10px 30px;line-height:1.6;text-align:justify;">${conteudoHtml}</td></tr><tr><td style="padding:10px 24px 25px 24px;color:#1F4E79;"><p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Fico à disposição!</p><p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Atenciosamente,</p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;"><strong>Camila Silveira Guimarães</strong></p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Setor Comercial</p><p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 3541 3355</p><p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 98443-2097</p><p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;"><a href="${linkSite}" target="_blank" style="color:#1F4E79;text-decoration:none;font-weight:bold;">www.gestao.srv.br</a></p><a href="${linkBot}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:bold;">.</a></td></tr></table></td></tr></table></body></html>`;
  }

  const campanhaSelecionada = useMemo(() => campanhas.find(c => c.id === Number(cursoAlvo)), [campanhas, cursoAlvo]);

  useEffect(() => {
    const perfil = localStorage.getItem('perfil');
    if (perfil !== 'admin') { window.location.href = '/empresas'; return; }
    carregarCampanhas();
  }, []);

  useEffect(() => {
    if (cursoAlvo) { carregarSequencia(cursoAlvo); } else { setSequenciaAtual([]); }
  }, [cursoAlvo]);

  useEffect(() => {
    if (!editandoEmailId) {
      const emailsDoFunil = sequenciaAtual.filter(e => e.tipo_funil === tipoFunil);
      if (emailsDoFunil.length > 0) {
        const ultimaOrdem = Math.max(...emailsDoFunil.map(e => Number(e.ordem_etapa)));
        setOrdemEtapa(String(ultimaOrdem + 1));
      } else {
        setOrdemEtapa('1');
      }
    }
  }, [tipoFunil, sequenciaAtual, editandoEmailId]);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      setCampanhas(res.data);
    } catch (erro) { console.error('Erro campanhas', erro); }
  }

  async function carregarSequencia(campanhaId) {
    try {
      const res = await axios.get(`${API_URL}/sequencia-emails/${campanhaId}`, getHeaders());
      setSequenciaAtual(res.data);
    } catch (erro) { console.error('Erro ao buscar sequência', erro); }
  }

  async function abrirModalCliques(email) {
    setEmailSelecionadoModal(email); 
    setLeadsExpandidos([]); 
    setMostrarModalCliques(true);
    setCarregandoCliques(true);
    try {
      const res = await axios.get(`${API_URL}/campanhas/${email.campanha_id}/funil/${email.tipo_funil}/etapa/${email.ordem_etapa}/cliques`, getHeaders());
      const cliquesReais = res.data.filter(c => c.link_descricao && c.link_descricao.toLowerCase() !== 'bot');
      setDadosCliques(cliquesReais);
    } catch (error) {
      console.error("ERRO COMPLETO CLIQUES:", error);
      alert(error.response?.data?.erro || "Erro ao buscar relatório de cliques. Verifique o console (F12).");
    } finally {
      setCarregandoCliques(false);
    }
  }

  async function abrirModalEnvios(email) {
    setEmailSelecionadoModal(email);
    setMostrarModalEnvios(true);
    setCarregandoEnvios(true);
    try {
      const res = await axios.get(`${API_URL}/campanhas/${email.campanha_id}/funil/${email.tipo_funil}/etapa/${email.ordem_etapa}/envios`, getHeaders());
      setDadosEnvios({
        enviados: res.data.enviados || [],
        fila: res.data.fila || [],
        falhas: res.data.falhas || []
      });
    } catch (error) {
      console.error("ERRO COMPLETO ENVIOS:", error);
      alert(error.response?.data?.erro || "Erro ao buscar fila e envios deste e-mail. Verifique o console (F12).");
    } finally {
      setCarregandoEnvios(false);
    }
  }

  function toggleLeadHistorico(leadId) {
    setLeadsExpandidos(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  }

  async function iniciarCampanha() {
    if (!window.confirm(`🚀 Deseja iniciar a automação para "${campanhaSelecionada.nome}"?\nIsso vai injetar os leads selecionados no Kanban e na fila de e-mails.`)) return;
    try {
      const res = await axios.post(`${API_URL}/campanhas/${campanhaSelecionada.id}/iniciar`, {}, getHeaders());
      alert(`✅ ${res.data.mensagem}`);
      carregarCampanhas();
    } catch (erro) { alert(erro.response?.data?.erro || 'Erro ao iniciar a automação.'); }
  }

  async function alternarStatusMotor() {
    const novoStatus = campanhaSelecionada.status_motor === 'rodando' ? 'pausado' : 'rodando';
    const acao = novoStatus === 'pausado' ? 'PAUSAR' : 'RETOMAR';
    if (!window.confirm(`Deseja ${acao} os disparos automáticos para a campanha "${campanhaSelecionada.nome}"?`)) return;
    try {
      await axios.put(`${API_URL}/campanhas/${campanhaSelecionada.id}/status-motor`, { status_motor: novoStatus }, getHeaders());
      carregarCampanhas();
    } catch (erro) { alert('Erro ao alterar status do motor.'); }
  }

  async function salvarCardEmail(e) {
    e.preventDefault();
    if (!cursoAlvo) return alert('Selecione a Campanha.');

    const ordemDuplicada = sequenciaAtual.find(email => 
      email.tipo_funil === tipoFunil && Number(email.ordem_etapa) === Number(ordemEtapa) && email.id !== editandoEmailId
    );

    if (ordemDuplicada) return alert(`Já existe um e-mail na Etapa ${ordemEtapa} do funil selecionado. Escolha um número de etapa diferente.`);

    setSalvandoConfig(true);

    const payload = {
      campanha_id: cursoAlvo, 
      tipo_funil: tipoFunil, 
      ordem_etapa: ordemEtapa,
      data_disparo_exata: tipoFunil.includes('BROADCAST') ? dataDisparo : null,
      horas_espera: tipoFunil === 'POS_CLIQUE' ? horasEspera : null,
      dias_expiracao: tipoFunil === 'POS_CLIQUE' && diasExpiracao ? parseInt(diasExpiracao) : null,
      cargo_alvo: 'Todos', 
      titulo_email: tituloemail, 
      cabecalho_email: cabecalhoEmail, 
      html_email: emailCru
    };

    try {
      if (editandoEmailId) {
        await axios.put(`${API_URL}/sequencia-emails/${editandoEmailId}`, payload, getHeaders());
        alert('💾 E-mail atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/sequencia-emails`, payload, getHeaders());
        alert('💾 E-mail adicionado à sequência com sucesso!');
      }
      
      carregarSequencia(cursoAlvo);
      limparFormularioEmail();
    } catch (erro) { 
      alert(erro.response?.data?.erro || '❌ Erro ao guardar e-mail.'); 
    } finally { 
      setSalvandoConfig(false); 
    }
  }

  function limparFormularioEmail() {
    setEditandoEmailId(null);
    setTituloemail(''); 
    setCabecalhoEmail(''); 
    setEmailCru('');
    setDiasExpiracao('');
  }

  async function deletarCard(id) {
    if (!window.confirm("Tem certeza que deseja apagar este e-mail da sequência?")) return;
    try { await axios.delete(`${API_URL}/sequencia-emails/${id}`, getHeaders()); carregarSequencia(cursoAlvo); } 
    catch (error) { alert("Erro ao deletar e-mail."); }
  }

  function carregarParaEdicao(emailConfig) {
    setEditandoEmailId(emailConfig.id);
    setTipoFunil(emailConfig.tipo_funil); 
    setOrdemEtapa(emailConfig.ordem_etapa);
    setDataDisparo(emailConfig.data_disparo_exata ? emailConfig.data_disparo_exata.split('T')[0] : '');
    setHorasEspera(emailConfig.horas_espera || ''); 
    setDiasExpiracao(emailConfig.dias_expiracao || '');
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

  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleString('pt-BR');
  }

  function exibirDataISO(dataIso) {
    if (!dataIso) return 'Sem data';
    const partes = dataIso.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const broadcastsFrios = sequenciaAtual.filter(e => e.tipo_funil === 'BROADCAST_FRIO');
  const broadcastsQuentes = sequenciaAtual.filter(e => e.tipo_funil === 'BROADCAST_QUENTE');
  const posCliques = sequenciaAtual.filter(e => e.tipo_funil === 'POS_CLIQUE');
  
  const htmlPreviewFinal = montarHtmlFinal({ titulo: tituloemail, cabecalho: cabecalhoEmail, conteudo: emailCru, etapaEmail: ordemEtapa, cursoId: cursoAlvo, tipoF: tipoFunil });

  const leadsAgrupados = Object.values((dadosCliques || []).reduce((acc, clique) => {
    const chave = clique.contato_id || clique.contato_nome || Math.random();
    if (!acc[chave]) {
      let emailExibicao = 'Sem e-mail';
      try {
        const emailsArray = typeof clique.emails_json === 'string' ? JSON.parse(clique.emails_json) : clique.emails_json;
        if (emailsArray && emailsArray.length > 0) emailExibicao = emailsArray[0];
      } catch(e) {}
      acc[chave] = { id: chave, nome: clique.contato_nome || 'Desconhecido', email: emailExibicao, interacoes: [] };
    }
    acc[chave].interacoes.push({ link: clique.link_descricao || 'Link', data: clique.criado_em });
    return acc;
  }, {}));

  return (
    <div>
      <Header titulo="Construtor de Funis e Automação" />
      <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>

        <div className="panel" style={{ padding: '20px', marginBottom: '20px', background: '#eef2f5', border: '1px solid #cdd4db', borderRadius: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1F4E79' }}>1. Selecione a Campanha para gerenciar o Funil e a Automação:</label>
          <select value={cursoAlvo} onChange={e => { setCursoAlvo(e.target.value); limparFormularioEmail(); }} style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '6px', border: '1px solid #1F4E79', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <option value="">-- Escolha uma Campanha --</option>
            {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {campanhaSelecionada && (
          <div className="panel" style={{ padding: '20px', marginBottom: '30px', background: '#fff', border: campanhaSelecionada.status_motor === 'rodando' ? '2px solid #28a745' : campanhaSelecionada.status_motor === 'pausado' ? '2px solid #ffc107' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}><i className="fa-solid fa-robot"></i> Motor de Disparos: {campanhaSelecionada.nome}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Controle a injeção de leads e os envios automáticos para esta campanha.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {campanhaSelecionada.status_motor === 'rodando' ? (
                <>
                  <div style={{ padding: '10px 15px', background: '#e6f4ea', color: '#155724', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #c3e6cb' }}>
                    <i className="fa-solid fa-check-circle"></i> Automação Rodando
                  </div>
                  <button onClick={alternarStatusMotor} style={{ padding: '10px 20px', background: '#ffc107', color: '#333', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-pause"></i> Pausar Disparos</button>
                </>
              ) : campanhaSelecionada.status_motor === 'pausado' ? (
                <>
                  <div style={{ padding: '10px 15px', background: '#fff3cd', color: '#856404', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #ffeeba' }}>
                    <i className="fa-solid fa-pause-circle"></i> Automação Pausada
                  </div>
                  <button onClick={alternarStatusMotor} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-play"></i> Retomar Disparos</button>
                </>
              ) : (
                <button onClick={iniciarCampanha} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  <i className="fa-solid fa-rocket"></i> Iniciar Automação (Injetar Leads)
                </button>
              )}
            </div>
          </div>
        )}

        {cursoAlvo && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            
            {/* BROADCAST FRIOS */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', borderTop: '5px solid #007bff', border: '1px solid #ddd' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '1.1rem' }}><i className="fa-solid fa-snowflake"></i> Broadcast Frios</h3>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>Disparado para a base geral em datas exatas.</p>
              
              {broadcastsFrios.length === 0 && <div style={{ padding: '15px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', color: '#999', fontSize: '0.85rem' }}>Nenhum e-mail agendado.</div>}
              {broadcastsFrios.map(email => (
                <div key={email.id} style={{ background: editandoEmailId === email.id ? '#e7f3ff' : '#fff', padding: '15px', borderRadius: '6px', border: editandoEmailId === email.id ? '2px solid #007bff' : '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>Etapa {email.ordem_etapa}</div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '0.9rem' }}>{email.titulo_email}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '10px' }}>
                    <i className="fa-regular fa-clock"></i> Disparo: {email.data_disparo_exata ? exibirDataISO(email.data_disparo_exata) : 'Sem data'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', borderTop: '1px dashed #ddd', paddingTop: '10px', marginTop: '5px' }}>
                    <button onClick={() => carregarParaEdicao(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: editandoEmailId === email.id ? '#007bff' : '#e9ecef', color: editandoEmailId === email.id ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</button>
                    {/* <button onClick={() => deletarCard(email.id)} style={{ padding: '5px', fontSize: '0.75rem', background: '#ffeeba', color: '#856404', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button> */}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                    <button onClick={() => abrirModalEnvios(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-paper-plane"></i> Fila</button>
                    <button onClick={() => abrirModalCliques(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-mouse-pointer"></i> Cliques</button>
                  </div>
                </div>
              ))}
            </div>

            {/* BROADCAST QUENTES */}
            <div style={{ background: '#fff5f5', padding: '20px', borderRadius: '8px', borderTop: '5px solid #dc3545', border: '1px solid #f5c6cb' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#dc3545', fontSize: '1.1rem' }}><i className="fa-solid fa-heart"></i> Broadcast Quentes</h3>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>Disparado para Clientes e Assessorados.</p>
              
              {broadcastsQuentes.length === 0 && <div style={{ padding: '15px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', color: '#999', fontSize: '0.85rem' }}>Nenhum e-mail agendado.</div>}
              {broadcastsQuentes.map(email => (
                <div key={email.id} style={{ background: editandoEmailId === email.id ? '#fdecea' : '#fff', padding: '15px', borderRadius: '6px', border: editandoEmailId === email.id ? '2px solid #dc3545' : '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc3545', marginBottom: '5px' }}>Etapa {email.ordem_etapa}</div>
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '0.9rem' }}>{email.titulo_email}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '10px' }}>
                    <i className="fa-regular fa-clock"></i> Disparo: {email.data_disparo_exata ? exibirDataISO(email.data_disparo_exata) : 'Sem data'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', borderTop: '1px dashed #ddd', paddingTop: '10px', marginTop: '5px' }}>
                    <button onClick={() => carregarParaEdicao(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: editandoEmailId === email.id ? '#dc3545' : '#e9ecef', color: editandoEmailId === email.id ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</button>
                    {/* <button onClick={() => deletarCard(email.id)} style={{ padding: '5px', fontSize: '0.75rem', background: '#ffeeba', color: '#856404', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button> */}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                    <button onClick={() => abrirModalEnvios(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-paper-plane"></i> Fila</button>
                    <button onClick={() => abrirModalCliques(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-mouse-pointer"></i> Cliques</button>
                  </div>
                </div>
              ))}
            </div>

            {/* PÓS CLIQUE */}
            <div style={{ background: '#fffcf5', padding: '20px', borderRadius: '8px', borderTop: '5px solid #fd7e14', border: '1px solid #f8e1c5' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#fd7e14', fontSize: '1.1rem' }}><i className="fa-solid fa-fire"></i> Funil Pós-Clique</h3>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>Fila cronológica. E-mails expiram se passarem da validade.</p>
              
              {posCliques.length === 0 && <div style={{ padding: '15px', textAlign: 'center', background: '#fff', border: '1px dashed #ccc', color: '#999', fontSize: '0.85rem' }}>Nenhum e-mail engatilhado.</div>}
              {posCliques.map(email => (
                <div key={email.id} style={{ background: editandoEmailId === email.id ? '#fff8e7' : '#fff', padding: '15px', borderRadius: '6px', border: editandoEmailId === email.id ? '2px solid #fd7e14' : '1px solid #eee', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  
                  {/* BADGE VISUAL DE VALIDADE */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fd7e14' }}>Etapa {email.ordem_etapa}</div>
                    {email.dias_expiracao ? (
                       <span style={{ fontSize: '0.65rem', background: '#f8d7da', color: '#721c24', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Expira: Dia {email.dias_expiracao}</span>
                    ) : (
                       <span style={{ fontSize: '0.65rem', background: '#d4edda', color: '#155724', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Sempre Válido</span>
                    )}
                  </div>
                  
                  <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px', fontSize: '0.9rem' }}>{email.titulo_email}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '10px' }}><i className="fa-solid fa-hourglass-half"></i> Delay na Fila: {email.horas_espera}h</div>
                  
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', borderTop: '1px dashed #ddd', paddingTop: '10px', marginTop: '5px' }}>
                    <button onClick={() => carregarParaEdicao(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: editandoEmailId === email.id ? '#fd7e14' : '#e9ecef', color: editandoEmailId === email.id ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</button>
                    {/* <button onClick={() => deletarCard(email.id)} style={{ padding: '5px', fontSize: '0.75rem', background: '#ffeeba', color: '#856404', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Excluir</button> */}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                    <button onClick={() => abrirModalEnvios(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#6f42c1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-paper-plane"></i> Fila</button>
                    <button onClick={() => abrirModalCliques(email)} style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-mouse-pointer"></i> Cliques</button>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        )}

        <div ref={preparacaoRef} className="panel" style={{ borderTop: '5px solid #6f42c1', padding: '30px', marginBottom: '30px', opacity: cursoAlvo ? 1 : 0.5, pointerEvents: cursoAlvo ? 'auto' : 'none' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              {editandoEmailId ? `Editando E-mail (Ordem ${ordemEtapa})` : '2. Adicionar Novo E-mail ao Funil'}
            </h2>
            {editandoEmailId && (
              <button onClick={limparFormularioEmail} style={{ background: '#eee', color: '#333', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className="fa-solid fa-times"></i> Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={salvarCardEmail}>
            
            {/* GRID DO FORMULÁRIO AJUSTADO (DE 3 PARA 4 COLUNAS QUANDO PÓS-CLIQUE) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: '#f4f7f6', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
              <div style={{ gridColumn: tipoFunil.includes('BROADCAST') ? 'span 1' : 'span 1' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Qual Funil? *</label>
                <select value={tipoFunil} onChange={e => setTipoFunil(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #6f42c1', fontWeight: 'bold', color: '#6f42c1' }}>
                  <option value="BROADCAST_FRIO">Broadcast (Frios / Mornos)</option>
                  <option value="BROADCAST_QUENTE">Broadcast (Quentes / Clientes)</option>
                  <option value="POS_CLIQUE">Pós-Clique (Timeline / Expiração)</option>
                </select>
              </div>

              {tipoFunil.includes('BROADCAST') ? (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px', color: '#007bff' }}><i className="fa-regular fa-calendar"></i> Data de Disparo *</label>
                  <input type="date" required value={dataDisparo} onChange={e => setDataDisparo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              ) : (
                <>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.85rem', display: 'block', marginBottom: '5px', color: '#fd7e14' }}><i className="fa-solid fa-hourglass-half"></i> Espera (Horas) *</label>
                    <input type="number" required placeholder="Ex: 48" value={horasEspera} onChange={e => setHorasEspera(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.85rem', display: 'block', marginBottom: '5px', color: '#dc3545' }}><i className="fa-solid fa-ban"></i> Expira em (Dias)</label>
                    <input type="number" placeholder="Vazio = Nunca expira" value={diasExpiracao} onChange={e => setDiasExpiracao(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                </>
              )}

              <div style={{ gridColumn: 'span 1' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Ordem (Etapa/Índice) *</label>
                <input type="number" required placeholder="Ex: 1" value={ordemEtapa} onChange={e => setOrdemEtapa(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ gridColumn: 'span 4' }}>
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
                <button type="button" onClick={inserirListaNaoOrdenada} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Lista (Bolinhas)</button>
                <button type="button" onClick={inserirListaOrdenada} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Lista (Números)</button>
                <button type="button" onClick={inserirLinhaSeparadora} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+ Linha</button>
                <button type="button" onClick={inserirLinkTextoRastreado} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #007bff', background: '#e7f3ff', cursor: 'pointer', fontWeight: 'bold', color: '#0056b3' }}>+ Link rastreado</button>
                <button type="button" onClick={inserirBotaoRastreado} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #28a745', background: '#eaf7ed', cursor: 'pointer', fontWeight: 'bold', color: '#19692c' }}>+ Botão Verde</button>
                <button type="button" onClick={inserirAvisoSeguranca} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #17a2b8', background: '#e0f3f8', cursor: 'pointer', fontWeight: 'bold', color: '#0c5460' }}>+ Aviso de Segurança</button>
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
              <button type="submit" disabled={salvandoConfig} style={{ background: editandoEmailId ? '#ffc107' : '#6f42c1', color: editandoEmailId ? '#333' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className={`fa-solid ${editandoEmailId ? 'fa-save' : 'fa-plus'}`}></i> {editandoEmailId ? 'Salvar Alterações' : 'Adicionar à Sequência'}
              </button>
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

        {/* MODAL 1: CLIQUES */}
        {mostrarModalCliques && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalCliques(false)}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#17a2b8' }}><i className="fa-solid fa-chart-bar"></i> Relatório de Cliques</h3>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>{emailSelecionadoModal?.titulo_email}</div>
                </div>
                <button onClick={() => setMostrarModalCliques(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {carregandoCliques ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Carregando relatórios...</div>
                ) : leadsAgrupados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px', background: '#f8f9fa', borderRadius: '8px', color: '#999', fontStyle: 'italic' }}>Nenhum clique real registrado para este e-mail ainda.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                      <tr style={{ background: '#f4f6f8', textAlign: 'left', color: '#555', fontSize: '0.85rem' }}>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>CONTATO (LEAD)</th>
                        <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>HISTÓRICO DE CLIQUES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsAgrupados.map((lead) => {
                        const interacoes = lead.interacoes;
                        const ultimaInteracao = interacoes[0]; 
                        const historicoAntigo = interacoes.slice(1); 
                        const estaExpandido = leadsExpandidos.includes(lead.id);

                        return (
                          <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px 12px', verticalAlign: 'top', width: '40%' }}>
                              <strong style={{ color: '#333', fontSize: '1rem', display: 'block' }}>{lead.nome}</strong>
                              <span style={{ color: '#777', fontSize: '0.85rem' }}>{lead.email}</span>
                            </td>
                            <td style={{ padding: '15px 12px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #007bff' }}>
                                  <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '0.85rem', background: '#e7f3ff', padding: '4px 8px', borderRadius: '4px' }}>
                                    {ultimaInteracao.link}
                                  </span>
                                  <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                    {formatarDataHora(ultimaInteracao.data)}
                                  </span>
                                </div>

                                {historicoAntigo.length > 0 && (
                                  <button 
                                    onClick={() => toggleLeadHistorico(lead.id)} 
                                    style={{ background: 'none', border: 'none', color: '#17a2b8', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', padding: '5px 0', marginTop: '5px' }}
                                  >
                                    <i className={`fa-solid ${estaExpandido ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i> 
                                    {estaExpandido ? ' Ocultar histórico' : ` Ver mais ${historicoAntigo.length} clique(s) anterior(es)`}
                                  </button>
                                )}

                                {estaExpandido && historicoAntigo.map((int, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f3f5', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #ccc', marginTop: '4px', opacity: 0.8 }}>
                                    <span style={{ color: '#555', fontWeight: 'bold', fontSize: '0.85rem', background: '#e2e3e5', padding: '4px 8px', borderRadius: '4px' }}>
                                      {int.link}
                                    </span>
                                    <span style={{ color: '#888', fontSize: '0.8rem' }}>
                                      {formatarDataHora(int.data)}
                                    </span>
                                  </div>
                                ))}

                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FILA E ENVIOS */}
        {mostrarModalEnvios && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModalEnvios(false)}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '1100px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '15px 20px', background: '#6f42c1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff' }}><i className="fa-solid fa-paper-plane"></i> Relatório de Envios e Fila</h3>
                  <div style={{ fontSize: '0.85rem', color: '#e6e6e6', marginTop: '5px' }}>{emailSelecionadoModal?.titulo_email}</div>
                </div>
                <button onClick={() => setMostrarModalEnvios(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>&times;</button>
              </div>
              
              <div style={{ padding: '20px', flex: 1, overflowY: 'auto', background: '#f4f6f8' }}>
                {carregandoEnvios ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i><br/>Carregando dados da fila...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                    
                    {/* COLUNA 1: JÁ ENVIADOS */}
                    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                      <div style={{ background: '#e6f4ea', padding: '12px 15px', borderBottom: '1px solid #c3e6cb', fontWeight: 'bold', color: '#155724' }}>
                        <i className="fa-solid fa-check-double"></i> Já Enviados ({dadosEnvios.enviados?.length || 0})
                      </div>
                      <div style={{ padding: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                        {dadosEnvios.enviados?.length === 0 && <p style={{color:'#999', textAlign:'center', fontSize:'0.8rem'}}>Nenhum envio registrado.</p>}
                        {dadosEnvios.enviados?.map((envio, idx) => (
                          <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            <strong style={{ display: 'block', color: '#333', fontSize: '0.85rem' }}>{envio.nome}</strong>
                            <span style={{ display: 'block', color: '#777', fontSize: '0.75rem' }}>{envio.email_destino}</span>
                            <span style={{ display: 'block', color: '#28a745', fontSize: '0.7rem', marginTop: '3px' }}>{formatarDataHora(envio.data_envio)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COLUNA 2: NA FILA */}
                    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                      <div style={{ background: '#fff3cd', padding: '12px 15px', borderBottom: '1px solid #ffeeba', fontWeight: 'bold', color: '#856404' }}>
                        <i className="fa-solid fa-hourglass-half"></i> Na Fila ({dadosEnvios.fila?.length || 0})
                      </div>
                      <div style={{ padding: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                        {dadosEnvios.fila?.length === 0 && <p style={{color:'#999', textAlign:'center', fontSize:'0.8rem'}}>Fila vazia para esta etapa.</p>}
                        {dadosEnvios.fila?.map((lead, idx) => {
                          let emailExibicao = 'Sem e-mail';
                          try {
                            const emailsArray = typeof lead.emails_json === 'string' ? JSON.parse(lead.emails_json) : lead.emails_json;
                            if (emailsArray && emailsArray.length > 0) emailExibicao = emailsArray[0];
                          } catch(e) {}
                          return (
                            <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                              <strong style={{ display: 'block', color: '#333', fontSize: '0.85rem' }}>{lead.nome}</strong>
                              <span style={{ display: 'block', color: '#777', fontSize: '0.75rem' }}>{emailExibicao}</span>
                              <span style={{ display: 'block', color: '#856404', fontSize: '0.7rem', marginTop: '3px' }}>Aguardando disparo</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUNA 3: ERROS / BLACKLIST */}
                    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
                      <div style={{ background: '#f8d7da', padding: '12px 15px', borderBottom: '1px solid #f5c6cb', fontWeight: 'bold', color: '#721c24' }}>
                        <i className="fa-solid fa-circle-exclamation"></i> Falhas / Bloqueados ({dadosEnvios.falhas?.length || 0})
                      </div>
                      <div style={{ padding: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                        {dadosEnvios.falhas?.length === 0 && <p style={{color:'#999', textAlign:'center', fontSize:'0.8rem'}}>Nenhuma falha registrada.</p>}
                        {dadosEnvios.falhas?.map((falha, idx) => (
                          <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee', background: '#fff5f5' }}>
                            <strong style={{ display: 'block', color: '#333', fontSize: '0.85rem' }}>{falha.nome}</strong>
                            <span style={{ display: 'block', color: '#c00', fontSize: '0.75rem', fontWeight: 'bold' }}>{falha.email}</span>
                            <span style={{ display: 'block', color: '#721c24', fontSize: '0.7rem', marginTop: '3px', fontStyle: 'italic' }}>
                              Motivo: {falha.motivo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}