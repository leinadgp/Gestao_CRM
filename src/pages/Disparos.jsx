// src/pages/Disparos.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

export function Disparos() {
  const API_URL = 'https://server-js-gestao.onrender.com';

  // 1. CORREÇÃO DA URL DE TESTE PARA BATER COM O SEU N8N
  const WEBHOOK_TESTE = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/teste-disparo';
  const WEBHOOK_INICIAR_CAMPANHA = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/iniciar-campanha';
  const WEBHOOK_CONTROLE_DISPARO = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/controle-disparo';

  const [campanhas, setCampanhas] = useState([]);
  const [configsSalvas, setConfigsSalvas] = useState({});
  const [statusCampanhas, setStatusCampanhas] = useState({});

  const [cursoAlvo, setCursoAlvo] = useState('');
  const [cargoAlvo, setCargoAlvo] = useState('');
  const [etapa, setEtapa] = useState('');
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
    minHeight: '300px',
    attributesWhitelist: {
      all: 'style',
      a: 'href|target|style|class|rel'
    }
  };

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  function escapeHtml(valor = '') {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getEmailPadrao() {
    return `
<p style="margin:0 0 15px 0;">Prezado(a),</p>
<p style="margin:0 0 15px 0;">O cotidiano do <strong>Controle Interno Municipal</strong> exige muito mais do que conhecimento teórico. Exige soluções práticas, segurança jurídica e aderência à realidade de cada município.</p>
`.trim();
  }

  function montarUrlRastreada({ redirect, descricao, etapaAtual, cursoNome }) {
    const base = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/rastreio2';
    const emailPlaceholder = '{{$json.EmailLimpo}}';
    return (
      `${base}?redirect=${encodeURIComponent(redirect)}` +
      `&email=${emailPlaceholder}` +
      `&descricao=${encodeURIComponent(descricao || '')}` +
      `&etapa=${encodeURIComponent(String(etapaAtual || ''))}` +
      `&curso=${encodeURIComponent(cursoNome || '')}`
    );
  }

  function inserirSnippet(snippet) {
    setEmailCru(prev => `${prev || ''}${snippet}`);
  }

  function inserirParagrafo() {
    inserirSnippet(`\n<p style="margin:0 0 15px 0;">Novo parágrafo aqui.</p>\n`);
  }

  function inserirTituloSecundario() {
    inserirSnippet(`\n<h2 style="margin:0 0 15px 0;font-size:18px;color:#1F4E79;">Título da seção</h2>\n`);
  }

  function inserirLinhaSeparadora() {
    inserirSnippet(`\n<div style="height:1px;background:#e5e5e5;margin:20px 0;"></div>\n`);
  }

  function inserirBotaoRastreado() {
    const textoBotao = window.prompt('Texto do botão:', 'Selecionar os temas prioritários');
    if (!textoBotao) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique (para o n8n):', 'Link Pesquisa Cursos') || 'Link Pesquisa Cursos';
    const cursoSelecionado = campanhas.find(c => c.id === Number(cursoAlvo));
    
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: etapa, cursoNome: cursoSelecionado?.nome || '' });

    inserirSnippet(`
<div style="text-align: center; padding: 10px 20px; margin: 15px 0;">
  <a href="${linkRastreado}" target="_blank" style="display:inline-block; padding:14px 26px; background-color:#218553; color:#ffffff; font-weight:bold; text-decoration:none; font-size:14px; border-radius:6px; border:1px solid #218553;">
    ${textoBotao}
  </a>
</div>
<p><br></p>
`.trim());
  }

  function inserirLinkTextoRastreado() {
    const textoLink = window.prompt('Texto do link:', 'Acessar o site');
    if (!textoLink) return;
    const urlDestino = window.prompt('URL de destino:', 'https://www.gestao.srv.br');
    if (!urlDestino) return;
    const descricao = window.prompt('Descrição do clique (para o n8n):', 'link-texto') || 'link-texto';
    const cursoSelecionado = campanhas.find(c => c.id === Number(cursoAlvo));
    
    const linkRastreado = montarUrlRastreada({ redirect: urlDestino, descricao, etapaAtual: etapa, cursoNome: cursoSelecionado?.nome || '' });

    inserirSnippet(` <a href="${linkRastreado}" target="_blank" style="color:#1F4E79;text-decoration:underline;font-weight:bold;">${escapeHtml(textoLink)}</a> `);
  }

  function montarHtmlFinal({ titulo = tituloemail, cabecalho = cabecalhoEmail, conteudo = emailCru, etapaEmail = etapa, cursoNome = '' } = {}) {
    const tituloSeguro = escapeHtml(titulo || 'E-mail');
    const cabecalhoSeguro = escapeHtml(cabecalho || '');
    const conteudoHtml = conteudo || getEmailPadrao();

    const linkSite = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'Link Site', etapaAtual: etapaEmail, cursoNome });
    const linkBot = montarUrlRastreada({ redirect: 'https://www.gestao.srv.br', descricao: 'bot', etapaAtual: etapaEmail, cursoNome });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${tituloSeguro}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;font-family:Arial,sans-serif;font-size:14px;color:#1F4E79;">
        ${cabecalhoSeguro ? `
        <tr>
          <td style="background-color:#1F4E79;color:#ffffff;padding:16px 20px;text-align:center;font-weight:bold;font-size:15px;">
            ${cabecalhoSeguro}
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:30px 30px 10px 30px;line-height:1.6;text-align:justify;">
            ${conteudoHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 24px 25px 24px;color:#1F4E79;">
            <p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Fico à disposição!</p>
            <p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Atenciosamente,</p>
            <p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;"><strong>Camila Silveira Guimarães</strong></p>
            <p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">Setor Comercial</p>
            <p style="margin:0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 3541 3355</p>
            <p style="margin:0 0 10px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">(51) 98443-2097</p>
            <p style="margin:0 0 15px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#1F4E79;">
              <a href="${linkSite}" target="_blank" style="color:#1F4E79;text-decoration:none;font-weight:bold;">www.gestao.srv.br</a>
            </p>
            <a href="${linkBot}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:bold;">.</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  }

  const campanhaSelecionada = useMemo(() => campanhas.find(c => c.id === Number(cursoAlvo)), [campanhas, cursoAlvo]);

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
          cargoAlvo: conf.cargo_alvo, etapa: conf.etapa, tituloemail: conf.titulo_email, cabecalhoEmail: conf.cabecalho_email, emailCru: conf.html_email
        };
      });
      setConfigsSalvas(formatoParaEstado);
    } catch (erro) { console.error('Erro configs', erro); }
  }

  async function salvarConfiguracaoCampanha(e) {
    e.preventDefault();
    if (!cursoAlvo) return alert('Selecione a Campanha.');
    setSalvandoConfig(true);
    const payload = { campanha_id: cursoAlvo, cargo_alvo: cargoAlvo, etapa, titulo_email: tituloemail, cabecalho_email: cabecalhoEmail, html_email: emailCru };

    try {
      await axios.post(`${API_URL}/configuracoes-disparos`, payload, getHeaders());
      setConfigsSalvas({ ...configsSalvas, [cursoAlvo]: { cargoAlvo, etapa, tituloemail, cabecalhoEmail, emailCru } });
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

  // 2. CORREÇÃO DA COMUNICAÇÃO DE TESTE
  async function handleEnviarTeste() {
    if (!tituloemail) return alert('Preencha o assunto do e-mail.');
    setEnviandoTeste(true);

    try {
      // Como o seu n8n de Teste monta a tabela lá, nós mandamos o texto e o cabeçalho separados para ele.
      // Além disso, substituímos a variável do botão para o teste não chegar quebrado.
      const emailCruTeste = emailCru.replace(/\{\{\$json\.EmailLimpo\}\}/g, 'leinadgp@gmail.com');

      await fetch(WEBHOOK_TESTE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailCru: emailCruTeste, 
          cabecalhoEmail, 
          tituloemail, 
          etapa, 
          curso: cursoAlvo 
        })
      });
      alert('✅ E-mail de teste enviado para o n8n!');
    } catch (error) { alert('❌ Erro no teste.'); } 
    finally { setEnviandoTeste(false); }
  }

  async function iniciarDisparo(campanha) {
    const config = configsSalvas[campanha.id];
    if (!config || !config.cargoAlvo || !config.emailCru || !config.tituloemail) { return alert('⚠️ A campanha não possui configuração salva.'); }
    if (!window.confirm(`🚀 INICIAR CAMPANHA OFICIAL?\n\nCampanha: ${campanha.nome}\nAlvo: ${config.cargoAlvo}`)) return;

    // 3. COMUNICAÇÃO DE PRODUÇÃO (Aqui o React manda o HTML perfeitinho, que é o que o seu n8n espera)
    const htmlFinal = montarHtmlFinal({ titulo: config.tituloemail, cabecalho: config.cabecalhoEmail, conteudo: config.emailCru, etapaEmail: config.etapa, cursoNome: campanha.nome });
    const payload = { html: htmlFinal, titulo: config.tituloemail, campanha_alvo: campanha.nome, cargo_alvo: config.cargoAlvo, etapa: config.etapa };

    try {
      const res = await fetch(WEBHOOK_INICIAR_CAMPANHA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setStatusCampanhas(prev => ({ ...prev, [campanha.id]: 'rodando' })); alert('✅ Campanha INICIADA!'); }
    } catch (error) { alert('❌ Erro no disparo.'); }
  }

  async function alterarStatusMotor(campanha, novoStatus) {
    const acao = novoStatus === 'true' ? 'RETOMAR' : 'PAUSAR';
    if (!window.confirm(`Deseja ${acao} os disparos da campanha "${campanha.nome}"?`)) return;

    try {
      const res = await fetch(WEBHOOK_CONTROLE_DISPARO, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanha_nome: campanha.nome, status_disparo: novoStatus })
      });
      if (res.ok) { setStatusCampanhas(prev => ({ ...prev, [campanha.id]: novoStatus === 'true' ? 'rodando' : 'pausado' })); }
    } catch (error) { alert('❌ Erro no SMTP.'); }
  }

  const htmlPreviewFinal = montarHtmlFinal({ titulo: tituloemail, cabecalho: cabecalhoEmail, conteudo: emailCru, etapaEmail: etapa, cursoNome: campanhaSelecionada?.nome || '' });

  return (
    <div>
      <Header titulo="Central de Disparos Múltiplos" />
      <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>

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
                  <option value="">Selecione...</option><option value="1">1º E-mail</option><option value="2">2º E-mail</option><option value="3">3º E-mail</option><option value="4">4º E-mail</option><option value="5">5º E-mail</option>
                </select>
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
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>Se deixar em branco, o e-mail não terá a faixa azul no topo.</small>
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
              <button type="submit" disabled={salvandoConfig} style={{ background: '#6f42c1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-cloud-arrow-up"></i> Salvar no Banco e Engatilhar</button>
            </div>
          </form>
        </div>

        <div className="panel" style={{ borderTop: '5px solid #007bff', padding: '30px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>2. Painel de Controle de Disparos</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {campanhas.map(campanha => {
              const status = statusCampanhas[campanha.id] || 'ocioso';
              const config = configsSalvas[campanha.id];

              return (
                <div key={campanha.id} style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd', borderLeft: `5px solid ${status === 'rodando' ? '#28a745' : status === 'pausado' ? '#ffc107' : '#6c757d'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: config ? '1px dashed #ccc' : 'none', paddingBottom: config ? '15px' : '0', marginBottom: config ? '15px' : '0', gap: '15px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.2rem' }}>{campanha.nome}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Status: <strong style={{ color: status === 'rodando' ? '#28a745' : status === 'pausado' ? '#ffc107' : '#6c757d' }}>{status === 'rodando' ? '🟢 RODANDO' : status === 'pausado' ? '🟡 PAUSADO' : '⚪ AGUARDANDO'}</strong></div>
                    </div>

                    {config && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {status === 'ocioso' && (<button onClick={() => iniciarDisparo(campanha)} style={{ padding: '8px 15px', background: '#007bff', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Iniciar Disparos</button>)}
                        {status === 'rodando' && (<button onClick={() => alterarStatusMotor(campanha, 'false')} style={{ padding: '8px 15px', background: '#ffc107', color: '#333', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Pausar</button>)}
                        {status === 'pausado' && (<button onClick={() => alterarStatusMotor(campanha, 'true')} style={{ padding: '8px 15px', background: '#28a745', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retomar</button>)}
                      </div>
                    )}
                  </div>

                  {config && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
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