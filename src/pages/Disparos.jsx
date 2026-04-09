// src/pages/Disparos.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

export function Disparos() {
  const API_URL = 'https://server-js-gestao.onrender.com';
  const WEBHOOK_TESTE = 'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/v2-teste-disparo';

  const [campanhas, setCampanhas] = useState([]);
  const [sequenciaAtual, setSequenciaAtual] = useState([]);

  // NOVO ESTADO DO FILTRO DROPDOWN
  const [cursoAlvo, setCursoAlvo] = useState('');
  const [dropdownCampanhaAberto, setDropdownCampanhaAberto] = useState(false);
  const dropdownRef = useRef(null);

  const [tipoFunil, setTipoFunil] = useState('BROADCAST_FRIO'); 
  const [ordemEtapa, setOrdemEtapa] = useState('1');
  const [dataDisparo, setDataDisparo] = useState('');
  const [horasEspera, setHorasEspera] = useState('');
  const [diasExpiracao, setDiasExpiracao] = useState('');
  const [emailAtivo, setEmailAtivo] = useState(true); // Controle de Desabilitar/Ativar
  
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

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownCampanhaAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

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
</table>`;
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
      alert(error.response?.data?.erro || "Erro ao buscar relatório de cliques.");
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
      setDadosEnvios({ enviados: res.data.enviados || [], fila: res.data.fila || [], falhas: res.data.falhas || [] });
    } catch (error) {
      alert(error.response?.data?.erro || "Erro ao buscar fila.");
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

  // LIGAR / DESLIGAR EMAIL
  async function alternarStatusEmail(email) {
    const statusAtual = email.ativo === false ? false : true;
    const novoStatus = !statusAtual;
    const acao = novoStatus ? 'ATIVAR' : 'DESABILITAR';
    
    if (!window.confirm(`Deseja ${acao} este e-mail? Ele ${novoStatus ? 'voltará a ser enviado' : 'será pulado pelo sistema'} a partir de agora.`)) return;

    try {
      const payload = {
        tipo_funil: email.tipo_funil,
        ordem_etapa: email.ordem_etapa,
        data_disparo_exata: email.data_disparo_exata ? email.data_disparo_exata.split('T')[0] : null,
        horas_espera: email.horas_espera,
        dias_expiracao: email.dias_expiracao,
        titulo_email: email.titulo_email,
        cabecalho_email: email.cabecalho_email,
        html_email: email.html_email,
        ativo: novoStatus 
      };
      
      await axios.put(`${API_URL}/sequencia-emails/${email.id}`, payload, getHeaders());
      carregarSequencia(cursoAlvo);
    } catch (erro) {
      alert('Erro ao alterar o status do e-mail.');
    }
  }

  async function salvarCardEmail(e) {
    e.preventDefault();
    if (!cursoAlvo) return alert('Selecione a Campanha.');

    const ordemDuplicada = sequenciaAtual.find(email => 
      email.tipo_funil === tipoFunil && Number(email.ordem_etapa) === Number(ordemEtapa) && email.id !== editandoEmailId
    );

    if (ordemDuplicada) return alert(`Já existe um e-mail na Etapa ${ordemEtapa} do funil selecionado. Escolha um número de etapa diferente.`);

    setSalvandoConfig(true);

    // ============================================================================
    // A MÁGICA DE CORREÇÃO: SANITIZAÇÃO DE HTML (Resolve Bug de Cliques/Fila)
    // ============================================================================
    // Mesmo que o usuário tenha copiado o email de outra etapa, ou alterado a ordem na tela,
    // este regex substitui forçadamente as variáveis de rastreio para apontarem para o funil correto antes de salvar.
    let htmlCorrigido = emailCru;
    htmlCorrigido = htmlCorrigido.replace(/([?&]|&amp;)etapa=[^&"']*/g, `$1etapa=${ordemEtapa}`);
    htmlCorrigido = htmlCorrigido.replace(/([?&]|&amp;)tipo=[^&"']*/g, `$1tipo=${tipoFunil}`);
    htmlCorrigido = htmlCorrigido.replace(/([?&]|&amp;)curso=[^&"']*/g, `$1curso=${cursoAlvo}`);

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
      html_email: htmlCorrigido, // Envia o HTML blindado contra erros!
      ativo: emailAtivo
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
    setEmailAtivo(true);
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
    setEmailAtivo(emailConfig.ativo === false ? false : true);
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
      alert('✅ E-mail de teste enviado!');
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
    <>
      <Header titulo="Construtor de Funis e Automação" />
      <PageContainer>
        
        <TopSection>
          <div>
            <Title>Máquina de Disparos</Title>
            <Subtitle>Configure as regras e horários dos e-mails automatizados.</Subtitle>
          </div>
          
          <FilterPillWrapper ref={dropdownRef}>
            <FilterButton 
              $hasValue={!!cursoAlvo} 
              onClick={() => setDropdownCampanhaAberto(!dropdownCampanhaAberto)}
            >
              <i className="fa-solid fa-layer-group icon"></i> 
              <span>Campanha: <strong>{campanhaSelecionada ? campanhaSelecionada.nome : '-- Selecione --'}</strong></span>
              <i className={`fa-solid fa-chevron-${dropdownCampanhaAberto ? 'up' : 'down'} arrow`}></i>
            </FilterButton>
            
            {dropdownCampanhaAberto && (
              <CustomDropdownMenu>
                <CustomDropdownItem 
                  $active={cursoAlvo === ''} 
                  onClick={() => { setCursoAlvo(''); setDropdownCampanhaAberto(false); limparFormularioEmail(); }}
                >
                  -- Selecione uma Campanha --
                </CustomDropdownItem>
                {campanhas.map(c => (
                  <CustomDropdownItem 
                    key={c.id} 
                    $active={cursoAlvo === String(c.id)} 
                    onClick={() => { setCursoAlvo(String(c.id)); setDropdownCampanhaAberto(false); limparFormularioEmail(); }}
                  >
                    {c.nome}
                  </CustomDropdownItem>
                ))}
              </CustomDropdownMenu>
            )}
          </FilterPillWrapper>
        </TopSection>

        {campanhaSelecionada && (
          <MotorControlPanel>
            <div className="motor-info">
              <h3><i className="fa-solid fa-robot"></i> Motor de Disparos: {campanhaSelecionada.nome}</h3>
              <p>Controle a injeção de leads e os envios automáticos para esta campanha.</p>
            </div>
            <div className="motor-actions">
              {campanhaSelecionada.status_motor === 'rodando' ? (
                <>
                  <StatusBadge $color="green"><i className="fa-solid fa-check-circle"></i> Rodando</StatusBadge>
                  <MotorButton $color="yellow" onClick={alternarStatusMotor}><i className="fa-solid fa-pause"></i> Pausar</MotorButton>
                </>
              ) : campanhaSelecionada.status_motor === 'pausado' ? (
                <>
                  <StatusBadge $color="yellow"><i className="fa-solid fa-pause-circle"></i> Pausada</StatusBadge>
                  <MotorButton $color="green" onClick={alternarStatusMotor}><i className="fa-solid fa-play"></i> Retomar</MotorButton>
                </>
              ) : (
                <MotorButton $color="green" onClick={iniciarCampanha}>
                  <i className="fa-solid fa-rocket"></i> Iniciar Automação
                </MotorButton>
              )}
            </div>
          </MotorControlPanel>
        )}

        {cursoAlvo && (
          <FunnelsGrid>
            {/* BROADCAST FRIOS */}
            <FunnelColumn>
              <h3 className="text-blue"><i className="fa-solid fa-snowflake"></i> Broadcast Frios</h3>
              <p>Disparado para a base geral.</p>
              
              {broadcastsFrios.length === 0 && <EmptyFunnelMsg>Nenhum e-mail agendado.</EmptyFunnelMsg>}
              {broadcastsFrios.map(email => (
                <EmailCard key={email.id} $active={editandoEmailId === email.id} $borderColor="#007bff" $inativo={email.ativo === false}>
                  <div className="card-header">
                    <span className="step-badge">Etapa {email.ordem_etapa}</span>
                    {email.ativo === false && <span className="expire-badge danger">Desabilitado</span>}
                  </div>
                  <div className="email-title">{email.titulo_email}</div>
                  <div className="email-meta"><i className="fa-regular fa-clock"></i> Dia {email.data_disparo_exata ? exibirDataISO(email.data_disparo_exata) : '-'}</div>
                  
                  <div className="card-actions-top">
                    <ActionButton onClick={() => carregarParaEdicao(email)}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</ActionButton>
                    <ActionButton className={email.ativo === false ? "success" : "warning"} onClick={() => alternarStatusEmail(email)}>
                      <i className={`fa-solid ${email.ativo === false ? 'fa-play' : 'fa-ban'}`}></i>
                      {email.ativo === false ? 'Ativar' : 'Desabilitar'}
                    </ActionButton>
                  </div>
                  <div className="card-actions-bottom">
                    <ActionButton className="primary" onClick={() => abrirModalEnvios(email)}><i className="fa-solid fa-paper-plane"></i> Fila</ActionButton>
                    <ActionButton className="info" onClick={() => abrirModalCliques(email)}><i className="fa-solid fa-mouse-pointer"></i> Cliques</ActionButton>
                  </div>
                </EmailCard>
              ))}
            </FunnelColumn>

            {/* BROADCAST QUENTES */}
            <FunnelColumn>
              <h3 className="text-red"><i className="fa-solid fa-heart"></i> Broadcast Quentes</h3>
              <p>Clientes e assessorados.</p>
              
              {broadcastsQuentes.length === 0 && <EmptyFunnelMsg>Nenhum e-mail agendado.</EmptyFunnelMsg>}
              {broadcastsQuentes.map(email => (
                <EmailCard key={email.id} $active={editandoEmailId === email.id} $borderColor="#dc3545" $inativo={email.ativo === false}>
                  <div className="card-header">
                    <span className="step-badge">Etapa {email.ordem_etapa}</span>
                    {email.ativo === false && <span className="expire-badge danger">Desabilitado</span>}
                  </div>
                  <div className="email-title">{email.titulo_email}</div>
                  <div className="email-meta"><i className="fa-regular fa-clock"></i> Dia {email.data_disparo_exata ? exibirDataISO(email.data_disparo_exata) : '-'}</div>
                  
                  <div className="card-actions-top">
                    <ActionButton onClick={() => carregarParaEdicao(email)}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</ActionButton>
                    <ActionButton className={email.ativo === false ? "success" : "warning"} onClick={() => alternarStatusEmail(email)}>
                      <i className={`fa-solid ${email.ativo === false ? 'fa-play' : 'fa-ban'}`}></i>
                      {email.ativo === false ? 'Ativar' : 'Desabilitar'}
                    </ActionButton>
                  </div>
                  <div className="card-actions-bottom">
                    <ActionButton className="primary" onClick={() => abrirModalEnvios(email)}><i className="fa-solid fa-paper-plane"></i> Fila</ActionButton>
                    <ActionButton className="info" onClick={() => abrirModalCliques(email)}><i className="fa-solid fa-mouse-pointer"></i> Cliques</ActionButton>
                  </div>
                </EmailCard>
              ))}
            </FunnelColumn>

            {/* PÓS CLIQUE */}
            <FunnelColumn>
              <h3 className="text-orange"><i className="fa-solid fa-fire"></i> Funil Pós-Clique</h3>
              <p>Gatilho de tempo e expiração.</p>
              
              {posCliques.length === 0 && <EmptyFunnelMsg>Nenhum e-mail agendado.</EmptyFunnelMsg>}
              {posCliques.map(email => (
                <EmailCard key={email.id} $active={editandoEmailId === email.id} $borderColor="#fd7e14" $inativo={email.ativo === false}>
                  <div className="card-header">
                    <span className="step-badge">Etapa {email.ordem_etapa}</span>
                    <div style={{display:'flex', gap:'5px'}}>
                      {email.dias_expiracao ? (
                         <span className="expire-badge danger">Expira: Dia {email.dias_expiracao}</span>
                      ) : (
                         <span className="expire-badge success">Sempre Válido</span>
                      )}
                      {email.ativo === false && <span className="expire-badge danger">Desabilitado</span>}
                    </div>
                  </div>
                  <div className="email-title">{email.titulo_email}</div>
                  <div className="email-meta"><i className="fa-solid fa-hourglass-half"></i> Delay na Fila: {email.horas_espera}h</div>
                  
                  <div className="card-actions-top">
                    <ActionButton onClick={() => carregarParaEdicao(email)}>{editandoEmailId === email.id ? 'Editando' : 'Editar'}</ActionButton>
                    <ActionButton className={email.ativo === false ? "success" : "warning"} onClick={() => alternarStatusEmail(email)}>
                      <i className={`fa-solid ${email.ativo === false ? 'fa-play' : 'fa-ban'}`}></i>
                      {email.ativo === false ? 'Ativar' : 'Desabilitar'}
                    </ActionButton>
                  </div>
                  <div className="card-actions-bottom">
                    <ActionButton className="primary" onClick={() => abrirModalEnvios(email)}><i className="fa-solid fa-paper-plane"></i> Fila</ActionButton>
                    <ActionButton className="info" onClick={() => abrirModalCliques(email)}><i className="fa-solid fa-mouse-pointer"></i> Cliques</ActionButton>
                  </div>
                </EmailCard>
              ))}
            </FunnelColumn>
          </FunnelsGrid>
        )}

        <EditorPanel ref={preparacaoRef} $visible={!!cursoAlvo}>
          <div className="editor-header">
            <h2>{editandoEmailId ? `Editando E-mail (Ordem ${ordemEtapa})` : '2. Adicionar Novo E-mail ao Funil'}</h2>
            {editandoEmailId && (
              <button onClick={limparFormularioEmail} className="cancel-btn">
                <i className="fa-solid fa-times"></i> Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={salvarCardEmail}>
            <FormGrid $isPosClique={tipoFunil === 'POS_CLIQUE'}>
              <FormGroup>
                <label>Qual Funil? *</label>
                <div className="select-container highlight">
                  <select value={tipoFunil} onChange={e => setTipoFunil(e.target.value)} required>
                    <option value="BROADCAST_FRIO">Broadcast (Frios / Mornos)</option>
                    <option value="BROADCAST_QUENTE">Broadcast (Quentes / Clientes)</option>
                    <option value="POS_CLIQUE">Pós-Clique (Timeline / Expiração)</option>
                  </select>
                  <i className="fa-solid fa-chevron-down arrow"></i>
                </div>
              </FormGroup>

              {tipoFunil.includes('BROADCAST') ? (
                <FormGroup className="span-2">
                  <label className="text-blue"><i className="fa-regular fa-calendar"></i> Data de Disparo *</label>
                  <input type="date" required value={dataDisparo} onChange={e => setDataDisparo(e.target.value)} />
                </FormGroup>
              ) : (
                <>
                  <FormGroup>
                    <label className="text-orange"><i className="fa-solid fa-hourglass-half"></i> Espera (Horas) *</label>
                    <input type="number" required placeholder="Ex: 48" value={horasEspera} onChange={e => setHorasEspera(e.target.value)} />
                  </FormGroup>
                  <FormGroup>
                    <label className="text-red"><i className="fa-solid fa-ban"></i> Expira em (Dias)</label>
                    <input type="number" placeholder="Nunca expira" value={diasExpiracao} onChange={e => setDiasExpiracao(e.target.value)} />
                  </FormGroup>
                </>
              )}

              <FormGroup>
                <label>Ordem (Etapa/Índice) *</label>
                <input type="number" required placeholder="Ex: 1" value={ordemEtapa} onChange={e => setOrdemEtapa(e.target.value)} />
              </FormGroup>

              <FormGroup className="span-full">
                <label>Assunto do E-mail *</label>
                <input type="text" required value={tituloemail} onChange={e => setTituloemail(e.target.value)} />
              </FormGroup>
            </FormGrid>

            <FormGroup style={{marginBottom: '20px'}}>
              <label className="text-dark-blue"><i className="fa-solid fa-window-maximize"></i> Texto da Faixa Azul Superior (Opcional)</label>
              <input type="text" className="bg-light-blue" value={cabecalhoEmail} onChange={e => setCabecalhoEmail(e.target.value)} placeholder="Ex: Não seguimos tendências genéricas. Queremos realizar capacitações que resolvam problemas reais." />
            </FormGroup>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Conteúdo do E-mail (Miolo) *</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <ActionButton className="info" type="button" onClick={() => setMostrarPreview(true)}><i className="fa-solid fa-eye"></i> Pré-visualizar HTML</ActionButton>
                  <ActionButton className="secondary" type="button" onClick={() => setModoVisual(!modoVisual)}><i className="fa-solid fa-code"></i> {modoVisual ? 'Modo HTML Cru' : 'Modo Visual (Editor)'}</ActionButton>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <SmallButton type="button" onClick={inserirParagrafo}>+ Parágrafo</SmallButton>
                <SmallButton type="button" onClick={inserirTituloSecundario}>+ Título</SmallButton>
                <SmallButton type="button" onClick={inserirListaNaoOrdenada}>+ Lista (Bolinhas)</SmallButton>
                <SmallButton type="button" onClick={inserirListaOrdenada}>+ Lista (Números)</SmallButton>
                <SmallButton type="button" onClick={inserirLinhaSeparadora}>+ Linha</SmallButton>
                <SmallButton type="button" className="text-blue font-bold border-blue" onClick={inserirLinkTextoRastreado}>+ Link rastreado</SmallButton>
                <SmallButton type="button" className="text-green font-bold border-green" onClick={inserirBotaoRastreado}>+ Botão Verde</SmallButton>
                <SmallButton type="button" className="text-cyan font-bold border-cyan" onClick={inserirAvisoSeguranca}>+ Aviso de Segurança</SmallButton>
                <SmallButton type="button" className="text-red font-bold border-red" onClick={() => setEmailCru(getEmailPadrao())}>Restaurar modelo</SmallButton>
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
              <ActionButton className="secondary" type="button" onClick={handleEnviarTeste} disabled={enviandoTeste}>
                <i className="fa-solid fa-paper-plane"></i> Disparo de Teste
              </ActionButton>
              <ActionButton className="primary" type="submit" disabled={salvandoConfig}>
                <i className={`fa-solid ${editandoEmailId ? 'fa-save' : 'fa-plus'}`}></i> {editandoEmailId ? 'Salvar Alterações' : 'Adicionar à Sequência'}
              </ActionButton>
            </div>
          </form>
        </EditorPanel>

        {/* MODAL DE PREVIEW HTML */}
        {mostrarPreview && (
          <ModalOverlay onClick={() => setMostrarPreview(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <h3>Visualização Final do E-mail</h3>
                <CloseButton onClick={() => setMostrarPreview(false)}>&times;</CloseButton>
              </ModalHeader>
              <div style={{ padding: '0', flex: 1, backgroundColor: '#f4f6f8' }}>
                <iframe srcDoc={htmlPreviewFinal} style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }} title="Preview" />
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* MODAL 1: CLIQUES DETALHADOS */}
        {mostrarModalCliques && (
          <ModalOverlay onClick={() => setMostrarModalCliques(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <div>
                  <h3 className="text-blue"><i className="fa-solid fa-mouse-pointer"></i> Relatório de Cliques</h3>
                  <div className="subtitle">{emailSelecionadoModal?.titulo_email} (Etapa {emailSelecionadoModal?.ordem_etapa})</div>
                </div>
                <CloseButton onClick={() => setMostrarModalCliques(false)}>&times;</CloseButton>
              </ModalHeader>
              
              <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                {carregandoCliques ? (
                  <LoadingContainer><i className="fa-solid fa-spinner fa-spin"></i><br/>Buscando detalhes...</LoadingContainer>
                ) : leadsAgrupados.length === 0 ? (
                  <EmptyMsg>Nenhum clique registrado para este e-mail.</EmptyMsg>
                ) : (
                  <Table>
                    <thead className="sticky-head">
                      <tr><th>Contato (Lead)</th><th>Links Clicados</th></tr>
                    </thead>
                    <tbody>
                      {leadsAgrupados.map(lead => {
                         const interacoes = lead.interacoes;
                         const ultimaInteracao = interacoes[0]; 
                         const historicoAntigo = interacoes.slice(1); 
                         const estaExpandido = leadsExpandidos.includes(lead.id);

                         return (
                          <tr key={lead.id}>
                            <td style={{ verticalAlign: 'top', width: '40%' }}>
                              <strong>{lead.nome}</strong>
                              <div className="contact-subtext">{lead.email}</div>
                            </td>
                            <td style={{ verticalAlign: 'top' }}>
                              <ClickBadge>
                                <span className="link-name">{ultimaInteracao.link}</span>
                                <span className="link-time">{formatarDataHora(ultimaInteracao.data)}</span>
                              </ClickBadge>

                              {historicoAntigo.length > 0 && (
                                <ExpandButton onClick={() => toggleLeadHistorico(lead.id)}>
                                  <i className={`fa-solid ${estaExpandido ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i> 
                                  {estaExpandido ? ' Ocultar histórico' : ` Ver mais ${historicoAntigo.length} clique(s) anterior(es)`}
                                </ExpandButton>
                              )}

                              {estaExpandido && historicoAntigo.map((int, i) => (
                                <ClickBadge key={i} className="faded">
                                  <span className="link-name">{int.link}</span>
                                  <span className="link-time">{formatarDataHora(int.data)}</span>
                                </ClickBadge>
                              ))}
                            </td>
                          </tr>
                         );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* MODAL 2: FILA E ENVIOS */}
        {mostrarModalEnvios && (
          <ModalOverlay onClick={() => setMostrarModalEnvios(false)}>
            <ModalContent $large onClick={e => e.stopPropagation()}>
              <ModalHeader $bg="#6f42c1" $color="#fff">
                <div>
                  <h3 style={{color: '#fff', margin: 0}}><i className="fa-solid fa-paper-plane"></i> Relatório de Envios e Fila</h3>
                  <div className="subtitle" style={{color: '#e2e8f0'}}>{emailSelecionadoModal?.titulo_email}</div>
                </div>
                <CloseButton $color="#fff" onClick={() => setMostrarModalEnvios(false)}>&times;</CloseButton>
              </ModalHeader>
              
              <div style={{ padding: '20px', flex: 1, overflowY: 'auto', background: '#f4f6f8' }}>
                {carregandoEnvios ? (
                  <LoadingContainer><i className="fa-solid fa-spinner fa-spin"></i><br/>Carregando dados da fila...</LoadingContainer>
                ) : (
                  <Grid3Col>
                    {/* COLUNA 1: JÁ ENVIADOS */}
                    <div className="col-wrapper">
                      <div className="col-header success"><i className="fa-solid fa-check-double"></i> Já Enviados ({dadosEnvios.enviados?.length || 0})</div>
                      <div className="col-body">
                        {dadosEnvios.enviados?.length === 0 && <EmptyMsg>Nenhum envio registrado.</EmptyMsg>}
                        {dadosEnvios.enviados?.map((envio, idx) => (
                          <div key={idx} className="list-item">
                            <strong>{envio.nome}</strong>
                            <span className="sub">{envio.email_destino}</span>
                            <span className="date success">{formatarDataHora(envio.data_envio)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COLUNA 2: NA FILA */}
                    <div className="col-wrapper">
                      <div className="col-header warning"><i className="fa-solid fa-hourglass-half"></i> Na Fila ({dadosEnvios.fila?.length || 0})</div>
                      <div className="col-body">
                        {dadosEnvios.fila?.length === 0 && <EmptyMsg>Fila vazia para esta etapa.</EmptyMsg>}
                        {dadosEnvios.fila?.map((lead, idx) => {
                          let emailExibicao = 'Sem e-mail';
                          try {
                            const emailsArray = typeof lead.emails_json === 'string' ? JSON.parse(lead.emails_json) : lead.emails_json;
                            if (emailsArray && emailsArray.length > 0) emailExibicao = emailsArray[0];
                          } catch(e) {}
                          return (
                            <div key={idx} className="list-item">
                              <strong>{lead.nome}</strong>
                              <span className="sub">{emailExibicao}</span>
                              <span className="date warning">Aguardando disparo</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUNA 3: ERROS / BLACKLIST */}
                    <div className="col-wrapper">
                      <div className="col-header danger"><i className="fa-solid fa-circle-exclamation"></i> Falhas / Bloqueados ({dadosEnvios.falhas?.length || 0})</div>
                      <div className="col-body">
                        {dadosEnvios.falhas?.length === 0 && <EmptyMsg>Nenhuma falha registrada.</EmptyMsg>}
                        {dadosEnvios.falhas?.map((falha, idx) => (
                          <div key={idx} className="list-item danger-bg">
                            <strong>{falha.nome}</strong>
                            <span className="sub danger-text">{falha.email}</span>
                            <span className="reason">Motivo: {falha.motivo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Grid3Col>
                )}
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

      </PageContainer>
    </>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
`;

const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

const FilterPillWrapper = styled.div`
  position: relative; display: inline-block;
`;
const FilterButton = styled.button`
  display: flex; align-items: center; background: ${props => props.$hasValue ? '#ffffff' : '#f8fafc'};
  border: 1px solid ${props => props.$hasValue ? '#007bff' : '#cbd5e1'}; color: #2c3e50; padding: 10px 18px; border-radius: 50px; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02);

  &:hover { background: #e7f3ff; border-color: #007bff; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,123,255,0.1); }
  span { margin: 0 10px; strong { color: #007bff; } }
  .icon { color: #007bff; font-size: 1.05rem; }
  .arrow { color: #007bff; font-size: 0.8rem; }
`;

const CustomDropdownMenu = styled.ul`
  position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; border: 1px solid #edf2f9; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width: 250px; max-height: 300px; overflow-y: auto; z-index: 1000; padding: 8px 0; list-style: none; margin: 0; animation: fadeInDown 0.2s ease-out;
  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
const CustomDropdownItem = styled.li`
  padding: 12px 20px; font-size: 0.95rem; color: ${props => props.$active ? '#007bff' : '#495057'}; background: ${props => props.$active ? '#f0f7ff' : 'transparent'}; font-weight: ${props => props.$active ? '700' : '500'}; cursor: pointer; transition: background 0.2s;
  &:hover { background: #f8fafc; color: #007bff; }
`;

const MotorControlPanel = styled.div`
  background: #ffffff; padding: 20px 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #edf2f9; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px;

  .motor-info {
    h3 { margin: 0 0 5px 0; color: #2c3e50; display: flex; align-items: center; gap: 8px; font-size: 1.2rem;}
    p { margin: 0; font-size: 0.9rem; color: #6c757d; }
  }
  .motor-actions { display: flex; align-items: center; gap: 15px; }
`;

const StatusBadge = styled.div`
  padding: 10px 15px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;
  background: ${props => props.$color === 'green' ? '#e6f4ea' : '#fff3cd'};
  color: ${props => props.$color === 'green' ? '#155724' : '#856404'};
  border: 1px solid ${props => props.$color === 'green' ? '#c3e6cb' : '#ffeeba'};
`;

const MotorButton = styled.button`
  padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;
  background: ${props => props.$color === 'green' ? '#28a745' : '#ffc107'};
  color: ${props => props.$color === 'green' ? '#fff' : '#333'};
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
`;

// --- FUNIS DE EMAILS ---
const FunnelsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;
`;

const FunnelColumn = styled.div`
  background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px;

  h3 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;}
  p { font-size: 0.85rem; color: #6c757d; margin: 0 0 5px 0; }
  .text-blue { color: #007bff; } .text-red { color: #dc3545; } .text-orange { color: #fd7e14; }
`;

const EmptyFunnelMsg = styled.div`
  padding: 20px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; color: #a0aec0; font-size: 0.9rem; font-style: italic;
`;

const EmailCard = styled.div`
  background: ${props => props.$active ? '#f0f7ff' : '#ffffff'};
  padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid ${props => props.$inativo ? '#cbd5e1' : props.$borderColor};
  box-shadow: 0 2px 5px rgba(0,0,0,0.02); transition: transform 0.2s;
  opacity: ${props => props.$inativo ? 0.6 : 1}; /* Deixa o cartão apagado se inativo */

  &:hover { transform: ${props => props.$inativo ? 'none' : 'translateY(-2px)'}; box-shadow: ${props => props.$inativo ? 'none' : '0 4px 10px rgba(0,0,0,0.05)'}; }

  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .step-badge { font-size: 0.75rem; font-weight: 700; color: ${props => props.$inativo ? '#64748b' : props.$borderColor}; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid ${props => props.$inativo ? '#cbd5e1' : props.$borderColor}; }
  .expire-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .expire-badge.success { background: #d4edda; color: #155724; }
  .expire-badge.danger { background: #f8d7da; color: #721c24; }

  .email-title { font-weight: 700; color: #2c3e50; font-size: 0.95rem; margin-bottom: 5px; text-decoration: ${props => props.$inativo ? 'line-through' : 'none'}; }
  .email-meta { font-size: 0.8rem; color: #6c757d; margin-bottom: 12px; display: flex; align-items: center; gap: 5px;}

  .card-actions-top, .card-actions-bottom { display: flex; gap: 5px; }
  .card-actions-top { border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-bottom: 5px;}
`;

// --- EDITOR ---
const EditorPanel = styled.div`
  background: #ffffff; border-top: 5px solid #6f42c1; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 30px;
  opacity: ${props => props.$visible ? 1 : 0.5}; pointer-events: ${props => props.$visible ? 'auto' : 'none'};

  .editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
  h2 { margin: 0; color: #2c3e50; font-size: 1.4rem; }
  .cancel-btn { background: #e9ecef; color: #495057; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; &:hover{background:#dde2e6;} }
`;

const FormGrid = styled.div`
  display: grid; gap: 15px; background: #f8fafc; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px;
  grid-template-columns: ${props => props.$isPosClique ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'};
  
  .span-2 { grid-column: span 2; }
  .span-full { grid-column: 1 / -1; }
  
  @media (max-width: 768px) { grid-template-columns: 1fr !important; .span-2, .span-full { grid-column: span 1 !important; } }
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;

  label { font-weight: 600; font-size: 0.9rem; color: #495057; display: flex; align-items: center; gap: 6px;}
  .text-blue { color: #007bff; } .text-orange { color: #fd7e14; } .text-red { color: #dc3545; } .text-dark-blue { color: #1F4E79; }

  input, select {
    width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; transition: 0.2s;
    &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
    &.bg-light-blue { background: #eef4fa; border-color: #b8cde1; }
  }

  .select-container {
    position: relative;
    &.highlight select { border: 2px solid #6f42c1; color: #6f42c1; font-weight: 700; appearance: none; padding-right: 30px;}
    .arrow { position: absolute; right: 12px; top: 15px; color: #6f42c1; pointer-events: none; font-size: 0.8rem; }
  }
`;

// --- BOTÕES GENÉRICOS ---
const ActionButton = styled.button`
  flex: 1; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;

  background: #e2e8f0; color: #475569; /* Default */
  &:hover { background: #cbd5e1; }

  &.primary { background: #007bff; color: #fff; &:hover { background: #0056b3; } }
  &.secondary { background: #6c757d; color: #fff; &:hover { background: #5a6268; } }
  &.danger { background: #ffeeba; color: #856404; &:hover { background: #f5d371; } }
  &.info { background: #17a2b8; color: #fff; &:hover { background: #117a8b; } }
  
  /* Botões de Status Ativar/Desabilitar */
  &.success { background: #d4edda; color: #155724; &:hover { background: #c3e6cb; } }
  &.warning { background: #fff3cd; color: #856404; &:hover { background: #ffeeba; } }
  
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SmallButton = styled.button`
  padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; transition: 0.2s; color: #495057;

  &:hover { background: #f8fafc; border-color: #a0aec0; }
  &.text-blue { color: #0056b3; background: #e7f3ff; border-color: #b8daff; }
  &.text-green { color: #155724; background: #d4edda; border-color: #c3e6cb; }
  &.text-cyan { color: #0c5460; background: #d1ecf1; border-color: #bee5eb; }
  &.text-red { color: #721c24; background: #f8d7da; border-color: #f5c6cb; }
`;

// --- MODAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px); padding: 20px;
`;
const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: ${props => props.$large ? '1100px' : '800px'}; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px; background: ${props => props.$bg || '#fbfbfc'}; border-bottom: 1px solid #edf2f9;
  h3 { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; color: ${props => props.$color || '#333'}; }
  .text-blue { color: #007bff; }
  .subtitle { font-size: 0.85rem; margin-top: 4px; font-weight: 600; color: ${props => props.$color ? 'rgba(255,255,255,0.8)' : '#6c757d'}; }
`;
const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; cursor: pointer; transition: 0.2s; color: ${props => props.$color || '#a0aec0'};
  &:hover { color: #dc3545; }
`;

// --- TABELAS DOS MODAIS ---
const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th { text-align: left; padding: 15px 20px; background: #f8fafc; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; }
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; color: #2c3e50; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background-color: #fbfbfc; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1); }
  .contact-subtext { font-size: 0.8rem; color: #6c757d; margin-top: 3px; }
`;

const ClickBadge = styled.div`
  display: flex; justify-content: space-between; align-items: center; background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px;
  .link-name { font-size: 0.85rem; font-weight: 700; color: #007bff; }
  .link-time { font-size: 0.75rem; color: #6c757d; }
  &.faded { background: #f8f9fa; border-color: #e2e8f0; .link-name { color: #6c757d; } }
`;

const ExpandButton = styled.button`
  background: none; border: none; color: #17a2b8; font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 5px 0; margin-top: 5px; display: flex; align-items: center; gap: 5px;
  &:hover { text-decoration: underline; }
`;

const EmptyMsg = styled.div`
  text-align: center; padding: 40px; background: #ffffff; border-radius: 8px; color: #a0aec0; font-style: italic; border: 1px dashed #cbd5e1;
`;

const LoadingContainer = styled.div`
  text-align: center; padding: 60px; color: #6c757d; font-size: 1.1rem; i { font-size: 2.5rem; margin-bottom: 15px; color: #cbd5e1; }
`;

const Grid3Col = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }

  .col-wrapper { background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
  .col-header { padding: 12px 15px; font-weight: 700; border-bottom: 1px solid transparent; display: flex; align-items: center; gap: 8px;}
  .col-header.success { background: #e6f4ea; color: #155724; border-color: #c3e6cb; }
  .col-header.warning { background: #fff3cd; color: #856404; border-color: #ffeeba; }
  .col-header.danger { background: #f8d7da; color: #721c24; border-color: #f5c6cb; }

  .col-body { padding: 10px; max-height: 450px; overflow-y: auto; }
  .list-item { padding: 10px; border-bottom: 1px solid #edf2f9; }
  .list-item:last-child { border-bottom: none; }
  .list-item.danger-bg { background: #fff5f5; border-radius: 6px; margin-bottom: 5px; border-bottom: none;}

  .list-item strong { display: block; color: #2c3e50; font-size: 0.9rem; }
  .list-item .sub { display: block; color: #6c757d; font-size: 0.8rem; margin-top: 2px;}
  .list-item .sub.danger-text { color: #dc3545; font-weight: 600; }
  .list-item .date { display: block; font-size: 0.75rem; margin-top: 4px; font-weight: 600;}
  .list-item .date.success { color: #28a745; }
  .list-item .date.warning { color: #d39e00; }
  .list-item .reason { display: block; color: #721c24; font-size: 0.75rem; margin-top: 4px; font-style: italic; }
`;