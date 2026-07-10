import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';

// Importações do GrapesJS
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import ptLocale from 'grapesjs/locale/pt';
import { campanhaEstaAtiva } from '../utils/campanhaStatus.js';
import { useBloqueioEdicao } from '../hooks/useBloqueioEdicao.js';

export function LandingPages() {
  const [paginas, setPaginas] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [campanhasIds, setCampanhasIds] = useState([]);
  const [dropdownCampanhasAberto, setDropdownCampanhasAberto] = useState(false);
  const chipInputRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const [buscaGeral, setBuscaGeral] = useState('');

  // === ESTADOS DO SUPER MODAL DO GRAPESJS ===
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const { tentarAbrir: tentarAbrirTravaLandingPage, liberar: liberarTravaLandingPage } = useBloqueioEdicao('landing_page', {
    onTravaPerdida: () => {
      alert('Sua edição expirou por inatividade — esta página foi liberada para outro usuário.');
      setMostrarModal(false);
    },
  });
  useEffect(() => () => { liberarTravaLandingPage(); }, [liberarTravaLandingPage]);
  
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [statusLP, setStatusLP] = useState('rascunho');
  const [campanhaId, setCampanhaId] = useState('');
  
  const [publicandoLP, setPublicandoLP] = useState(false);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);

  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
  const LANDING_DOMAIN = import.meta.env?.VITE_LANDING_DOMAIN || 'https://conteudo2.gestao.srv.br';
  
  const editorRef = useRef(null);
  const [htmlInicial, setHtmlInicial] = useState('');
  const [cssInicial, setCssInicial] = useState('');
  const [extraHtmlHead, setExtraHtmlHead] = useState('');
  const [extraBodyScripts, setExtraBodyScripts] = useState('');
  const [htmlAttributes, setHtmlAttributes] = useState('');
  const [bodyAttributes, setBodyAttributes] = useState('');
  const [importErro, setImportErro] = useState('');
  const [mostrarHtmlBruto, setMostrarHtmlBruto] = useState(false);
  const [htmlBruto, setHtmlBruto] = useState('');
  const [cssBruto, setCssBruto] = useState('');
  const [idsList, setIdsList] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [selectedComponentType, setSelectedComponentType] = useState('');
  const fileInputRef = useRef(null);

  const getMarkupFormularioCRM = () => `
    <section id="inscricao" style="padding: 80px 20px; background: #0B192C; border-radius: 24px; color: #f8fafc; font-family: Arial, sans-serif;">
      <div style="max-width: 1100px; margin: 0 auto;">
        <div style="margin-bottom: 40px; text-align: center;">
          <p style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #F59E0B; margin: 0 0 10px;">Capacitação aplicada</p>
          <h2 style="font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin: 0; color: #ffffff;">Garanta sua vaga na turma</h2>
          <p style="margin: 16px auto 0; max-width: 720px; color: #cbd5e1; font-size: 1rem; line-height: 1.8;">Preencha seus dados abaixo e receba a inscrição diretamente no CRM.</p>
        </div>

        <div style="background: rgba(15, 25, 48, 0.92); border: 1px solid rgba(245, 158, 11, 0.18); border-radius: 24px; padding: 36px; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.45);">
          <form id="formInscricaoCRM" style="display: grid; gap: 18px;" autocomplete="on">
            <div style="display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label>
                <input type="text" id="nome" name="nome" autocomplete="name" required placeholder="Seu nome completo" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label>
                <input type="tel" id="telefone" name="telefone" autocomplete="tel" required placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>
            <div style="display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label>
                <input type="text" id="formacao" name="formacao" autocomplete="organization-title" required placeholder="Sua formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label>
                <input type="text" id="cargo" name="cargo" autocomplete="job-title" required placeholder="Seu cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>
            <div style="display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Estado*</label>
                <select id="uf" name="uf" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(15,25,48,0.95); color: #f8fafc; padding: 14px 16px; outline:none; font-size:0.9rem;">
                  <option value="" style="background:#0f1930;color:#fff;">Selecione o estado...</option>
                </select>
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Município*</label>
                <select id="cidade" name="cidade" required disabled style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(15,25,48,0.95); color: #f8fafc; padding: 14px 16px; outline:none; font-size:0.9rem;">
                  <option value="" style="background:#0f1930;color:#fff;">Primeiro selecione o estado...</option>
                </select>
              </div>
            </div>
            <div style="display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr));">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label>
                <input type="email" id="email" name="email" autocomplete="email" required placeholder="seu@email.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">WhatsApp*</label>
                <input type="tel" id="whatsapp" name="whatsapp" autocomplete="tel" required placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Como você nos conheceu?*</label>
              <select id="origem" name="origem" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;">
                <option value="" style="background:#0f1930; color:#f8fafc;">Selecione...</option>
                <option value="Instagram" style="background:#0f1930; color:#f8fafc;">Instagram</option>
                <option value="Facebook" style="background:#0f1930; color:#f8fafc;">Facebook</option>
                <option value="Indicação" style="background:#0f1930; color:#f8fafc;">Indicação</option>
                <option value="Ligação" style="background:#0f1930; color:#f8fafc;">Ligação</option>
                <option value="Whatsapp" style="background:#0f1930; color:#f8fafc;">Whatsapp</option>
                <option value="E-mail" style="background:#0f1930; color:#f8fafc;">E-mail</option>
                <option value="LinkedIn" style="background:#0f1930; color:#f8fafc;">LinkedIn</option>
                <option value="Outros" style="background:#0f1930; color:#f8fafc;">Outros</option>
              </select>
            </div>
            <div id="containerModulos" style="border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(248,250,252,0.12); padding: 18px; color: #f8fafc;">
              <p style="margin: 0; font-size: 0.95rem; color: #f8fafc; opacity: 0.9;">(Os módulos definidos na campanha aparecerão automaticamente aqui quando a página estiver publicada)</p>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">4 + 3 = ? *</label>
              <input type="number" id="captchaCalc" name="captchaCalc" required placeholder="Soma matemática" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
            </div>
            <button type="submit" id="btnSubmit" style="width:100%; padding: 16px 20px; border-radius: 14px; border: none; font-weight: 700; font-size: 1rem; color: #0B192C; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); cursor:pointer;">Enviar meus dados</button>
            <div id="feedback" style="display:none; padding: 14px 16px; border-radius: 12px; text-align:center; font-weight:700;"></div>
            <p style="margin: 0; font-size: 0.82rem; color: rgba(248,250,252,0.72); text-align:center;">Seus dados estão protegidos conosco.</p>
            <div style="margin-top: 24px; border-radius: 30px; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); padding: 15px 28px; text-align: center; box-shadow: 0 25px 50px -25px rgba(0,0,0,0.35);">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B192C;">Consulte o conteúdo programático do curso.</p>
              <a href="https://drive.google.com/file/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; justify-content:center; gap:10px; margin-top: 18px; padding: 16px 24px; min-width: 260px; border-radius: 14px; background: #0B192C; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; box-shadow: 0 15px 30px rgba(0,0,0,0.18);">
                <span style="display: inline-flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <path d="M12 16.5V3" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 10.5L12 16.5L18 10.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 20.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  BAIXAR FOLDER DO CURSO (PDF)
                </span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;

  const scanIdsFromCanvas = (editor) => {
    if (!editor) return;
    try {
      const canvasDoc = editor.Canvas.getDocument();
      if (!canvasDoc) return;
      const ids = Array.from(canvasDoc.querySelectorAll('[id]'))
        .map((el) => el.id)
        .filter(Boolean)
        .filter((id, index, arr) => arr.indexOf(id) === index)
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
      setIdsList(ids);
    } catch (err) {
      console.warn('Não foi possível capturar os ids do canvas do GrapesJS.', err);
    }
  };

  const injectExtraHeadIntoCanvas = (editor, extraHead) => {
    if (!extraHead || !editor) return;
    try {
      const canvasDoc = editor.Canvas.getDocument();
      Array.from(canvasDoc.head.querySelectorAll('[data-lp-imported="true"]')).forEach((node) => node.remove());
      const wrapper = document.createElement('div');
      wrapper.innerHTML = extraHead;
      let hasBase = Boolean(canvasDoc.head.querySelector('base'));

      Array.from(wrapper.children).forEach((node) => {
        const tagName = node.tagName.toLowerCase();
        if (tagName === 'script') {
          const script = canvasDoc.createElement('script');
          Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
          script.setAttribute('data-lp-imported', 'true');
          script.textContent = node.textContent;
          const target = node.getAttribute('src') ? canvasDoc.head : canvasDoc.body;
          target.appendChild(script);
        } else if (tagName === 'link' || tagName === 'meta' || tagName === 'base') {
          if (tagName === 'base') hasBase = true;
          const imported = canvasDoc.createElement(tagName);
          Array.from(node.attributes).forEach(attr => imported.setAttribute(attr.name, attr.value));
          imported.setAttribute('data-lp-imported', 'true');
          canvasDoc.head.appendChild(imported);
        } else if (tagName === 'style') {
          const style = canvasDoc.createElement('style');
          Array.from(node.attributes).forEach(attr => style.setAttribute(attr.name, attr.value));
          style.setAttribute('data-lp-imported', 'true');
          style.textContent = node.textContent;
          canvasDoc.head.appendChild(style);
        } else {
          const imported = canvasDoc.createElement(tagName);
          Array.from(node.attributes).forEach(attr => imported.setAttribute(attr.name, attr.value));
          imported.setAttribute('data-lp-imported', 'true');
          imported.innerHTML = node.innerHTML;
          canvasDoc.head.appendChild(imported);
        }
      });

      if (!hasBase) {
        const base = canvasDoc.createElement('base');
        base.setAttribute('href', '/');
        base.setAttribute('data-lp-imported', 'true');
        canvasDoc.head.insertBefore(base, canvasDoc.head.firstChild);
      }
    } catch (err) {
      console.warn('Não foi possível injetar ativos no preview do GrapesJS.', err);
    }
  };

  const allowAnchorScrollInCanvas = (editor) => {
    if (!editor) return;
    try {
      const canvasWindow = editor.Canvas.getWindow();
      const canvasDoc = editor.Canvas.getDocument();
      if (!canvasWindow || !canvasDoc) return;

      canvasWindow.addEventListener('click', (event) => {
        const anchor = event.target.closest && event.target.closest('a[href^="#"]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const target = canvasDoc.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (canvasWindow.history && canvasWindow.history.pushState) {
          try { canvasWindow.history.pushState(null, '', href); } catch (err) { }
        }
      });
    } catch (err) {
      console.warn('Não foi possível habilitar âncoras no preview do GrapesJS.', err);
    }
  };

  const injectBodyScriptsIntoCanvas = (editor, bodyScripts) => {
    if (!bodyScripts || !editor) return;
    try {
      const canvasDoc = editor.Canvas.getDocument();
      Array.from(canvasDoc.body.querySelectorAll('script[data-lp-imported="true"]')).forEach((node) => node.remove());
      const wrapper = document.createElement('div');
      wrapper.innerHTML = bodyScripts;
      Array.from(wrapper.children).forEach((node) => {
        if (node.tagName.toLowerCase() !== 'script') return;
        const script = canvasDoc.createElement('script');
        Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
        script.setAttribute('data-lp-imported', 'true');
        script.textContent = node.textContent;
        canvasDoc.body.appendChild(script);
      });
    } catch (err) {
      console.warn('Não foi possível injetar scripts do body no preview do GrapesJS.', err);
    }
  };

  const injectCssIntoCanvas = (editor, cssText) => {
    if (!cssText || !editor) return;
    try {
      const canvasDoc = editor.Canvas.getDocument();
      Array.from(canvasDoc.head.querySelectorAll('style[data-lp-imported-css="true"]')).forEach((node) => node.remove());
      const style = canvasDoc.createElement('style');
      style.setAttribute('data-lp-imported-css', 'true');
      style.textContent = cssText;
      canvasDoc.head.appendChild(style);
    } catch (err) {
      console.warn('Não foi possível injetar CSS no preview do GrapesJS.', err);
    }
  };

  const applyHtmlBodyAttributesToCanvas = (editor, htmlAttrs, bodyAttrs) => {
    if (!editor) return;
    try {
      const canvasDoc = editor.Canvas.getDocument();
      const htmlElement = canvasDoc.documentElement;
      const bodyElement = canvasDoc.body;

      Array.from(htmlElement.attributes).forEach((attr) => {
        if (attr.name !== 'data-lp-imported' && attr.name !== 'style') htmlElement.removeAttribute(attr.name);
      });
      Array.from(bodyElement.attributes).forEach((attr) => {
        if (attr.name !== 'data-lp-imported' && attr.name !== 'style') bodyElement.removeAttribute(attr.name);
      });

      if (htmlAttrs) {
        htmlAttrs.split(/\s+(?=[a-zA-Z_:][-a-zA-Z0-9_:.]*=)/g).forEach((attrPair) => {
          const parts = attrPair.split('=');
          if (parts.length < 2) return;
          const name = parts[0].trim();
          const value = attrPair.slice(name.length + 1).replace(/^['"]|['"]$/g, '');
          if (name) htmlElement.setAttribute(name, value);
        });
      }

      if (bodyAttrs) {
        bodyAttrs.split(/\s+(?=[a-zA-Z_:][-a-zA-Z0-9_:.]*=)/g).forEach((attrPair) => {
          const parts = attrPair.split('=');
          if (parts.length < 2) return;
          const name = parts[0].trim();
          const value = attrPair.slice(name.length + 1).replace(/^['"]|['"]$/g, '');
          if (name) bodyElement.setAttribute(name, value);
        });
      }
    } catch (err) {
      console.warn('Não foi possível aplicar atributos de html/body no preview do GrapesJS.', err);
    }
  };

  const extractHtmlAssets = (htmlSource) => {
    if (!htmlSource) return { bodyHtml: '', extraMarkup: '', plainCssText: '', bodyScripts: '', htmlAttrs: '', bodyAttrs: '' };
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlSource, 'text/html');

    const htmlAttrs = Array.from(doc.documentElement.attributes)
      .map((attr) => `${attr.name}="${attr.value}"`)
      .join(' ');
    const bodyAttrs = Array.from(doc.body.attributes)
      .map((attr) => `${attr.name}="${attr.value}"`)
      .join(' ');

    const allStyleTags = Array.from(doc.querySelectorAll('head style, body style'));
    const bodyScriptTags = Array.from(doc.querySelectorAll('body script'));
    const styleMarkup = allStyleTags.map((tag) => tag.outerHTML).join('\n');
    const plainCssText = allStyleTags
      .filter((tag) => (tag.getAttribute('type') || '').toLowerCase() !== 'text/tailwindcss')
      .map((tag) => tag.textContent || '')
      .join('\n');

    allStyleTags.forEach((tag) => tag.remove());
    bodyScriptTags.forEach((tag) => tag.remove());

    const assetSelectors = [
      'head link',
      'head meta',
      'head base',
      'head script[src]',
      'head script:not([src])',
      'body link',
      'body meta',
      'body base'
    ].join(',');

    const assetTags = Array.from(doc.querySelectorAll(assetSelectors))
      .filter((tag) => tag.tagName.toLowerCase() !== 'title')
      .map((tag) => tag.outerHTML)
      .join('\n');

    Array.from(doc.querySelectorAll(assetSelectors))
      .filter((tag) => tag.tagName.toLowerCase() !== 'title')
      .forEach((tag) => tag.remove());

    const extraMarkup = `${styleMarkup}${styleMarkup && assetTags ? '\n' : ''}${assetTags}`;
    const bodyScripts = bodyScriptTags.map((tag) => tag.outerHTML).join('\n');
    return { bodyHtml: doc.body.innerHTML, extraMarkup, plainCssText, bodyScripts, htmlAttrs: htmlAttrs.trim(), bodyAttrs: bodyAttrs.trim() };
  };

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const config = getHeaders();
      const [resPages, resCamps] = await Promise.all([
        axios.get(`${API_URL}/landing-pages`, config),
        axios.get(`${API_URL}/campanhas`, config)
      ]);
      setPaginas(resPages.data);
      setCampanhas(resCamps.data);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
      alert("Falha ao carregar as Landing Pages.");
    } finally {
      setCarregando(false);
    }
  }, [API_URL, getHeaders]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function fecharMenu() { setMenuAbertoId(null); setMenuPos(null); }

  useEffect(() => {
    if (!menuAbertoId) return;
    document.addEventListener('click', fecharMenu);
    return () => document.removeEventListener('click', fecharMenu);
  }, [menuAbertoId]);

  useEffect(() => {
    if (!dropdownCampanhasAberto) return;
    function handleClickFora(e) {
      if (chipInputRef.current && !chipInputRef.current.contains(e.target)) {
        setDropdownCampanhasAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [dropdownCampanhasAberto]);

  // === INICIALIZAÇÃO DO GRAPESJS (MODO LEIGO / BLINDADO) ===
  useEffect(() => {
    if (mostrarModal && !editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        height: '100%',
        width: 'auto',
        storageManager: false,
        plugins: [gjsPresetWebpage],
        pluginsOpts: {
          [gjsPresetWebpage]: {
            modalImportTitle: 'Importar código HTML',
            modalImportButton: 'Importar',
            modalImportLabel: '',
            textCleanCanvas: 'Tem certeza que deseja limpar o canvas? Esta ação não pode ser desfeita.',
          }
        },
        canvas: {
          scripts: ['https://cdn.tailwindcss.com', 'https://unpkg.com/lucide@latest']
        },
        i18n: {
          locale: 'pt',
          localeFallback: 'en',
          messages: {
            pt: {
              ...ptLocale,
              assetManager: {
                ...ptLocale.assetManager,
                modalTitle: 'Selecionar Imagem da Empresa',
                uploadTitle: 'Arraste as imagens aqui ou clique para enviar',
              },
            }
          }
        }
      });

      editorRef.current = editor;

      const addLinkEditorTraits = () => {
        const linkType = editor.DomComponents.getType('link');
        if (!linkType) return;

        const defaultModel = linkType.model;
        const origDefaults = (defaultModel && defaultModel.prototype && defaultModel.prototype.defaults) || {};
        const origTraits = Array.isArray(origDefaults.traits) ? origDefaults.traits : [];
        const existingTraitNames = new Set(origTraits.map((trait) => (typeof trait === 'string' ? trait : trait.name)));

        const extraLinkTraits = [
          { type: 'text', label: 'URL', name: 'href', placeholder: '#inscricao' },
          { type: 'select', label: 'Destino', name: 'target', options: [{ id: '', name: 'mesma aba' }, { id: '_blank', name: 'nova aba' }] },
          { type: 'text', label: 'Título', name: 'title' }
        ].filter((trait) => !existingTraitNames.has(trait.name));

        if (extraLinkTraits.length) {
          editor.DomComponents.addType('link', {
            model: defaultModel.extend({
              defaults: {
                ...origDefaults,
                traits: [...origTraits, ...extraLinkTraits]
              }
            }, {
              isComponent(el) {
                return el.tagName === 'A' ? { type: 'link' } : null;
              }
            }),
            view: linkType.view
          });
        }
      };

      const addCodePanelButton = () => {
        if (!editor.Panels.getPanel('options')) {
          editor.Panels.addPanel({ id: 'options', buttons: [] });
        }

        editor.Panels.addButton('options', [{
          id: 'open-code',
          className: 'fa fa-code',
          command: 'export-template',
          attributes: { title: 'Ver/editar HTML e CSS' }
        }]);
      };

      addLinkEditorTraits();
      addCodePanelButton();

      // Eventos de blindagem
      editor.on('load', () => {
        editor.Panels.removeButton('views', 'open-layers');
        editor.Panels.getButton('views', 'open-blocks').set('active', true);

        if (extraHtmlHead) injectExtraHeadIntoCanvas(editor, extraHtmlHead);
        if (extraBodyScripts) injectBodyScriptsIntoCanvas(editor, extraBodyScripts);
        if (cssInicial) injectCssIntoCanvas(editor, cssInicial);
        applyHtmlBodyAttributesToCanvas(editor, htmlAttributes, bodyAttributes);
        allowAnchorScrollInCanvas(editor);
        scanIdsFromCanvas(editor);

        // Remove blocos nativos desnecessários
        ['text','link','image','video','map',
         'column1','column2','column3','column3-7',
         'quote','grid-items','list-items'].forEach(id => {
          if (editor.BlockManager.get(id)) editor.BlockManager.remove(id);
        });

        // Renomeia apenas os dois blocos nativos mantidos
        const blk = editor.BlockManager.get('text-basic');
        if (blk) blk.set({ label: '<i class="fa fa-align-left fa-2x"></i><br/>Texto', category: 'Elementos' });
        const lnk = editor.BlockManager.get('link-block');
        if (lnk) lnk.set({ label: '<i class="fa fa-hand-pointer fa-2x"></i><br/>Bloco Link', category: 'Elementos' });
      });

      // Abertura automática da galeria ao clicar numa imagem;
      // ao clicar num link abre o painel Traits nativo do GrapesJS
      editor.on('component:selected', (component) => {
        if (!component) return;

        if (component.get('type') === 'image') {
          editor.runCommand('open-assets', { target: component });
          return;
        }

        const tagName = component.get('tagName');
        const type = component.get('type');
        const attrs = component.getAttributes();
        if (tagName === 'a' || type === 'link' || attrs.href) {
          const traitsBtn = editor.Panels.getButton('views', 'open-traits');
          if (traitsBtn) traitsBtn.set('active', true);
        }
      });

      editor.on('component:update:attributes', () => {
        scanIdsFromCanvas(editor);
      });

      editor.on('component:add', () => scanIdsFromCanvas(editor));
      editor.on('component:remove', () => scanIdsFromCanvas(editor));

      // ── BLOCOS: ELEMENTOS ────────────────────────────────────────────────────
      // FORMULÁRIO DE INSCRIÇÃO
      editor.BlockManager.add('rd-form', {
        label: '<i class="fa-solid fa-address-card fa-2x"></i><br/>Form. Inscrição',
        category: 'Elementos',
        content: `
          <section id="inscricao" style="padding: 80px 20px; background-color: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1100px; margin: 0 auto;">
                
                <div style="text-align: center; margin-bottom: 40px;">
                    <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; color: #F59E0B; margin-bottom: 10px;">Investimento e Inscrição</p>
                    <h2 style="font-size: 32px; font-weight: bold; color: #0B192C; margin: 0;">Garanta sua Vaga</h2>
                </div>

                <div style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #0B192C, #1E293B); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h3 style="font-size: 24px; font-weight: bold; color: #F59E0B; margin: 0;">Preencha seus dados</h3>
                        <p style="color: #cbd5e1; font-size: 15px; margin-top: 5px;">Seus dados serão enviados diretamente para nosso sistema seguro.</p>
                    </div>
                    
                    <form id="formInscricaoCRM" style="display: flex; flex-wrap: wrap; gap: 20px;">
                        
                        <div style="flex: 1 1 100%;">
                            <label for="nome" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Nome Completo*</label>
                            <input type="text" id="nome" name="nome" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Seu nome completo">
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="email" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Email*</label>
                            <input type="email" id="email" name="email" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="seu@email.com">
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="whatsapp" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Telefone*</label>
                            <input type="tel" id="whatsapp" name="whatsapp" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="(00) 00000-0000">
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="formacao" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Formação*</label>
                            <input type="text" id="formacao" name="formacao" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Sua formação acadêmica">
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="cargo" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Cargo*</label>
                            <input type="text" id="cargo" name="cargo" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Seu cargo atual">
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="uf" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Estado*</label>
                            <select id="uf" name="uf" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(15,25,48,0.95); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                              <option value="" style="background:#0f1930;color:#fff;">Selecione o estado...</option>
                            </select>
                        </div>

                        <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                            <label for="cidade" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Município*</label>
                            <select id="cidade" name="cidade" required disabled style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(15,25,48,0.95); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                              <option value="" style="background:#0f1930;color:#fff;">Primeiro selecione o estado...</option>
                            </select>
                        </div>

                        <div style="flex: 1 1 100%;">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 8px;">Escolha o curso de seu interesse*</label>
                            
                            <div id="containerModulos" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 16px;">
                                <div style="color: #F59E0B; font-size: 14px; font-style: italic; text-align: center;">
                                  (Os módulos definidos na campanha aparecerão automaticamente aqui quando a página for publicada)
                                </div>
                            </div>
                        </div>

                        <div style="flex: 1 1 100%;">
                            <label for="origem" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Como você nos conheceu?*</label>
                            <select id="origem" name="origem" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                                <option value="" style="background:#0f1930; color:#fff;">Selecione...</option>
                                <option value="Instagram" style="background:#0f1930; color:#fff;">Instagram</option>
                                <option value="Facebook" style="background:#0f1930; color:#fff;">Facebook</option>
                                <option value="Indicação" style="background:#0f1930; color:#fff;">Indicação</option>
                                <option value="Ligação" style="background:#0f1930; color:#fff;">Ligação</option>
                                <option value="Whatsapp" style="background:#0f1930; color:#fff;">Whatsapp</option>
                                <option value="E-mail" style="background:#0f1930; color:#fff;">E-mail</option>
                                <option value="LinkedIn" style="background:#0f1930; color:#fff;">LinkedIn</option>
                                <option value="Outros" style="background:#0f1930; color:#fff;">Outros</option>
                            </select>
                        </div>

                        <div style="flex: 1 1 100%;">
                            <label for="captchaCalc" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">4 + 3 = ? *</label>
                            <input type="number" id="captchaCalc" name="captchaCalc" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Soma matemática">
                        </div>

                        <div style="flex: 1 1 100%; text-align: center; margin-top: 10px;">
                            <button type="submit" id="btnSubmit" style="width: 100%; background: linear-gradient(to right, #FCD34D, #F59E0B); color: #0B192C; padding: 16px 32px; font-size: 16px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.4);">
                                Enviar meus dados
                            </button>
                            <div id="feedback" style="display:none; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px; font-weight: bold;"></div>
                            <p style="margin-top: 16px; font-size: 12px; color: rgba(248,250,252,0.6);">Seus dados estão protegidos conosco.</p>
                              <div style="margin-top: 24px; border-radius: 30px; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); padding: 15px 28px; text-align: center; box-shadow: 0 25px 50px -25px rgba(0,0,0,0.35);">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B192C;">Consulte o conteúdo programático do curso.</p>
              <a href="https://drive.google.com/file/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; justify-content:center; gap:10px; margin-top: 18px; padding: 16px 24px; min-width: 260px; border-radius: 14px; background: #0B192C; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; box-shadow: 0 15px 30px rgba(0,0,0,0.18);">
                <span style="display: inline-flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <path d="M12 16.5V3" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 10.5L12 16.5L18 10.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 20.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  BAIXAR FOLDER DO CURSO (PDF)
                </span>
              </a>
            </div>
                            </div>

                    </form>
                </div>
            </div>
          </section>
        `,
      });

      // [template-completo REMOVIDO]
      if (false) { const _x = `<script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    background: "#ffffff",
                    foreground: "#0f172a",
                    border: "#e2e8f0",
                    navy: { DEFAULT: "#0B192C", foreground: "#f8fafc" },
                    gold: { DEFAULT: "#F59E0B", foreground: "#0B192C" },
                    card: { DEFAULT: "#ffffff", foreground: "#0f172a" },
                    secondary: { DEFAULT: "#f8fafc", foreground: "#0f172a" },
                    muted: { DEFAULT: "#f1f5f9", foreground: "#64748b" },
                    destructive: { DEFAULT: "#ef4444", foreground: "#ffffff" }
                  },
                  boxShadow: {
                    'elegant': '0 10px 40px -10px rgba(0,0,0,0.1)',
                    'gold': '0 4px 14px 0 rgba(245, 158, 11, 0.4)',
                  }
                }
              }
            }
          </script>
          <style>
            .bg-gradient-gold { background: linear-gradient(to right, #FCD34D, #F59E0B); }
            .bg-gradient-navy { background: linear-gradient(to bottom right, #0B192C, #1E293B); }
          </style>

          <header class="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
              <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
                  <a href="#top" aria-label="Gestão — Início" class="flex items-center">
                      <img src="https://lh3.googleusercontent.com/d/15X1AYe0G-KGxqrqe05n6iTzmH9IUJhY_" alt="Gestão" class="h-9 w-auto object-contain">
                  </a>
                  <nav class="flex items-center gap-4 md:gap-6">
                      <a href="#inscricao" class="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-5 py-2.5 text-sm font-semibold text-navy shadow-gold">
                          Fazer inscrição
                      </a>
                  </nav>
              </div>
          </header>

          <main>
              <section id="top" class="relative overflow-hidden bg-navy text-navy-foreground">
                  <div class="absolute inset-0 opacity-40" style="background-image: url('https://lh3.googleusercontent.com/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi'); background-size: cover; background-position: center;"></div>
                  <div class="absolute inset-0" style="background: linear-gradient(135deg, rgba(11,25,44,0.92) 0%, rgba(15,23,42,0.85) 60%, rgba(11,25,44,0.95) 100%);"></div>
                  <div class="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-[1.3fr_1fr] md:px-8 md:py-28">
                      <div>
                          <span class="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-gold">
                              Curso Online Ao Vivo · Turma 2026
                          </span>
                          <h1 class="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
                              Inteligência Artificial na Prática do <span class="text-gold">Controle Interno Municipal</span>
                          </h1>
                          <p class="mt-6 max-w-2xl text-lg text-navy-foreground/85 md:text-xl">
                              Aprenda a utilizar a IA com segurança, método e responsabilidade nas rotinas da UCCI.
                          </p>
                          <div class="mt-8 flex flex-wrap items-center gap-3">
                              <a href="#inscricao" class="inline-flex items-center gap-2 rounded-md bg-gradient-gold px-7 py-3.5 text-base font-semibold text-navy shadow-gold">
                                  Fazer inscrição
                              </a>
                          </div>
                      </div>
                      <div class="relative hidden items-center justify-center md:flex">
                          <div class="relative w-full rounded-2xl border border-gold/30 bg-navy/60 p-8 shadow-elegant backdrop-blur">
                              <div class="border-b border-gold/20 pb-4">
                                  <p class="text-xs uppercase tracking-wider text-gold">Capacitação Aplicada</p>
                                  <p class="text-sm font-semibold">7 horas · 5 etapas</p>
                              </div>
                              <ul class="mt-5 space-y-3 text-sm text-navy-foreground/85">
                                  <li>Segurança, ética e governança de dados</li>
                                  <li>Engenharia de prompts para a UCCI</li>
                                  <li>Inteligência documental e análise multimodal</li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </section>

              <section class="bg-background py-20 md:py-28">
                  <div class="mx-auto max-w-7xl px-4 md:px-8 text-center">
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold">O contexto</p>
                      <h2 class="mt-3 text-3xl font-bold leading-tight text-navy md:text-4xl lg:text-5xl">
                          A IA já chegou à Administração Pública.<br />
                          <span class="text-gold">A questão é: sua UCCI está preparada para usá-la com segurança?</span>
                      </h2>
                      <p class="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground">
                          A Inteligência Artificial pode apoiar o Controle Interno Municipal na organização de documentos. Porém, seu uso sem método pode gerar riscos relevantes.
                      </p>
                  </div>
              </section>

              <section id="instrutor" class="bg-background py-20 md:py-28">
                  <div class="mx-auto max-w-7xl px-4 md:px-8">
                      <p class="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">Instrutor</p>
                      <h2 class="mt-3 text-center text-3xl font-bold leading-tight text-navy md:text-4xl lg:text-5xl">Com quem você vai aprender</h2>
                      <div class="mt-12 grid items-center gap-10 md:grid-cols-[auto_1fr]">
                          <div class="relative mx-auto">
                              <img src="https://lh3.googleusercontent.com/d/1d7pkkU2b7K_hjbz_rARcK4P64aSWAriP" alt="Prof. Paulo Isaac Silveira" class="h-80 w-64 rounded-2xl object-cover object-top shadow-elegant border border-border" />
                          </div>
                          <div>
                              <p class="text-sm font-semibold uppercase tracking-wider text-gold">Prof.</p>
                              <h3 class="mt-1 text-3xl font-bold text-navy md:text-4xl">Paulo Isaac Silveira</h3>
                              <p class="mt-6 text-base leading-relaxed text-muted-foreground">Especialista em Revisão de Textos pela PUC Minas e especialista em Direito Público Constitucional.</p>
                          </div>
                      </div>
                  </div>
              </section>

              <section id="inscricao" class="bg-secondary py-20 md:py-28">
                  <div class="mx-auto max-w-7xl px-4 md:px-8">
                      <div class="mx-auto max-w-3xl rounded-3xl border border-gold/30 bg-gradient-navy p-8 shadow-elegant md:p-12 text-navy-foreground">
                          <div class="mb-8 text-center">
                              <h3 class="text-2xl font-bold text-gold">Preencha seus dados para inscrição</h3>
                          </div>
                          <form id="formInscricaoCRM" style="display: flex; flex-wrap: wrap; gap: 20px;">
                              <div style="flex: 1 1 100%;">
                                  <label style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Nome Completo*</label>
                                  <input type="text" id="nome" name="nome" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; color: #ffffff; outline: none;" placeholder="Seu nome completo">
                              </div>
                              <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                                  <label style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Email*</label>
                                  <input type="email" id="email" name="email" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; color: #ffffff; outline: none;" placeholder="seu@email.com">
                              </div>
                              <div style="flex: 1 1 calc(50% - 10px); min-width: 250px;">
                                  <label style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Telefone*</label>
                                  <input type="tel" id="whatsapp" name="whatsapp" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; color: #ffffff; outline: none;" placeholder="(00) 00000-0000">
                              </div>
                              <div style="flex: 1 1 100%;">
                                  <div id="containerModulos" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 16px; margin-top: 10px;">
                                      <div style="color: #F59E0B; font-size: 14px; font-style: italic; text-align: center;">
                                        (Os módulos definidos na campanha aparecerão automaticamente aqui)
                                      </div>
                                  </div>
                              </div>
                              <div style="flex: 1 1 100%; text-align: center; margin-top: 10px;">
                                  <button type="submit" id="btnSubmit" style="width: 100%; background: linear-gradient(to right, #FCD34D, #F59E0B); color: #0B192C; padding: 16px 32px; font-size: 16px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">
                                      Enviar meus dados
                                  </button>
                                  <div id="feedback" style="display:none; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px; font-weight: bold;"></div>
                              <div style="margin-top: 24px; border-radius: 30px; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); padding: 15px 28px; text-align: center; box-shadow: 0 25px 50px -25px rgba(0,0,0,0.35);">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B192C;">Consulte o conteúdo programático do curso.</p>
              <a href="https://drive.google.com/file/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; justify-content:center; gap:10px; margin-top: 18px; padding: 16px 24px; min-width: 260px; border-radius: 14px; background: #0B192C; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; box-shadow: 0 15px 30px rgba(0,0,0,0.18);">
                <span style="display: inline-flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <path d="M12 16.5V3" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 10.5L12 16.5L18 10.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 20.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  BAIXAR FOLDER DO CURSO (PDF)
                </span>
              </a>
            </div>
                                  </div>
                          </form>
                      </div>
                  </div>
              </section>
          </main>
      `; }

      // BLOCO: LOGO / IMAGEM
      editor.BlockManager.add('bloco-logo-imagem', {
        label: '<i class="fa-solid fa-image fa-2x"></i><br/>Logo / Imagem',
        category: 'Elementos',
        content: {
          type: 'image',
          style: { maxWidth: '280px', height: 'auto', display: 'block', margin: '20px auto' },
          attributes: {
            src: 'https://via.placeholder.com/280x100?text=Clique+2x+para+trocar+a+imagem',
            alt: 'Logo ou imagem'
          }
        }
      });

      // ── BLOCO: RODAPÉ ────────────────────────────────────────────────────────
      editor.BlockManager.add('rodape-attenti', {
        label: '<i class="fa-solid fa-shoe-prints fa-2x"></i><br/>Rodapé',
        category: 'Elementos',
        content: `<footer style="background:#0d1b35;padding:48px 20px 0;font-family:Arial,sans-serif;"><div style="max-width:1200px;margin:0 auto;"><div style="display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start;justify-content:space-between;padding-bottom:40px;"><div style="flex:0 0 auto;"><img src="https://drive.google.com/uc?export=view&id=1q9UyvePIn8m49JGGZspHmruNu9y81Z_y" alt="Gestão — Inteligência em Administração Pública" style="max-width:200px;height:auto;display:block;" /></div><div style="flex:1;min-width:200px;"><p style="margin:0 0 16px;font-weight:700;font-size:1rem;color:#f8fafc;">Contato</p><p style="margin:0 0 10px;color:#cbd5e1;font-size:0.92rem;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-phone" style="color:#F59E0B;"></i> (51) 3541-3355</p><p style="margin:0 0 10px;color:#cbd5e1;font-size:0.92rem;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-phone" style="color:#F59E0B;"></i> (51) 98443-2097</p><p style="margin:0;color:#cbd5e1;font-size:0.92rem;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-envelope" style="color:#F59E0B;"></i> gestao@gestao.srv.br</p></div><div style="flex:1;min-width:220px;"><p style="margin:0 0 16px;font-weight:700;font-size:1rem;color:#f8fafc;">Endereço</p><p style="margin:0 0 6px;color:#cbd5e1;font-size:0.92rem;">Gestão A+ Desenvolvimento Ltda — ME</p><p style="margin:0 0 6px;color:#cbd5e1;font-size:0.92rem;">CNPJ: 18.693.117/0001-63</p><p style="margin:0;color:#cbd5e1;font-size:0.92rem;">R. João Bayer, 744 · Petrópolis · Taquara/RS</p></div></div><div style="border-top:1px solid rgba(248,250,252,0.1);padding:20px 0;"><p style="text-align:center;color:#64748b;font-size:0.82rem;margin:0;">© 2026 Gestão — Inteligência em Administração Pública. Todos os direitos reservados.</p></div></div></footer>`
      });

      // ── BLOCOS: ESTRUTURA ────────────────────────────────────────────────────
      editor.BlockManager.add('struct-section', {
        label: '<i class="fa-solid fa-table-cells-large fa-2x"></i><br/>Seção',
        category: 'Estrutura',
        content: '<section style="padding:60px 20px;min-height:80px;"></section>'
      });
      editor.BlockManager.add('struct-div', {
        label: '<i class="fa-solid fa-square-dashed fa-2x"></i><br/>Div',
        category: 'Estrutura',
        content: '<div style="padding:20px;min-height:40px;"></div>'
      });
      editor.BlockManager.add('struct-button', {
        label: '<i class="fa-solid fa-computer-mouse fa-2x"></i><br/>Botão',
        category: 'Estrutura',
        content: '<a href="#" style="display:inline-block;padding:14px 32px;background:#F59E0B;color:#0B192C;border-radius:8px;font-weight:700;text-decoration:none;font-size:1rem;">Clique aqui</a>'
      });
      editor.BlockManager.add('struct-linha', {
        label: '<i class="fa-solid fa-minus fa-2x"></i><br/>Linha',
        category: 'Estrutura',
        content: '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />'
      });
      editor.BlockManager.add('struct-colunas', {
        label: '<i class="fa-solid fa-table-columns fa-2x"></i><br/>Colunas',
        category: 'Estrutura',
        content: '<div style="display:flex;gap:20px;flex-wrap:wrap;"><div style="flex:1;min-width:200px;padding:16px;min-height:60px;"></div><div style="flex:1;min-width:200px;padding:16px;min-height:60px;"></div></div>'
      });
      editor.BlockManager.add('struct-caixa', {
        label: '<i class="fa-solid fa-box fa-2x"></i><br/>Caixa',
        category: 'Estrutura',
        content: '<div style="padding:24px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.06);min-height:60px;"></div>'
      });
      editor.BlockManager.add('struct-nav', {
        label: '<i class="fa-solid fa-bars fa-2x"></i><br/>Menu Nav',
        category: 'Estrutura',
        content: '<nav style="display:flex;align-items:center;gap:24px;padding:16px 24px;background:#fff;border-bottom:1px solid #e2e8f0;"><a href="#" style="color:#0B192C;text-decoration:none;font-weight:600;">Link 1</a><a href="#" style="color:#0B192C;text-decoration:none;font-weight:600;">Link 2</a><a href="#" style="color:#0B192C;text-decoration:none;font-weight:600;">Link 3</a></nav>'
      });
      editor.BlockManager.add('struct-html', {
        label: '<i class="fa-solid fa-code fa-2x"></i><br/>HTML',
        category: 'Estrutura',
        content: '<div><!-- Cole seu HTML aqui --></div>'
      });

      // BLOCOS ANTIGOS (secao-beneficios → template-generico) — REMOVIDOS
      if (false) { // eslint-disable-next-line no-unreachable
      editor.BlockManager.add('_REMOVED_secao-beneficios', {
        label: '<i class="fa-solid fa-star fa-2x"></i><br/>Seção Benefícios',
        category: 'Seções',
        content: `
          <section style="padding: 80px 20px; background: #f8fafc; font-family: Arial, sans-serif;">
            <div style="max-width: 1100px; margin: 0 auto;">
              <p style="text-align:center; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Benefícios</p>
              <h2 style="text-align:center; font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 50px;">O que você vai ganhar com este curso</h2>
              <div style="display:flex; flex-wrap:wrap; gap:24px; justify-content:center;">
                <div style="flex:1; min-width:240px; max-width:320px; background:#fff; border-radius:16px; padding:30px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">🎯</div>
                  <h3 style="color:#0B192C; font-size:1.1rem; margin:0 0 10px;">Benefício 1</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva aqui o primeiro benefício do seu curso ou serviço.</p>
                </div>
                <div style="flex:1; min-width:240px; max-width:320px; background:#fff; border-radius:16px; padding:30px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">⚡</div>
                  <h3 style="color:#0B192C; font-size:1.1rem; margin:0 0 10px;">Benefício 2</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva aqui o segundo benefício do seu curso ou serviço.</p>
                </div>
                <div style="flex:1; min-width:240px; max-width:320px; background:#fff; border-radius:16px; padding:30px; box-shadow:0 4px 15px rgba(0,0,0,0.05); border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">📜</div>
                  <h3 style="color:#0B192C; font-size:1.1rem; margin:0 0 10px;">Benefício 3</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva aqui o terceiro benefício do seu curso ou serviço.</p>
                </div>
              </div>
            </div>
          </section>
        `
      });

      // BLOCO: SEÇÃO INSTRUTOR
      editor.BlockManager.add('secao-instrutor', {
        label: '<i class="fa-solid fa-user-tie fa-2x"></i><br/>Seção Instrutor',
        category: 'Seções',
        content: `
          <section style="padding: 80px 20px; background: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1100px; margin: 0 auto;">
              <p style="text-align:center; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Instrutor</p>
              <h2 style="text-align:center; font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 50px;">Com quem você vai aprender</h2>
              <div style="display:flex; flex-wrap:wrap; align-items:center; gap:50px; justify-content:center;">
                <div style="text-align:center; flex-shrink:0;">
                  <img src="https://via.placeholder.com/220x280?text=Foto+do+Instrutor" style="width:220px; height:280px; border-radius:20px; object-fit:cover; box-shadow:0 10px 30px rgba(0,0,0,0.12);" alt="Foto do instrutor" />
                </div>
                <div style="flex:1; min-width:280px; max-width:580px;">
                  <p style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:#F59E0B; margin:0 0 6px;">Prof. / Dr.</p>
                  <h3 style="font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 20px;">Nome do Instrutor</h3>
                  <p style="color:#475569; font-size:1rem; line-height:1.8; margin:0 0 16px;">Escreva aqui a biografia do instrutor. Destaque a formação, experiência profissional e diferenciais que credenciam este profissional a ministrar o curso.</p>
                  <p style="color:#475569; font-size:1rem; line-height:1.8; margin:0;">Inclua conquistas, publicações, cargos ou projetos relevantes que fortaleçam a autoridade do instrutor perante o público-alvo.</p>
                </div>
              </div>
            </div>
          </section>
        `
      });

      // BLOCO: SEÇÃO FAQ
      editor.BlockManager.add('secao-faq', {
        label: '<i class="fa-solid fa-circle-question fa-2x"></i><br/>Perguntas Freq.',
        category: 'Seções',
        content: `
          <section style="padding: 80px 20px; background: #f8fafc; font-family: Arial, sans-serif;">
            <div style="max-width: 800px; margin: 0 auto;">
              <p style="text-align:center; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Dúvidas</p>
              <h2 style="text-align:center; font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 50px;">Perguntas frequentes</h2>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:20px 24px;">
                  <p style="font-weight:700; color:#0B192C; margin:0 0 8px; font-size:1rem;">Pergunta frequente 1?</p>
                  <p style="color:#64748b; margin:0; font-size:0.95rem; line-height:1.6;">Escreva aqui a resposta para a primeira pergunta frequente do seu público.</p>
                </div>
                <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:20px 24px;">
                  <p style="font-weight:700; color:#0B192C; margin:0 0 8px; font-size:1rem;">Pergunta frequente 2?</p>
                  <p style="color:#64748b; margin:0; font-size:0.95rem; line-height:1.6;">Escreva aqui a resposta para a segunda pergunta frequente do seu público.</p>
                </div>
                <div style="background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:20px 24px;">
                  <p style="font-weight:700; color:#0B192C; margin:0 0 8px; font-size:1rem;">Pergunta frequente 3?</p>
                  <p style="color:#64748b; margin:0; font-size:0.95rem; line-height:1.6;">Escreva aqui a resposta para a terceira pergunta frequente do seu público.</p>
                </div>
              </div>
            </div>
          </section>
        `
      });

      // BLOCO: RODAPÉ CTA
      editor.BlockManager.add('secao-cta-final', {
        label: '<i class="fa-solid fa-bullhorn fa-2x"></i><br/>Rodapé CTA',
        category: 'Seções',
        content: `
          <section style="padding: 80px 20px; background: linear-gradient(135deg, #0B192C, #1E293B); text-align:center; font-family: Arial, sans-serif;">
            <div style="max-width: 700px; margin: 0 auto;">
              <h2 style="font-size:2.2rem; font-weight:800; color:#ffffff; margin:0 0 20px; line-height:1.2;">Garanta sua vaga e <span style="color:#F59E0B;">transforme sua prática profissional</span></h2>
              <p style="color:rgba(248,250,252,0.75); font-size:1rem; line-height:1.7; margin:0 0 40px;">Não perca essa oportunidade. As vagas são limitadas e a próxima turma pode demorar a acontecer.</p>
              <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
                <a href="#inscricao" style="background:linear-gradient(90deg,#FCD34D,#F59E0B); color:#0B192C; padding:18px 40px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.1rem; display:inline-block; box-shadow:0 4px 14px rgba(245,158,11,0.4);">Fazer inscrição agora</a>
                <a href="https://wa.me/55XXXXXXXXXXX" target="_blank" style="background:rgba(255,255,255,0.08); color:#fff; padding:18px 40px; border-radius:8px; text-decoration:none; font-weight:700; font-size:1rem; display:inline-block; border:1px solid rgba(255,255,255,0.2);">Falar pelo WhatsApp</a>
              </div>
            </div>
          </section>
        `
      });

      // BLOCO: HEADER COM LOGO EDITÁVEL
      editor.BlockManager.add('header-logo', {
        label: '<i class="fa-solid fa-window-restore fa-2x"></i><br/>Cabeçalho',
        category: 'Seções',
        content: `
          <header style="position:sticky; top:0; z-index:40; background:rgba(255,255,255,0.95); backdrop-filter:blur(8px); border-bottom:1px solid #e2e8f0; font-family:Arial,sans-serif;">
            <div style="max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:14px 24px;">
              <a href="#top" style="display:inline-block; text-decoration:none;">
                <img src="https://via.placeholder.com/160x40?text=Sua+Logo" style="height:40px; width:auto; object-fit:contain;" alt="Logo" />
              </a>
              <nav style="display:flex; align-items:center; gap:20px;">
                <a href="#inscricao" style="background:linear-gradient(90deg,#FCD34D,#F59E0B); color:#0B192C; padding:10px 22px; border-radius:6px; text-decoration:none; font-weight:700; font-size:0.95rem;">Fazer inscrição</a>
              </nav>
            </div>
          </header>
        `
      });

      // BLOCO: TEMPLATE GENÉRICO COMPLETO
      editor.BlockManager.add('template-generico', {
        label: '<i class="fa-solid fa-file-circle-plus fa-2x"></i><br/>Template Genérico',
        category: 'Páginas Prontas',
        content: `
          <header style="position:sticky; top:0; z-index:40; background:rgba(255,255,255,0.95); backdrop-filter:blur(8px); border-bottom:1px solid #e2e8f0; font-family:Arial,sans-serif;">
            <div style="max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:14px 24px;">
              <a href="#top">
                <img src="https://via.placeholder.com/160x40?text=Sua+Logo" style="height:40px; width:auto; object-fit:contain;" alt="Logo" />
              </a>
              <a href="#inscricao" style="background:linear-gradient(90deg,#FCD34D,#F59E0B); color:#0B192C; padding:10px 22px; border-radius:6px; text-decoration:none; font-weight:700; font-size:0.95rem;">Fazer inscrição</a>
            </div>
          </header>

          <section id="top" style="background:linear-gradient(135deg,#0B192C,#1E293B); padding:100px 20px; font-family:Arial,sans-serif; text-align:center;">
            <div style="max-width:800px; margin:0 auto;">
              <span style="display:inline-block; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#F59E0B; padding:6px 16px; border-radius:99px; font-size:0.8rem; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:24px;">Curso Online Ao Vivo · Turma 2026</span>
              <h1 style="font-size:3rem; font-weight:800; color:#ffffff; line-height:1.1; margin:0 0 24px;">Título Principal do <span style="color:#F59E0B;">Seu Curso ou Serviço</span></h1>
              <p style="font-size:1.15rem; color:rgba(248,250,252,0.8); line-height:1.7; margin:0 0 40px; max-width:600px; margin-left:auto; margin-right:auto;">Escreva aqui o subtítulo que resume o principal benefício e desperta o interesse do visitante.</p>
              <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-bottom:50px;">
                <a href="#inscricao" style="background:linear-gradient(90deg,#FCD34D,#F59E0B); color:#0B192C; padding:18px 40px; border-radius:8px; text-decoration:none; font-weight:800; font-size:1.05rem; box-shadow:0 4px 14px rgba(245,158,11,0.4);">Fazer inscrição</a>
                <a href="https://wa.me/55XXXXXXXXXXX" target="_blank" style="background:rgba(255,255,255,0.08); color:#fff; padding:18px 40px; border-radius:8px; text-decoration:none; font-weight:700; font-size:1rem; border:1px solid rgba(255,255,255,0.2);">Falar pelo WhatsApp</a>
              </div>
              <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:24px; border-top:1px solid rgba(248,250,252,0.1); padding-top:32px;">
                <div style="text-align:left;">
                  <p style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:rgba(248,250,252,0.5); margin:0 0 4px;">Data</p>
                  <p style="font-weight:700; color:#ffffff; margin:0;">DD/MM/AAAA</p>
                </div>
                <div style="text-align:left;">
                  <p style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:rgba(248,250,252,0.5); margin:0 0 4px;">Horário</p>
                  <p style="font-weight:700; color:#ffffff; margin:0;">08h30 – 17h</p>
                </div>
                <div style="text-align:left;">
                  <p style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:rgba(248,250,252,0.5); margin:0 0 4px;">Modalidade</p>
                  <p style="font-weight:700; color:#ffffff; margin:0;">Online · Zoom</p>
                </div>
                <div style="text-align:left;">
                  <p style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:rgba(248,250,252,0.5); margin:0 0 4px;">Carga Horária</p>
                  <p style="font-weight:700; color:#ffffff; margin:0;">8 horas</p>
                </div>
              </div>
            </div>
          </section>

          <section style="padding:80px 20px; background:#ffffff; font-family:Arial,sans-serif;">
            <div style="max-width:1100px; margin:0 auto;">
              <p style="text-align:center; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Benefícios</p>
              <h2 style="text-align:center; font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 50px;">O que você vai ganhar com este curso</h2>
              <div style="display:flex; flex-wrap:wrap; gap:24px; justify-content:center;">
                <div style="flex:1; min-width:240px; max-width:320px; background:#f8fafc; border-radius:16px; padding:30px; border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">🎯</div>
                  <h3 style="color:#0B192C; font-size:1.05rem; margin:0 0 10px; font-weight:700;">Benefício 1</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva o primeiro benefício aqui.</p>
                </div>
                <div style="flex:1; min-width:240px; max-width:320px; background:#f8fafc; border-radius:16px; padding:30px; border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">⚡</div>
                  <h3 style="color:#0B192C; font-size:1.05rem; margin:0 0 10px; font-weight:700;">Benefício 2</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva o segundo benefício aqui.</p>
                </div>
                <div style="flex:1; min-width:240px; max-width:320px; background:#f8fafc; border-radius:16px; padding:30px; border-top:4px solid #F59E0B;">
                  <div style="font-size:2rem; margin-bottom:12px;">📜</div>
                  <h3 style="color:#0B192C; font-size:1.05rem; margin:0 0 10px; font-weight:700;">Benefício 3</h3>
                  <p style="color:#64748b; font-size:0.95rem; line-height:1.6; margin:0;">Descreva o terceiro benefício aqui.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="instrutor" style="padding:80px 20px; background:#f8fafc; font-family:Arial,sans-serif;">
            <div style="max-width:1100px; margin:0 auto;">
              <p style="text-align:center; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Instrutor</p>
              <h2 style="text-align:center; font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 50px;">Com quem você vai aprender</h2>
              <div style="display:flex; flex-wrap:wrap; align-items:center; gap:50px; justify-content:center;">
                <img src="https://via.placeholder.com/220x280?text=Foto+do+Instrutor" style="width:220px; height:280px; border-radius:20px; object-fit:cover; box-shadow:0 10px 30px rgba(0,0,0,0.12); flex-shrink:0;" alt="Foto do instrutor" />
                <div style="flex:1; min-width:280px; max-width:580px;">
                  <p style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:#F59E0B; margin:0 0 6px;">Prof.</p>
                  <h3 style="font-size:2rem; font-weight:800; color:#0B192C; margin:0 0 20px;">Nome do Instrutor</h3>
                  <p style="color:#475569; font-size:1rem; line-height:1.8; margin:0 0 16px;">Escreva aqui a biografia do instrutor — formação, experiência e diferenciais que credenciam este profissional.</p>
                  <a href="#" target="_blank" style="display:inline-flex; align-items:center; gap:8px; border:2px solid #0B192C; color:#0B192C; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:700; font-size:0.9rem;">Acessar Currículo Lattes</a>
                </div>
              </div>
            </div>
          </section>

          <section id="inscricao" style="padding:80px 20px; background:#ffffff; font-family:Arial,sans-serif;">
            <div style="max-width:1100px; margin:0 auto;">
              <div style="text-align:center; margin-bottom:40px;">
                <p style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.2em; color:#F59E0B; margin:0 0 10px;">Investimento e Inscrição</p>
                <h2 style="font-size:2.2rem; font-weight:800; color:#0B192C; margin:0;">Garanta sua Vaga</h2>
              </div>
              <div style="max-width:800px; margin:0 auto; background:linear-gradient(135deg,#0B192C,#1E293B); border-radius:24px; padding:40px; border:1px solid rgba(245,158,11,0.3);">
                <div style="text-align:center; margin-bottom:30px;">
                  <h3 style="font-size:1.5rem; font-weight:800; color:#F59E0B; margin:0 0 8px;">Preencha seus dados</h3>
                  <p style="color:#cbd5e1; margin:0; font-size:0.95rem;">Seus dados serão enviados diretamente para o nosso sistema.</p>
                </div>
                <form id="formInscricaoCRM" style="display:grid; gap:16px;">
                  <div style="display:grid; gap:16px; grid-template-columns:repeat(2,minmax(0,1fr));">
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">Nome completo*</label>
                      <input type="text" id="nome" name="nome" required placeholder="Seu nome completo" style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(248,250,252,0.05); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;" />
                    </div>
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">Telefone*</label>
                      <input type="tel" id="telefone" name="telefone" required placeholder="(00) 00000-0000" style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(248,250,252,0.05); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;" />
                    </div>
                  </div>
                  <div style="display:grid; gap:16px; grid-template-columns:repeat(2,minmax(0,1fr));">
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">Email*</label>
                      <input type="email" id="email" name="email" required placeholder="seu@email.com" style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(248,250,252,0.05); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;" />
                    </div>
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">WhatsApp*</label>
                      <input type="tel" id="whatsapp" name="whatsapp" required placeholder="(00) 00000-0000" style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(248,250,252,0.05); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;" />
                    </div>
                  </div>
                  <div style="display:grid; gap:16px; grid-template-columns:repeat(2,minmax(0,1fr));">
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">Estado*</label>
                      <select id="uf" name="uf" required style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(15,25,48,0.95); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;"><option value="">Selecione o estado...</option></select>
                    </div>
                    <div>
                      <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">Município*</label>
                      <select id="cidade" name="cidade" required disabled style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(15,25,48,0.95); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;"><option value="">Primeiro selecione o estado...</option></select>
                    </div>
                  </div>
                  <div id="containerModulos" style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.4); border-radius:8px; padding:16px; color:#F59E0B; font-size:0.9rem; font-style:italic; text-align:center;">(Os módulos definidos na campanha aparecerão automaticamente aqui)</div>
                  <div>
                    <label style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:6px;">4 + 3 = ? *</label>
                    <input type="number" id="captchaCalc" name="captchaCalc" required placeholder="Soma matemática" style="width:100%; border-radius:8px; border:1px solid rgba(248,250,252,0.15); background:rgba(248,250,252,0.05); color:#f8fafc; padding:12px 14px; outline:none; box-sizing:border-box;" />
                  </div>
                  <button type="submit" id="btnSubmit" style="width:100%; background:linear-gradient(90deg,#FCD34D,#F59E0B); color:#0B192C; padding:16px; border-radius:8px; border:none; font-weight:800; font-size:1rem; cursor:pointer;">Enviar meus dados</button>
                  <div id="feedback" style="display:none; padding:14px; border-radius:8px; text-align:center; font-weight:700;"></div>
                  <p style="text-align:center; color:rgba(248,250,252,0.55); font-size:0.82rem; margin:0;">Seus dados estão protegidos conosco.</p>
                </form>
              </div>
            </div>
          </section>
        `
      }); } // fim if(false) blocos removidos

      if (htmlInicial) {
        editor.setComponents(htmlInicial);
        if (cssInicial) editor.setStyle(cssInicial);
      } else {
        editor.setComponents('<div style="padding: 50px; text-align: center; font-family: sans-serif; color: #999;"><h1>Seu Editor de Páginas</h1><p>Arraste os blocos do menu lateral para montar sua página.</p></div>');
      }
    }

    return () => {
      if (!mostrarModal && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mostrarModal, htmlInicial, cssInicial, extraHtmlHead, extraBodyScripts, htmlAttributes, bodyAttributes]);

  useEffect(() => {
    if (!mostrarModal || !editorRef.current) return;
    const editor = editorRef.current;
    if (htmlInicial) {
      editor.setComponents(htmlInicial);
      if (cssInicial) editor.setStyle(cssInicial);
      if (extraHtmlHead) injectExtraHeadIntoCanvas(editor, extraHtmlHead);
      if (extraBodyScripts) injectBodyScriptsIntoCanvas(editor, extraBodyScripts);
      if (cssInicial) injectCssIntoCanvas(editor, cssInicial);
      applyHtmlBodyAttributesToCanvas(editor, htmlAttributes, bodyAttributes);
      scanIdsFromCanvas(editor);
    }
  }, [mostrarModal, htmlInicial, cssInicial, extraHtmlHead, extraBodyScripts, htmlAttributes, bodyAttributes]);

  function abrirEditorHtmlBruto() {
    if (!editorRef.current) return;
    setHtmlBruto(editorRef.current.getHtml() || '');
    setCssBruto(editorRef.current.getCss() || '');
    setMostrarHtmlBruto(true);
  }

  function aplicarHtmlBruto() {
    if (!editorRef.current) return;
    editorRef.current.setComponents(htmlBruto);
    editorRef.current.setStyle(cssBruto);
    setMostrarHtmlBruto(false);
  }

  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setSlug(''); setStatusLP('rascunho'); setCampanhaId(''); setCampanhasIds([]); setHtmlInicial(''); setCssInicial(''); setExtraHtmlHead(''); setExtraBodyScripts(''); setHtmlAttributes(''); setBodyAttributes(''); setImportErro(''); setMostrarModal(true);
  }

  function selecionarArquivoLovable() {
    fileInputRef.current?.click();
  }

  function handleImportarHtmlLovable(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(html|htm)$/i.test(file.name)) {
      setImportErro('Selecione um arquivo HTML válido do Lovable.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const { bodyHtml, extraMarkup, plainCssText, bodyScripts, htmlAttrs, bodyAttrs } = extractHtmlAssets(text);

        const pageTitle = doc.querySelector('title')?.textContent || file.name.replace(/\.[^.]+$/, '');
        const pageSlug = pageTitle.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const hasCrmForm = !!doc.querySelector('#formInscricaoCRM, #formInscricaoLP, form[id*="Inscricao" i], form[class*="Inscricao" i]');
        const hasCrmPlaceholder = !!doc.querySelector('#CRM_FORM_INJECT_ZONE');
        if (hasCrmPlaceholder) {
          const placeholder = doc.querySelector('#CRM_FORM_INJECT_ZONE');
          placeholder.outerHTML = getMarkupFormularioCRM();
        }

        setHtmlInicial(bodyHtml);
        setCssInicial(plainCssText);
        setExtraHtmlHead(extraMarkup);
        setExtraBodyScripts(bodyScripts);
        setHtmlAttributes(htmlAttrs);
        setBodyAttributes(bodyAttrs);
        setNome(pageTitle);
        setSlug(pageSlug);
        setStatusLP('rascunho');
        setCampanhaId('');
        setCampanhasIds([]);
        setEditandoId(null);
        setImportErro('');
        setMostrarModal(true);
      } catch (err) {
        console.error('Importação de HTML falhou', err);
        setImportErro('Não foi possível importar o arquivo HTML.');
      }
    };
    reader.onerror = () => {
      setImportErro('Erro ao ler o arquivo. Tente novamente.');
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function abrirModalEdicao(lp) {
    const trava = await tentarAbrirTravaLandingPage(lp.id);
    if (!trava.ok) {
      alert(`Esta página está sendo editada agora por ${trava.usuario_nome || 'outro usuário'}. Tente novamente em instantes.`);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/landing-pages/${lp.id}`, getHeaders());
      const lpCompleta = res.data;
      setEditandoId(lpCompleta.id);
      setNome(lpCompleta.nome);
      setSlug(lpCompleta.slug);
      setStatusLP(lpCompleta.status || 'rascunho');
      setCampanhaId(lpCompleta.campanha_id || '');
      const cIds = lpCompleta.campanhas_ids
        ? (typeof lpCompleta.campanhas_ids === 'string' ? JSON.parse(lpCompleta.campanhas_ids) : lpCompleta.campanhas_ids)
        : (lpCompleta.campanha_id ? [Number(lpCompleta.campanha_id)] : []);
      setCampanhasIds(Array.isArray(cIds) ? cIds.map(Number) : []);
      const htmlParaEditar = lpCompleta.html_rascunho || lpCompleta.html_content || '';
      const cssParaEditar = lpCompleta.css_rascunho || lpCompleta.css_content || '';
      const parsed = extractHtmlAssets(htmlParaEditar);
      setHtmlInicial(parsed.bodyHtml || '');
      setCssInicial(`${parsed.plainCssText}${parsed.plainCssText && cssParaEditar ? '\n' : ''}${cssParaEditar || ''}`);
      setExtraHtmlHead(parsed.extraMarkup);
      setExtraBodyScripts(parsed.bodyScripts || '');
      setHtmlAttributes(parsed.htmlAttrs || '');
      setBodyAttributes(parsed.bodyAttrs || '');
      setImportErro('');
      setMostrarModal(true);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar a página para edição.');
      liberarTravaLandingPage();
    }
  }

  async function salvarPagina(e) {
    e.preventDefault();
    if (!slug.trim()) return alert("O Slug é obrigatório!");

    const slugFormatado = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const htmlGerado = editorRef.current ? editorRef.current.getHtml() : htmlInicial;
    const cssGerado = editorRef.current ? editorRef.current.getCss() : cssInicial;
    const htmlComExtras = `<!DOCTYPE html><html${htmlAttributes ? ` ${htmlAttributes}` : ''}><head>${extraHtmlHead || ''}</head><body${bodyAttributes ? ` ${bodyAttributes}` : ''}>${htmlGerado}${extraBodyScripts || ''}</body></html>`;

    const payload = {
      nome,
      slug: slugFormatado,
      campanha_id: campanhasIds.length > 0 ? (campanhasIds[0] || null) : (campanhaId || null),
      campanhas_ids: campanhasIds.length > 1 ? campanhasIds : null,
      html_content: htmlComExtras,
      css_content: cssGerado,
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/landing-pages/${editandoId}`, payload, getHeaders());
        alert("Rascunho salvo! Clique em Publicar para atualizar a versão online.");
        carregarDados();
      } else {
        const res = await axios.post(`${API_URL}/landing-pages`, { ...payload, status: statusLP }, getHeaders());
        alert("Página criada com sucesso!");
        setEditandoId(res.data.id);
        carregarDados();
      }
    } catch (err) { alert(err.response?.data?.erro || 'Erro ao salvar a página.'); }
  }

  async function publicarPagina() {
    if (!editandoId) return;
    if (!window.confirm("Publicar vai atualizar a versão online com o rascunho atual. Confirmar?")) return;
    setPublicandoLP(true);
    try {
      await axios.post(`${API_URL}/landing-pages/${editandoId}/publicar`, {}, getHeaders());
      alert("Página publicada com sucesso! A versão online foi atualizada.");
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao publicar a página.');
    } finally {
      setPublicandoLP(false);
    }
  }

  async function despublicarPagina(id) {
    if (!window.confirm("Despublicar vai tirar esta página do ar e voltar ao status de rascunho. Confirmar?")) return;
    try {
      await axios.post(`${API_URL}/landing-pages/${id}/despublicar`, {}, getHeaders());
      alert("Página despublicada. Ela não está mais acessível online.");
      setStatusLP('rascunho');
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao despublicar a página.');
    }
  }

  async function deletarPagina(id) {
    if (!window.confirm("Deseja realmente apagar esta Landing Page? Isso removerá a página do ar.")) return;
    try { await axios.delete(`${API_URL}/landing-pages/${id}`, getHeaders()); liberarTravaLandingPage(); setMostrarModal(false); carregarDados(); } catch { alert("Erro ao excluir página."); }
  }

  async function duplicarPagina(pagina) {
    if (!window.confirm(`Criar uma cópia de "${pagina.nome}"?`)) return;

    let lpCompleta;
    try {
      const res = await axios.get(`${API_URL}/landing-pages/${pagina.id}`, getHeaders());
      lpCompleta = res.data;
    } catch {
      alert('Erro ao buscar dados da página para duplicar.');
      return;
    }

    const novoNome = `${lpCompleta.nome} (Cópia)`;
    const baseSlug = lpCompleta.slug ? `${lpCompleta.slug}-copy` : `${novoNome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-copy`;
    let slugCandidate = baseSlug;
    let tentativa = 1;

    while (tentativa <= 10) {
      try {
        const payload = {
          nome: novoNome,
          slug: slugCandidate,
          status: 'rascunho',
          campanha_id: lpCompleta.campanha_id || null,
          campanhas_ids: lpCompleta.campanhas_ids || null,
          html_content: lpCompleta.html_content || '',
          css_content: lpCompleta.css_content || ''
        };

        const res = await axios.post(`${API_URL}/landing-pages`, payload, getHeaders());
        alert('Página duplicada com sucesso! Abrindo cópia para edição.');
        carregarDados();
        abrirModalEdicao(res.data);
        return;
      } catch (err) {
        const erro = err.response?.data?.erro || err.message;
        if (/SLUG já está sendo usado/i.test(erro) || err.response?.status === 400) {
          tentativa += 1;
          slugCandidate = `${baseSlug}-${tentativa}`;
          continue;
        }
        console.error('Erro ao duplicar página', err);
        alert(erro || 'Erro ao duplicar a página.');
        return;
      }
    }

    alert('Não foi possível criar a cópia porque o slug já existia em várias tentativas.');
  }

  const paginasFiltradas = useMemo(() => {
    const termo = buscaGeral.toLowerCase();
    return paginas.filter(p => p.nome.toLowerCase().includes(termo) || p.slug.toLowerCase().includes(termo));
  }, [paginas, buscaGeral]);

  return (
    <>
      <PageContainer>
        <TopSection>
          <div>
            <Title>Minhas Páginas</Title>
            <Subtitle>Crie, edite e publique páginas de venda integradas ao funil.</Subtitle>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="file" ref={fileInputRef} accept=".html,.htm" style={{ display: 'none' }} onChange={handleImportarHtmlLovable} />
          <SecondaryButton onClick={abrirModalNovo} className="btn-mobile">
              <i className="fa-solid fa-code"></i> Criar do Zero
            </SecondaryButton>
            <SecondaryButton onClick={selecionarArquivoLovable} className="btn-mobile">
              <i className="fa-solid fa-file-import"></i> Importar HTML
            </SecondaryButton>
          </div>
        </TopSection>

        {importErro && (
          <div style={{ marginBottom: '16px', color: '#c53030', fontWeight: 600 }}>
            {importErro}
          </div>
        )}

        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input type="text" placeholder="Pesquisar por nome ou slug da página..." value={buscaGeral} onChange={e => setBuscaGeral(e.target.value)} />
          </SearchWrapper>
        </FilterBar>

        <Panel>
          <TabelaResponsiva>
            <Table>
              <thead className="sticky-head">
                <tr>
                  <th>Página / Configuração</th>
                  <th>Campanha Vinculada</th>
                  <th className="text-center">Status</th>
                  <th className="text-center" style={{width: '180px'}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="4" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando páginas...</td></tr>
                ) : paginasFiltradas.length === 0 ? (
                  <tr><td colSpan="4" className="text-center text-muted">Nenhuma Landing Page encontrada.</td></tr>
                ) : (
                  paginasFiltradas.map((p, index) => (
                    <ClickableRow key={p.id} style={{ animationDelay: `${index * 0.05}s` }}>
                      <td data-label="Página" onClick={() => abrirModalEdicao(p)}>
                        <div className="main-name"><i className="fa-solid fa-window-maximize"></i> {p.nome}</div>
                        <div className="meta">
                          <span><i className="fa-solid fa-link"></i> /lp/{p.slug}</span>
                        </div>
                      </td>
                      <td data-label="Campanha Vinculada" onClick={() => abrirModalEdicao(p)}>
                        <div className={p.campanha_nome ? "comp-name" : "text-muted"}>
                          {p.campanha_nome ? <><i className="fa-solid fa-graduation-cap"></i> {p.campanha_nome}</> : 'Sem Vínculo (Genérica)'}
                        </div>
                      </td>
                      <td data-label="Status" onClick={() => abrirModalEdicao(p)} className="text-center">
                        {p.status === 'publicada' && p.tem_rascunho_pendente ? (
                          <StatusBadge className="draft-pending">🟡 Rascunho com edições</StatusBadge>
                        ) : p.status === 'publicada' ? (
                          <StatusBadge className="published">🌐 Publicada</StatusBadge>
                        ) : (
                          <StatusBadge className="draft">📝 Rascunho</StatusBadge>
                        )}
                      </td>
                      <td data-label="Ações" className="text-center actions-cell">
                        <DotsButton type="button" onClick={(e) => {
                          e.stopPropagation();
                          if (menuAbertoId === p.id) { fecharMenu(); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.right - 160, window.innerWidth - 168) });
                          setMenuAbertoId(p.id);
                        }} title="Ações">
                          ···
                        </DotsButton>
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </Table>
          </TabelaResponsiva>
        </Panel>

        {/* Menu 3 pontos — renderizado fora da tabela para não ser cortado por overflow:hidden */}
        {menuAbertoId !== null && menuPos && (() => {
          const pg = paginasFiltradas.find(x => x.id === menuAbertoId);
          if (!pg) return null;
          return (
            <DotsMenu style={{ top: menuPos.top, left: menuPos.left }} onClick={(e) => e.stopPropagation()}>
              <DotsMenuItem as="a" href={`${LANDING_DOMAIN}/lp/${pg.slug}`} target="_blank" rel="noreferrer" onClick={fecharMenu}>
                <i className="fa-solid fa-arrow-up-right-from-square"></i> Visitar
              </DotsMenuItem>
              <DotsMenuItem type="button" onClick={() => { navigator.clipboard.writeText(`${LANDING_DOMAIN}/lp/${pg.slug}`); fecharMenu(); alert('Link copiado!'); }}>
                <i className="fa-solid fa-link"></i> Copiar link
              </DotsMenuItem>
              <DotsMenuItem type="button" onClick={() => { fecharMenu(); duplicarPagina(pg); }}>
                <i className="fa-solid fa-copy"></i> Criar cópia
              </DotsMenuItem>
              {pg.status === 'publicada' && (
                <DotsMenuItem type="button" style={{ color: '#d97706' }} onClick={() => { fecharMenu(); despublicarPagina(pg.id); }}>
                  <i className="fa-solid fa-eye-slash"></i> Despublicar
                </DotsMenuItem>
              )}
            </DotsMenu>
          );
        })()}

      </PageContainer>


      {/* === MODAL EDITOR GRAPESJS === */}
      {mostrarModal && (
        <FullScreenModalOverlay>
          <FullScreenContent>
            {/* === BARRA DE TOPO ESCURA === */}
            <BuilderTopBar>
              <div className="brand">
                <i className="fa-solid fa-palette"></i>
                <span className="titulo">Editor Visual</span>
                {nome && <PageTitleChip title={nome}>{nome}</PageTitleChip>}
                <StatusPill $status={statusLP}>
                  {statusLP === 'publicada' ? <><i className="fa-solid fa-circle-dot"></i> Publicada</> : <><i className="fa-regular fa-circle"></i> Rascunho</>}
                </StatusPill>
              </div>
              <div className="acoes">
                {editandoId && (
                  <TopBarBtn $danger title="Excluir página" type="button" onClick={() => deletarPagina(editandoId)}>
                    <i className="fa-solid fa-trash-can"></i>
                  </TopBarBtn>
                )}
                <TopBarBtn title="Editar HTML/CSS" type="button" onClick={abrirEditorHtmlBruto}>
                  <i className="fa-solid fa-code"></i>
                </TopBarBtn>
                {editandoId && slug && (
                  <TopBarBtn title="Pré-visualizar rascunho" type="button" onClick={() => window.open(`${LANDING_DOMAIN}/lp-preview/${slug}`, '_blank')}>
                    <i className="fa-solid fa-eye"></i>
                  </TopBarBtn>
                )}
                <TopBarBtn title="Fechar editor" type="button" onClick={() => { liberarTravaLandingPage(); setMostrarModal(false); }}>
                  <i className="fa-solid fa-xmark"></i>
                </TopBarBtn>
                <TopBarSaveBtn type="submit" form="lpForm" title="Salvar rascunho">
                  <i className="fa-solid fa-save"></i> Salvar
                </TopBarSaveBtn>
                {editandoId && statusLP === 'publicada' && (
                  <TopBarUnpublishBtn type="button" onClick={() => despublicarPagina(editandoId)} title="Despublicar">
                    <i className="fa-solid fa-eye-slash"></i> Despublicar
                  </TopBarUnpublishBtn>
                )}
                {editandoId && (
                  <TopBarPublishBtn type="button" onClick={publicarPagina} disabled={publicandoLP}>
                    {publicandoLP
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Publicando…</>
                      : <><i className="fa-solid fa-globe"></i> Publicar</>}
                  </TopBarPublishBtn>
                )}
              </div>
            </BuilderTopBar>

            {/* === FAIXA DE CONFIGURAÇÃO CLARA === */}
            <BuilderConfigBar>
              <form id="lpForm" onSubmit={salvarPagina} style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flex: 1, flexWrap: 'wrap' }}>
                <FormGroupInline style={{ flex: '2 1 200px' }}>
                  <label>Nome da Página</label>
                  <Input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Inscrição Módulo B" />
                </FormGroupInline>

                <FormGroupInline style={{ flex: '2 1 180px' }}>
                  <label>URL Amigável</label>
                  <SlugInputGroup>
                    <span className="prefix">/lp/</span>
                    <Input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required placeholder="modulo-b" />
                  </SlugInputGroup>
                </FormGroupInline>

                <FormGroupInline style={{ flex: '3 1 260px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Campanhas do Formulário
                    {campanhasIds.length >= 2 && (
                      <DescontoBadge>
                        <i className="fa-solid fa-tag"></i>
                        {campanhasIds.length >= 3 ? '15%' : '10%'} desconto
                      </DescontoBadge>
                    )}
                  </label>
                  <ChipInputWrapper ref={chipInputRef}>
                    <div className="chips-area">
                      {campanhasIds.map(id => {
                        const c = campanhas.find(x => Number(x.id) === id);
                        if (!c) return null;
                        return (
                          <CampanhaChip key={id}>
                            <span className="chip-text" title={c.nome}>{c.nome}</span>
                            <button
                              type="button"
                              onClick={() => setCampanhasIds(prev => prev.filter(x => x !== id))}
                              title={`Remover: ${c.nome}`}
                            >×</button>
                          </CampanhaChip>
                        );
                      })}
                      <AddCampanhaBtn
                        type="button"
                        onClick={() => setDropdownCampanhasAberto(v => !v)}
                      >
                        <i className="fa-solid fa-plus"></i> Adicionar
                      </AddCampanhaBtn>
                    </div>
                    {dropdownCampanhasAberto && (
                      <CampanhaDropdown>
                        {campanhas.filter(c => !campanhasIds.includes(Number(c.id)) && campanhaEstaAtiva(c)).length === 0 && (
                          <div className="vazio">Todas as campanhas ativas já selecionadas</div>
                        )}
                        {campanhas
                          .filter(c => !campanhasIds.includes(Number(c.id)) && campanhaEstaAtiva(c))
                          .map(c => (
                            <div
                              key={c.id}
                              className="item"
                              onMouseDown={() => {
                                setCampanhasIds(prev => [...prev, Number(c.id)]);
                                setDropdownCampanhasAberto(false);
                              }}
                            >
                              <i className="fa-regular fa-square-check"></i> {c.nome}
                            </div>
                          ))}
                      </CampanhaDropdown>
                    )}
                  </ChipInputWrapper>
                  {campanhasIds.length === 0 && (
                    <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 3 }}>Nenhuma campanha — formulário sem vínculo</small>
                  )}
                </FormGroupInline>

                {!editandoId && (
                  <FormGroupInline style={{ flex: '1 1 130px' }}>
                    <label>Status Inicial</label>
                    <Select value={statusLP} onChange={(e) => setStatusLP(e.target.value)}>
                      <option value="rascunho">Rascunho</option>
                      <option value="publicada">Publicada</option>
                    </Select>
                  </FormGroupInline>
                )}
              </form>
            </BuilderConfigBar>

            {/* Container do GrapesJS */}
            <div id="gjs" style={{ flex: 1, overflow: 'hidden' }}></div>

          </FullScreenContent>
        </FullScreenModalOverlay>
      )}

      {mostrarHtmlBruto && (
        <ModalOverlay onClick={() => setMostrarHtmlBruto(false)}>
          <WizardContent style={{ maxWidth: '980px', maxHeight: '90vh', width: '100%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3><i className="fa-solid fa-code"></i> Editor HTML/CSS</h3>
                <span className="subtitle">Edite diretamente o conteúdo e o estilo da página em texto.</span>
              </div>
              <CloseButton type="button" onClick={() => setMostrarHtmlBruto(false)}>×</CloseButton>
            </ModalHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                <label style={{ fontWeight: 700 }}>HTML</label>
                <CodeTextarea value={htmlBruto} onChange={(e) => setHtmlBruto(e.target.value)} style={{ flex: 1, minHeight: '250px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                <label style={{ fontWeight: 700 }}>CSS</label>
                <CodeTextarea value={cssBruto} onChange={(e) => setCssBruto(e.target.value)} style={{ flex: 1, minHeight: '180px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <SecondaryButton type="button" onClick={() => setMostrarHtmlBruto(false)}>Fechar</SecondaryButton>
                <PrimaryButton type="button" onClick={aplicarHtmlBruto}>Aplicar</PrimaryButton>
              </div>
            </div>
          </WizardContent>
        </ModalOverlay>
      )}
    </>
  );
}

// ==========================================
// ANIMAÇÕES E STYLED COMPONENTS
// ==========================================

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
  @media (max-width: 768px) { padding: 15px; }
`;

const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 25px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; .btn-mobile { width: 100%; justify-content: center; } }
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;

// --- FILTROS ---
const FilterBar = styled.div`
  display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 25px; background: #fff; padding: 15px 20px; border-radius: 12px; border: 1px solid #edf2f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
  @media (max-width: 768px) { flex-direction: column; width: 100%; }
`;
const SearchWrapper = styled.div`
  position: relative; flex: 1; min-width: 250px;
  .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
  input { width: 100%; padding: 12px 12px 12px 40px; border-radius: 50px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; transition: 0.2s; box-sizing: border-box; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); } }
  @media (max-width: 768px) { width: 100%; }
`;

// --- TABELA ---
const Panel = styled.div`
  background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; overflow: hidden; margin-bottom: 20px;
`;
const TabelaResponsiva = styled.div`
  overflow-x: auto; 
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; font-weight: 700;}
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; color: #2c3e50; transition: background 0.2s;}
  tr:last-child td { border-bottom: none; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);}
  .text-center { text-align: center; } .text-muted { color: #a0aec0; } .font-bold { font-weight: 700;}

  @media (max-width: 768px) {
    min-width: unset; display: block;
    thead, tbody, th, td, tr { display: block; }
    thead tr { position: absolute; top: -9999px; left: -9999px; }
    
    tr {
      background: #fff; border: 1px solid #edf2f9; border-radius: 12px; margin: 15px 0; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }
    
    td {
      border: none; border-bottom: 1px solid #f1f5f9; position: relative; padding: 12px 10px 12px 40%; 
      text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; min-height: 40px; width: 100%; box-sizing: border-box;
    }
    
    td:last-child { border-bottom: none; }
    
    td::before {
      position: absolute; top: 50%; left: 10px; transform: translateY(-50%); width: 35%; padding-right: 10px; 
      white-space: nowrap; text-align: left; font-weight: 700; color: #6c757d; font-size: 0.75rem; 
      content: attr(data-label); text-transform: uppercase;
    }
    .actions-cell { justify-content: flex-end; }
  }
`;

const ClickableRow = styled.tr`
  cursor: pointer; transition: 0.2s; animation: ${fadeInUp} 0.4s ease forwards; opacity: 0;
  &:hover { background-color: #f8fafc; }
  .main-name { font-size: 1.05rem; font-weight: 700; color: #007bff; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;}
  .meta { display: flex; gap: 15px; font-size: 0.85rem; color: #64748b; span { display: flex; align-items: center; gap: 5px; } }
  .comp-name { font-weight: 600; color: #475569; display: flex; align-items: center; gap: 6px; }
`;

const StatusBadge = styled.span`
  padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;
  &.published { background: #d4edda; color: #155724; }
  &.draft { background: #fff3cd; color: #856404; }
  &.draft-pending { background: #fff3cd; color: #92400e; border: 1px solid #f59e0b; }
`;

// --- BOTÕES ---
const ButtonBase = styled.button`padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; gap: 8px; justify-content: center; &:active:not(:disabled) { transform: scale(0.98); } &:disabled{ opacity: 0.6; cursor: not-allowed;}`;
const PrimaryButton = styled(ButtonBase)`background: #007bff; color: #fff; &:hover:not(:disabled) { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }`;
const SecondaryButton = styled(ButtonBase)`background: #e2e8f0; color: #475569; &:hover:not(:disabled) { background: #cbd5e1; }`;
const DangerButton = styled(ButtonBase)`background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; &:hover:not(:disabled) { background: #dc3545; color: #fff; }`;
const PublishButton = styled(ButtonBase)`background: #16a34a; color: #fff; &:hover:not(:disabled) { background: #15803d; box-shadow: 0 4px 10px rgba(22,163,74,0.25); }`;
const UnpublishButton = styled(ButtonBase)`background: #fff7ed; color: #d97706; border: 1px solid #fed7aa; &:hover:not(:disabled) { background: #d97706; color: #fff; }`;
const DotsButton = styled.button`background: none; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 1.1rem; font-weight: 900; color: #64748b; letter-spacing: 2px; line-height: 1; &:hover { background: #f1f5f9; border-color: #cbd5e1; }`;
const DotsMenu = styled.div`position: fixed; z-index: 9999; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); min-width: 160px; overflow: hidden;`;
const DotsMenuItem = styled.button`display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 16px; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #374151; text-align: left; text-decoration: none; &:hover { background: #f8fafc; color: #007bff; } i { width: 14px; }`;
const AiButton = styled(ButtonBase)`background: linear-gradient(135deg, #8b5cf6, #d946ef); color: white; border: none; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: all 0.2s ease; &:hover:not(:disabled) { background: linear-gradient(135deg, #7c3aed, #c026d3); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); } `;

// --- MODAIS GERAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 10001; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box;
`;

const WizardContent = styled.div`
  background: white; border-radius: 12px; width: 100%; max-width: 600px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: ${fadeInUp} 0.3s ease-out;
`;

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #edf2f9; background: ${props => props.$bg || '#fff'}; color: ${props => props.$color || '#333'};
  h3 { margin: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 8px;}
  .subtitle { font-size: 0.85rem; color: #64748b; margin-top: 4px; display: block;}
  @media (max-width: 600px) { h3 { font-size: 1.15rem; padding-right: 30px; } }
`;

const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; cursor: pointer; color: ${props => props.$color || '#94a3b8'}; transition: 0.2s;
  &:hover { color: #dc3545; }
  @media (max-width: 600px) { position: absolute; right: 15px; top: 15px; }
`;

// --- EDITOR FULL SCREEN (LOW-CODE) ---
const FullScreenModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; flex-direction: column;
`;

const FullScreenContent = styled.div`
  width: 100%; height: 100%; background: #ffffff; display: flex; flex-direction: column; overflow: hidden;
`;

/* === BARRA ESCURA DO EDITOR === */
const BuilderTopBar = styled.div`
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  padding: 0 20px;
  height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  z-index: 200;

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    i { color: #60a5fa; font-size: 1.1rem; flex-shrink: 0; }
    .titulo { color: #94a3b8; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.03em; white-space: nowrap; flex-shrink: 0; }
  }

  .acoes {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
  }
`;

const PageTitleChip = styled.span`
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.8rem;
  font-weight: 500;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  ${({ $status }) => $status === 'publicada'
    ? 'background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3);'
    : 'background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);'}
`;

const TopBarBtn = styled.button`
  background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'};
  color: ${({ $danger }) => $danger ? '#f87171' : '#94a3b8'};
  border: 1px solid ${({ $danger }) => $danger ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'};
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.82rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255,255,255,0.12); color: #f1f5f9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const TopBarSaveBtn = styled(TopBarBtn)`
  background: rgba(59,130,246,0.15);
  color: #93c5fd;
  border-color: rgba(59,130,246,0.3);
  font-weight: 600;
  &:hover { background: rgba(59,130,246,0.25); color: #bfdbfe; }
`;

const TopBarUnpublishBtn = styled(TopBarBtn)`
  background: rgba(245,158,11,0.1);
  color: #fbbf24;
  border-color: rgba(245,158,11,0.25);
  font-weight: 600;
  &:hover { background: rgba(245,158,11,0.2); color: #fde68a; }
`;

const TopBarPublishBtn = styled(TopBarBtn)`
  background: rgba(34,197,94,0.15);
  color: #4ade80;
  border-color: rgba(34,197,94,0.3);
  font-weight: 700;
  padding: 6px 14px;
  &:hover { background: rgba(34,197,94,0.25); color: #86efac; }
`;

/* === FAIXA DE CONFIGURAÇÃO CLARA === */
const BuilderConfigBar = styled.div`
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 24px 12px;
  flex-shrink: 0;
  z-index: 100;
`;

const FormGroupInline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0;
  label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

/* === SELETOR DE CAMPANHAS COM CHIPS === */
const ChipInputWrapper = styled.div`
  position: relative;
  .chips-area {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    min-height: 36px;
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #fff;
    cursor: text;
    transition: border-color 0.15s;
    &:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  }
`;

const CampanhaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
  border-radius: 20px;
  padding: 2px 8px 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  max-width: 220px;
  min-width: 0;
  .chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  button {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0 0 2px;
    flex-shrink: 0;
    &:hover { color: #dc2626; }
  }
`;

const AddCampanhaBtn = styled.button`
  background: none;
  border: 1px dashed #94a3b8;
  border-radius: 20px;
  color: #64748b;
  font-size: 0.78rem;
  padding: 2px 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  &:hover { border-color: #2563eb; color: #2563eb; }
`;

const CampanhaDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 500;
  max-height: 220px;
  overflow-y: auto;
  .item {
    padding: 9px 14px;
    font-size: 0.85rem;
    color: #334155;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
    &:hover { background: #eff6ff; color: #1e40af; }
    i { color: #93c5fd; }
  }
  .vazio { padding: 12px 14px; color: #94a3b8; font-size: 0.83rem; font-style: italic; }
`;

const DescontoBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 0.72rem;
  font-weight: 700;
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 4px; flex: 1; margin-bottom: 15px;
  label { font-size: 0.85rem; font-weight: 700; color: #475569;}
`;

const Input = styled.input`
  padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #2c3e50; outline: none; background: #f8fafc; transition: 0.2s; box-sizing: border-box; width: 100%;
  &:focus { border-color: #007bff; background: #fff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;

const CodeTextarea = styled.textarea`
  width: 100%;
  min-height: 220px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.9rem;
  padding: 14px;
  resize: vertical;
  box-sizing: border-box;
`;

const Select = styled.select`
  padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #2c3e50; outline: none; background: #f8fafc; transition: 0.2s; box-sizing: border-box; width: 100%;
  &:focus { border-color: #007bff; background: #fff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.published { color: #155724; font-weight: 700; background: #e6f4ea; border-color: #c3e6cb;}
  &.draft { color: #856404; font-weight: 700; background: #fff3cd; border-color: #ffeeba;}
`;

const SlugInputGroup = styled.div`
  display: flex; align-items: center;
  .prefix { background: #e2e8f0; color: #64748b; padding: 10px; border: 1px solid #cbd5e1; border-right: none; border-radius: 6px 0 0 6px; font-size: 0.9rem; font-weight: 600;}
  input { border-radius: 0 6px 6px 0; flex: 1; }
`;