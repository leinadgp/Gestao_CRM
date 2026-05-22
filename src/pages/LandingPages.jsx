import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';

// Importações do GrapesJS
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import 'grapesjs-preset-webpage';

export function LandingPages() {
  const [paginas, setPaginas] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [buscaGeral, setBuscaGeral] = useState('');
  
  // === ESTADOS DO SUPER MODAL DO GRAPESJS ===
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [statusLP, setStatusLP] = useState('rascunho');
  const [campanhaId, setCampanhaId] = useState('');
  
  // === ESTADOS DO ASSISTENTE MÁGICO (IA) ===
  const [mostrarWizardIA, setMostrarWizardIA] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [iaPrompt, setIaPrompt] = useState({
    nomeCurso: '',
    publicoAlvo: '',
    beneficios: '',
    chamadaAcao: ''
  });

  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
  
  const editorRef = useRef(null);
  const [htmlInicial, setHtmlInicial] = useState('');
  const [cssInicial, setCssInicial] = useState('');

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

  // === INICIALIZAÇÃO DO GRAPESJS (MODO LEIGO / BLINDADO) ===
  useEffect(() => {
    if (mostrarModal && !editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        fromElement: true,
        height: '100%',
        width: 'auto',
        storageManager: false, 
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {}
        },
        i18n: {
          locale: 'pt',
          localeFallback: 'en',
          messages: {
            pt: {
              assetManager: { modalTitle: 'Selecionar Imagem da Empresa', uploadTitle: 'Arraste as imagens aqui ou clique para enviar' }
            }
          }
        }
      });

      editorRef.current = editor;

      // Eventos de blindagem
      editor.on('load', () => {
        editor.Panels.removeButton('views', 'open-sm');
        editor.Panels.removeButton('views', 'open-tm');
        editor.Panels.removeButton('views', 'open-layers');
        editor.Panels.getButton('views', 'open-blocks').set('active', true);
      });

      // Abertura automática da galeria ao clicar numa imagem
      editor.on('component:selected', (component) => {
        if (component.get('type') === 'image') {
          editor.runCommand('open-assets', { target: component });
        }
      });

      // BLOCO 1: CAPA AUTORIDADE
      editor.BlockManager.add('autoridade-hero', {
        label: '<i class="fa-solid fa-crown fa-2x"></i><br/>Capa Autoridade',
        category: 'Estilo Premium',
        content: `
          <section style="background: linear-gradient(rgba(11, 25, 44, 0.85), rgba(11, 25, 44, 0.85)), url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop') center/cover; padding: 120px 20px; color: #fff; font-family: Arial, sans-serif;">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 40px;">
              <div style="flex: 1; min-width: 300px; max-width: 700px;">
                <h1 style="font-size: 46px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Título do Programa Aqui</h1>
                <p style="font-size: 20px; line-height: 1.6; margin-bottom: 40px; color: #cbd5e1;">Escreva o subtítulo persuasivo do seu serviço ou curso.</p>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                  <a href="#form-inscricao" style="background: #fbbf24; color: #000; padding: 18px 35px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 18px;">Quero garantir minha vaga!</a>
                </div>
              </div>
              <div style="flex: 1; min-width: 300px; text-align: center;">
                 <img src="https://via.placeholder.com/400x150?text=Sua+Logo+Aqui" style="max-width: 100%; border-radius: 10px;" alt="Logo da Empresa" />
                 <p style="margin-top: 15px; color: #94a3b8; font-size: 14px;">(Clique 2x para trocar a logo)</p>
              </div>
            </div>
          </section>
        `
      });

      // BLOCO 2: DORES/SOLUÇÕES
      editor.BlockManager.add('rd-benefits', {
        label: '<i class="fa-solid fa-triangle-exclamation fa-2x"></i><br/>Dores/Soluções',
        category: 'Estilo Premium',
        content: `
          <section id="sobre" style="padding: 80px 20px; background-color: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1000px; margin: 0 auto;">
              <h2 style="text-align: center; color: #0f172a; margin-bottom: 50px; font-size: 32px;">Você enfrenta esses desafios?</h2>
              <div style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 280px; background: #fff5f5; padding: 40px 30px; border-radius: 8px; border-top: 4px solid #dc3545; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <h3 style="color: #dc3545; margin-top: 0; font-size: 20px;">Problema 1</h3>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5;">Descreva a dor principal do seu cliente aqui.</p>
                </div>
                <div style="flex: 1; min-width: 280px; background: #f0f7ff; padding: 40px 30px; border-radius: 8px; border-top: 4px solid #007bff; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <h3 style="color: #007bff; margin-top: 0; font-size: 20px;">A Solução</h3>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5;">Aprenda o passo a passo prático para resolver.</p>
                </div>
              </div>
            </div>
          </section>
        `,
      });

      // BLOCO 3: FORMULÁRIO DE INSCRIÇÃO
      editor.BlockManager.add('rd-form', {
        label: '<i class="fa-solid fa-address-card fa-2x"></i><br/>Form. Inscrição',
        category: 'Estilo Premium',
        content: `
          <section id="form-inscricao" style="padding: 60px 20px; background-color: #f8fafc; font-family: Arial, sans-serif;">
            <div style="max-width: 700px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
              <h2 style="text-align: center; color: #0f172a; margin-bottom: 10px; font-size: 28px;">Garanta sua Vaga</h2>
              <p style="text-align: center; color: #64748b; margin-bottom: 30px;">Preencha os dados abaixo para confirmar sua inscrição.</p>
              
              <form id="formInscricaoCRM" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                  <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Nome completo*</label>
                  <input type="text" id="nome" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                </div>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Email*</label>
                    <input type="email" id="email" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Telefone (WhatsApp)*</label>
                    <input type="text" id="whatsapp" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                </div>

                <div style="margin-top: 10px; padding: 20px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b8daff;">
                  <label style="font-size: 1rem; font-weight: bold; color: #007bff; display: block; margin-bottom: 10px;">Opções de Inscrição</label>
                  <div id="containerModulos">
                     <div style="color: #64748b; font-size: 0.9rem; font-style: italic;">
                       (Os módulos definidos na campanha aparecerão automaticamente aqui)
                     </div>
                  </div>
                </div>

                <button type="submit" id="btnSubmit" style="margin-top: 20px; width: 100%; padding: 18px; background-color: #0f172a; color: #fff; border: none; border-radius: 5px; font-size: 1.2rem; font-weight: bold; cursor: pointer;">
                  CONFIRMAR INSCRIÇÃO
                </button>
                <div id="feedback" style="display:none; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px; font-weight: bold;"></div>
              </form>
            </div>
          </section>
        `,
      });

      if (htmlInicial) {
        editor.setComponents(htmlInicial);
        if (cssInicial) editor.setStyle(cssInicial);
      } else {
        editor.setComponents('<div style="padding: 50px; text-align: center; font-family: sans-serif; color: #999;"><h1>Seu Editor de Páginas Profissional</h1><p>Arraste a "Capa Autoridade" e o "Form. Inscrição" do menu lateral.</p></div>');
      }
    }

    return () => {
      if (!mostrarModal && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mostrarModal, htmlInicial, cssInicial]); 

 // === A MÁGICA DA IA (GERAR COPY COMPLETA / PÁGINA LONGA) ===
  async function handleGerarComIA(e) {
    e.preventDefault();
    setGerandoIA(true);

    try {
      const payloadIA = { ...iaPrompt };

      if (campanhaId) {
        const campSelecionada = campanhas.find(c => c.id === Number(campanhaId));
        if (campSelecionada) {
          payloadIA.nomeCurso = payloadIA.nomeCurso || campSelecionada.nome;
          payloadIA.descricaoCampanha = campSelecionada.descricao || '';
          payloadIA.informacaoExtra = campSelecionada.informacao_extra || '';
          try {
            const resMods = await axios.get(`${API_URL}/campanhas/${campanhaId}/modulos`, getHeaders());
            payloadIA.modulosCampanha = resMods.data || [];
          } catch {
            payloadIA.modulosCampanha = [];
          }
        }
      }

      const resposta = await axios.post(`${API_URL}/api/ia/gerar-copy`, payloadIA, getHeaders());
      const copy = resposta.data;

      // ========================================================
      // 2. CONSTRUÇÃO DOS BLOCOS HTML (ESTILO AUTORIDADE PÚBLICA)
      // ========================================================
      
      // Estilos base repetidos
      const sectionStyle = "padding: 80px 20px; font-family: sans-serif; box-sizing: border-box;";
      const containerStyle = "max-width: 1100px; margin: 0 auto;";
      const titleStyle = "font-size: 36px; font-weight: 800; text-align: center; margin-bottom: 50px;";
      const ctaStyle = "display: inline-block; background-color: #fbbf24; color: #0f172a; padding: 18px 35px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 18px; transition: 0.2s;";

      // BLOCO 1: HERO/GANCHO (AZUL ESCURO)
      const blocoHero = `
        <section style="${sectionStyle} background: #0b192c; color: #ffffff;">
          <div style="${containerStyle} text-align: center; display: flex; flex-direction: column; align-items: center; gap: 30px;">
             <img src="https://via.placeholder.com/250x60?text=Sua+Logo+Aqui" style="max-width: 250px; filter: brightness(0) invert(1);" alt="Logo" />
             <h1 style="font-size: 48px; font-weight: 800; line-height: 1.1; color: #ffffff; margin: 0;">${copy.hook.headline}</h1>
             <p style="font-size: 22px; color: #cbd5e1; max-width: 800px; margin: 0;">${copy.hook.subheadline}</p>
             <a href="#form-inscricao" style="${ctaStyle}">${copy.hook.cta_texto}</a>
          </div>
        </section>
      `;

      // BLOCO 2: PROBLEMA (VERMELHO SOFT)
      const blocoProblema = `
        <section style="${sectionStyle} background: #fef2f2;">
          <div style="${containerStyle}">
             <h2 style="${titleStyle} color: #b91c1c;">${copy.problema.titulo}</h2>
             <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
               ${(copy.problema.cards || []).map(card => `
                 <div style="flex: 1; min-width: 260px; max-width: 350px; background: #fff; padding: 30px; border-radius: 8px; border-top: 4px solid #ef4444; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <p style="color: #475569; font-size: 17px; line-height: 1.5; margin: 0; font-weight: 600;">${card}</p>
                 </div>
               `).join('')}
             </div>
          </div>
        </section>
      `;

      // BLOCO 3: AGITAÇÃO (BRANCO)
      const blocoAgitacao = `
        <section style="${sectionStyle} background: #ffffff;">
          <div style="${containerStyle} text-align: center; max-width: 800px;">
             <p style="font-size: 20px; color: #1e293b; line-height: 1.8; font-weight: 600;">${copy.agitacao.texto_longo}</p>
          </div>
        </section>
      `;

      // BLOCO 4: SOLUÇÃO (AZUL ESCURO)
      const blocoSolucao = `
        <section style="${sectionStyle} background: #0b192c; color: #ffffff;">
          <div style="${containerStyle} display: flex; flex-wrap: wrap; gap: 40px; align-items: center;">
             <div style="flex: 1; min-width: 300px;">
                <h2 style="font-size: 36px; font-weight: 800; color: #fbbf24; margin-bottom: 20px;">${copy.solucao.titulo}</h2>
                <p style="font-size: 19px; color: #ffffff; font-weight: 700; margin-bottom: 30px;">${copy.solucao.texto_destaque}</p>
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                  ${(copy.solucao.lista || []).map(item => `
                    <li style="margin-bottom: 15px; font-size: 17px; display: flex; align-items: center; gap: 10px; color: #cbd5e1;"><i class="fa-solid fa-check-circle" style="color: #fbbf24;"></i> ${item}</li>
                  `).join('')}
                </ul>
                <a href="#form-inscricao" style="${ctaStyle}">Inspecionar Módulos e Preços</a>
             </div>
             <div style="flex: 1; min-width: 300px; text-align: center;">
               <img src="https://images.unsplash.com/photo-1593720213428-28a5b9e94613?q=80&w=600&auto=format&fit=crop" style="max-width: 100%; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);" alt="Estrutura do Curso" />
             </div>
          </div>
        </section>
      `;

      // BLOCO 5: AUTORIDADE (BRANCO)
      const blocoAutoridade = `
        <section id="sobre" style="${sectionStyle} background: #ffffff;">
          <div style="${containerStyle} display: flex; flex-wrap: wrap; gap: 40px; align-items: center; background: #f8fafc; padding: 50px; border-radius: 12px; border: 1px solid #e2e8f0;">
             <div style="flex: 1; min-width: 250px; text-align: center;">
               <img src="https://via.placeholder.com/250x250?text=Sua+Foto+Aqui" style="width: 220px; height: 220px; border-radius: 50%; object-fit: cover; border: 6px solid #fbbf24;" alt="Instrutor" />
               <p style="color: #64748b; font-size: 13px; margin-top: 10px;">(Clique 2x para trocar a foto)</p>
             </div>
             <div style="flex: 2; min-width: 300px;">
                <h2 style="font-size: 28px; font-weight: 800; color: #0b192c; margin-bottom: 5px;">Quem vai te guiar</h2>
                <h3 style="font-size: 20px; color: #fbbf24; margin-top: 0; margin-bottom: 25px; font-weight: bold;">${copy.autoridade.nome_professor}</h3>
                <p style="font-size: 17px; color: #475569; line-height: 1.7;">${copy.autoridade.bio_prefixo}</p>
                <p style="font-size: 16px; color: #64748b; line-height: 1.7;">A IA gerou a introdução. Clique aqui e escreva o currículo completo profissional do professor.</p>
             </div>
          </div>
        </section>
      `;

      // BLOCO 6: FAQ (CINZA SOFT)
      const blocoFaq = `
        <section style="${sectionStyle} background: #f8fafc;">
          <div style="${containerStyle} max-width: 800px;">
             <h2 style="${titleStyle} color: #0b192c;">Dúvidas Frequentes</h2>
             <div style="display: flex; flex-direction: column; gap: 15px;">
               ${(copy.faq || []).map(item => `
                 <div style="background: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 10px 0; font-size: 18px; color: #0b192c; font-weight: bold;">${item.pergunta}</h4>
                    <p style="margin: 0; color: #64748b; font-size: 16px; line-height: 1.6;">${item.resposta}</p>
                 </div>
               `).join('')}
             </div>
          </div>
        </section>
      `;

      // BLOCO 7: FORMULÁRIO E CHAMADA FINAL (AZUL ESCURO)
      const blocoFinal = `
        <section id="form-inscricao" style="${sectionStyle} background: #0b192c; color: #ffffff;">
          <div style="${containerStyle} text-align: center; max-width: 700px; padding-bottom: 60px;">
             <p style="font-size: 22px; color: #cbd5e1; font-weight: bold; margin-bottom: 10px;">Últimas Vagas Disponíveis</p>
             <h2 style="font-size: 32px; font-weight: 800; color: #fbbf24; margin-top: 0; margin-bottom: 20px;">${copy.chamada_final.texto}</h2>
          </div>
          
          <div style="${containerStyle} max-width: 700px; background: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
              <h2 style="text-align: center; color: #0f172a; margin-bottom: 10px; font-size: 28px;">Garanta sua Vaga</h2>
              <p style="text-align: center; color: #64748b; margin-bottom: 30px;">Preencha os dados abaixo para confirmar sua inscrição no curso.</p>
              
              <form id="formInscricaoCRM" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                  <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Nome completo*</label>
                  <input type="text" id="nome" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                </div>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Email*</label>
                    <input type="email" id="email" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Telefone (WhatsApp)*</label>
                    <input type="text" id="whatsapp" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                </div>

                <div style="margin-top: 10px; padding: 20px; background: #f0f7ff; border-radius: 8px; border: 1px solid #b8daff;">
                  <label style="font-size: 1rem; font-weight: bold; color: #007bff; display: block; margin-bottom: 10px;">Opções de Inscrição</label>
                  <div id="containerModulos">
                     <div style="color: #64748b; font-size: 0.9rem; font-style: italic;">
                       (Os módulos e combos de desconto definidos na campanha aparecerão automaticamente aqui)
                     </div>
                  </div>
                </div>

                <button type="submit" id="btnSubmit" style="margin-top: 20px; width: 100%; padding: 18px; background-color: #0b192c; color: #fff; border: none; border-radius: 5px; font-size: 1.2rem; font-weight: bold; cursor: pointer; transition: background 0.3s;">
                  ${copy.chamada_final.cta_texto}
                </button>
                <div id="feedback" style="display:none; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px; font-weight: bold;"></div>
              </form>
          </div>
        </section>
      `;

      // 3. Monta a página completa empilhando os blocos na ordem correta
      const htmlFinalGerado = `
        ${blocoHero}
        ${blocoProblema}
        ${blocoAgitacao}
        ${blocoSolucao}
        ${blocoAutoridade}
        ${blocoFaq}
        ${blocoFinal}
      `;

      // 4. Injeta tudo no editor e abre o modal principal
      setHtmlInicial(htmlFinalGerado);
      setCssInicial(''); // GrapesJS lidará com o CSS embutido
      setMostrarWizardIA(false); // Fecha a janelinha
      setMostrarModal(true); // Abre o editor

      // 5. Configurações auxiliares do formulário
      setNome(iaPrompt.nomeCurso);
      const slugAutomatizado = iaPrompt.nomeCurso.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setSlug(slugAutomatizado);
      setStatusLP('rascunho');

    } catch (error) {
      console.error(error);
      alert('Houve uma falha na geração. Verifique os dados ou tente novamente mais tarde.');
    } finally {
      setGerandoIA(false);
    }
  }

  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setSlug(''); setStatusLP('rascunho'); setCampanhaId(''); setHtmlInicial(''); setCssInicial(''); setMostrarModal(true);
  }

  function abrirModalEdicao(lp) {
    setEditandoId(lp.id); setNome(lp.nome); setSlug(lp.slug); setStatusLP(lp.status || 'rascunho'); setCampanhaId(lp.campanha_id || ''); setHtmlInicial(lp.html_content || ''); setCssInicial(lp.css_content || ''); setMostrarModal(true);
  }

  async function salvarPagina(e) {
    e.preventDefault();
    if(!slug.trim()) return alert("O Slug é obrigatório!");

    const slugFormatado = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const htmlGerado = editorRef.current ? editorRef.current.getHtml() : htmlInicial;
    const cssGerado = editorRef.current ? editorRef.current.getCss() : cssInicial;

    const payload = { nome, slug: slugFormatado, status: statusLP, campanha_id: campanhaId || null, html_content: htmlGerado, css_content: cssGerado };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/landing-pages/${editandoId}`, payload, getHeaders());
        alert("Página atualizada com sucesso!");
      } else {
        await axios.post(`${API_URL}/landing-pages`, payload, getHeaders());
        alert("Página criada com sucesso!");
      }
      setMostrarModal(false); carregarDados();
    } catch (err) { alert(err.response?.data?.erro || 'Erro ao salvar a página.'); }
  }

  async function deletarPagina(id) {
    if (!window.confirm("Deseja realmente apagar esta Landing Page? Isso removerá a página do ar.")) return;
    try { await axios.delete(`${API_URL}/landing-pages/${id}`, getHeaders()); setMostrarModal(false); carregarDados(); } catch (err) { alert("Erro ao excluir página."); }
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
            <SecondaryButton onClick={abrirModalNovo} className="btn-mobile">
              <i className="fa-solid fa-code"></i> Criar do Zero
            </SecondaryButton>
            <AiButton onClick={() => setMostrarWizardIA(true)} className="btn-mobile">
              <i className="fa-solid fa-wand-magic-sparkles"></i> Gerar com IA
            </AiButton>
          </div>
        </TopSection>

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
                  <th className="text-center" style={{width: '120px'}}>Link Ao Vivo</th>
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
                        <StatusBadge className={p.status === 'publicada' ? 'published' : 'draft'}>
                          {p.status === 'publicada' ? '🌐 Publicada' : '📝 Rascunho'}
                        </StatusBadge>
                      </td>
                      <td data-label="Link Ao Vivo" className="text-center actions-cell">
                        <LinkButton href={`${API_URL}/lp/${p.slug}`} target="_blank" rel="noreferrer" title="Abrir página online" onClick={(e) => e.stopPropagation()}>
                          <i className="fa-solid fa-arrow-up-right-from-square"></i> Visitar
                        </LinkButton>
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </Table>
          </TabelaResponsiva>
        </Panel>

      </PageContainer>

     {/* === MODAL WIZARD IA === */}
      {mostrarWizardIA && (
        <ModalOverlay onClick={() => setMostrarWizardIA(false)} style={{zIndex: 10001}}>
          <WizardContent onClick={e => e.stopPropagation()}>
            <ModalHeader $bg="#f8fafc">
              <div>
                <h3><i className="fa-solid fa-wand-magic-sparkles" style={{color: '#8b5cf6'}}></i> Assistente de Criação (IA)</h3>
                <span className="subtitle">Responda rapidamente e deixe a inteligência artificial escrever sua página.</span>
              </div>
              <CloseButton onClick={() => setMostrarWizardIA(false)}>&times;</CloseButton>
            </ModalHeader>
            
            <form onSubmit={handleGerarComIA} style={{ padding: '25px' }}>
              
              {/* === NOVO: PUXANDO DADOS DO CRM DIRETO === */}
              <FormGroup style={{marginBottom: '15px'}}>
                <label style={{color: '#007bff'}}>1. Vincular a uma Campanha existente? (Recomendado)</label>
                <Select 
                  value={campanhaId} 
                  onChange={e => {
                    const idSelecionado = e.target.value;
                    setCampanhaId(idSelecionado);
                    
                    // Se ele selecionar uma campanha, já preenche o nome do curso pra ele!
                    if (idSelecionado) {
                      const campSelecionada = campanhas.find(c => c.id === Number(idSelecionado));
                      if (campSelecionada) {
                        setIaPrompt({
                          ...iaPrompt,
                          nomeCurso: campSelecionada.nome,
                          beneficios: campSelecionada.descricao || iaPrompt.beneficios
                        });
                      }
                    } else {
                      setIaPrompt({...iaPrompt, nomeCurso: '', beneficios: ''});
                    }
                  }}
                  style={{borderColor: '#007bff', backgroundColor: '#f0f7ff'}}
                >
                  <option value="">-- Criar do zero (Sem vínculo) --</option>
                  {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
                <small style={{color: '#64748b'}}>Os módulos e valores dessa campanha serão injetados automaticamente no formulário da página ao vivo.</small>
              </FormGroup>

              <FormGroup>
                <label>2. Nome do Curso / Serviço *</label>
                <Input type="text" required value={iaPrompt.nomeCurso} onChange={e => setIaPrompt({...iaPrompt, nomeCurso: e.target.value})} placeholder="Ex: Formação em Licitações e Contratos" />
              </FormGroup>
              <FormGroup>
                <label>3. Quem é o Público-Alvo? *</label>
                <Input type="text" required value={iaPrompt.publicoAlvo} onChange={e => setIaPrompt({...iaPrompt, publicoAlvo: e.target.value})} placeholder="Ex: Servidores públicos, Prefeitos, Auditores..." />
              </FormGroup>
              <FormGroup>
                <label>4. Quais as principais dores que você resolve? (Opcional)</label>
                <Input type="text" value={iaPrompt.beneficios} onChange={e => setIaPrompt({...iaPrompt, beneficios: e.target.value})} placeholder="Ex: Medo de apontamentos do TCE, Insegurança Jurídica..." />
              </FormGroup>

              <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <SecondaryButton type="button" onClick={() => setMostrarWizardIA(false)}>Cancelar</SecondaryButton>
                <AiButton type="submit" disabled={gerandoIA}>
                  {gerandoIA ? <><i className="fa-solid fa-spinner fa-spin"></i> Escrevendo Copy...</> : <><i className="fa-solid fa-robot"></i> Gerar Página</>}
                </AiButton>
              </div>
            </form>
          </WizardContent>
        </ModalOverlay>
      )}

      {/* === MODAL EDITOR GRAPESJS === */}
      {mostrarModal && (
        <FullScreenModalOverlay>
          <FullScreenContent>
            <BuilderHeader>
              <div className="logo-area">
                <i className="fa-solid fa-palette text-blue"></i>
                <div>
                  <h3>Editor Visual Otimizado</h3>
                  <span className="sub">{editandoId ? 'Editando Landing Page' : 'Nova Landing Page'}</span>
                </div>
              </div>

              <form id="lpForm" onSubmit={salvarPagina} className="config-form">
                <FormGroup>
                  <label>Nome da Página</label>
                  <Input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Inscrição Módulo B" />
                </FormGroup>
                
                <FormGroup>
                  <label>URL Amigável</label>
                  <SlugInputGroup>
                    <span className="prefix">/lp/</span>
                    <Input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required placeholder="modulo-b" />
                  </SlugInputGroup>
                </FormGroup>

                <FormGroup>
                  <label>Campanha do Formulário</label>
                  <Select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)}>
                    <option value="">-- Sem Vínculo --</option>
                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <label>Status</label>
                  <Select value={statusLP} onChange={(e) => setStatusLP(e.target.value)} className={statusLP === 'publicada' ? 'published' : 'draft'}>
                    <option value="rascunho">Rascunho</option>
                    <option value="publicada">Publicada (Online)</option>
                  </Select>
                </FormGroup>
              </form>

              <div className="actions">
                {editandoId && (
                  <DangerButton type="button" onClick={() => deletarPagina(editandoId)} title="Excluir">
                    <i className="fa-solid fa-trash-can"></i>
                  </DangerButton>
                )}
                <SecondaryButton type="button" onClick={() => setMostrarModal(false)}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit" form="lpForm"><i className="fa-solid fa-save"></i> Salvar</PrimaryButton>
              </div>
            </BuilderHeader>

            {/* Container do GrapesJS */}
            <div id="gjs" style={{ flex: 1, overflow: 'hidden' }}></div>

          </FullScreenContent>
        </FullScreenModalOverlay>
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
`;

const LinkButton = styled.a`
  background: #f1f5f9; color: #007bff; border: none; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;
  &:hover { background: #e7f3ff; }
`;

// --- BOTÕES ---
const ButtonBase = styled.button`padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; gap: 8px; justify-content: center; &:active:not(:disabled) { transform: scale(0.98); } &:disabled{ opacity: 0.6; cursor: not-allowed;}`;
const PrimaryButton = styled(ButtonBase)`background: #007bff; color: #fff; &:hover:not(:disabled) { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }`;
const SecondaryButton = styled(ButtonBase)`background: #e2e8f0; color: #475569; &:hover:not(:disabled) { background: #cbd5e1; }`;
const DangerButton = styled(ButtonBase)`background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; &:hover:not(:disabled) { background: #dc3545; color: #fff; }`;
const AiButton = styled(ButtonBase)`background: linear-gradient(135deg, #8b5cf6, #d946ef); color: white; border: none; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: all 0.2s ease; &:hover:not(:disabled) { background: linear-gradient(135deg, #7c3aed, #c026d3); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); } `;

// --- MODAIS GERAIS ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 9998; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box;
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

const BuilderHeader = styled.div`
  background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); z-index: 100; flex-wrap: wrap; gap: 15px;

  .logo-area {
    display: flex; align-items: center; gap: 15px;
    i { font-size: 2rem; } .text-blue { color: #007bff; }
    h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
    .sub { font-size: 0.8rem; color: #94a3b8; font-weight: 600;}
  }

  .config-form {
    display: flex; gap: 20px; align-items: flex-end; flex: 1; max-width: 800px; margin: 0 30px;
    @media (max-width: 900px) { flex-direction: column; align-items: stretch; margin: 0; max-width: 100%; width: 100%; gap: 10px; }
  }

  .actions { 
    display: flex; gap: 10px; align-items: center; 
    @media (max-width: 600px) { width: 100%; button { flex: 1; justify-content: center;} }
  }
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 4px; flex: 1; margin-bottom: 15px;
  label { font-size: 0.85rem; font-weight: 700; color: #475569;}
`;

const Input = styled.input`
  padding: 10px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #2c3e50; outline: none; background: #f8fafc; transition: 0.2s; box-sizing: border-box; width: 100%;
  &:focus { border-color: #007bff; background: #fff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
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