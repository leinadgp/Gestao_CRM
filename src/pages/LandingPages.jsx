import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Header } from '../componentes/Header.jsx';

// Importações do GrapesJS
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import 'grapesjs-preset-webpage';

export function LandingPages() {
  const [paginas, setPaginas] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [buscaGeral, setBuscaGeral] = useState('');
  
  // === ESTADOS DO SUPER MODAL ===
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [statusLP, setStatusLP] = useState('rascunho');
  const [campanhaId, setCampanhaId] = useState('');
  
  const API_URL = 'https://server-js-gestao.onrender.com';
  
  const editorRef = useRef(null);
  const [htmlInicial, setHtmlInicial] = useState('');
  const [cssInicial, setCssInicial] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (mostrarModal && !editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        fromElement: true,
        height: '600px',
        width: 'auto',
        storageManager: false, 
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {
            // Opções do construtor de páginas
          }
        },
        // Configuração para traduzir comandos nativos do editor
        i18n: {
          locale: 'pt',
          localeFallback: 'en',
          messages: {
            pt: {
              styleManager: { empty: 'Selecione um elemento antes para usar o Gerenciador de Estilos' },
              traitManager: { empty: 'Selecione um elemento antes para usar o Gerenciador de Atributos' },
              assetManager: { modalTitle: 'Selecionar Imagem', uploadTitle: 'Arraste arquivos aqui ou clique para upload' }
            }
          }
        }
      });

      editorRef.current = editor;

      // ========================================================
      // 1. BLOCO CUSTOMIZADO: FORMULÁRIO DO CRM
      // ========================================================
      editor.BlockManager.add('crm-form-block', {
        label: '<i class="fa-solid fa-address-card fa-2x"></i><br/>Formulário CRM',
        category: 'Componentes do CRM',
        content: `
          <div class="crm-form-placeholder" style="padding: 40px; border: 2px dashed #28a745; text-align: center; background: #e9f7ef; border-radius: 8px; margin: 20px auto; max-width: 600px;">
             <h3 style="color: #155724; margin-top: 0; font-family: sans-serif;"><i class="fa-solid fa-bolt"></i> Formulário de Inscrição Automático</h3>
             <p style="color: #155724; margin-bottom: 0; font-family: sans-serif;">Ao publicar a página, este bloco será substituído pelo formulário real de inscrição.</p>
             <div id="CRM_FORM_INJECT_ZONE"></div>
          </div>
        `,
      });

      // ========================================================
      // 2. SUPER BLOCO: TOPO DA PÁGINA (HERO SECTION)
      // ========================================================
      editor.BlockManager.add('hero-section-block', {
        label: '<i class="fa-solid fa-image fa-2x"></i><br/>Capa (Hero)',
        category: 'Seções Prontas',
        content: `
          <section style="background-color: #1F4E79; padding: 100px 20px; text-align: center; color: #fff; font-family: sans-serif;">
            <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: bold;">Título Chamativo da sua Landing Page</h1>
            <p style="font-size: 20px; max-width: 800px; margin: 0 auto 30px auto; color: #eef2f5;">Um subtítulo que explica o grande benefício do seu curso ou serviço. Clique aqui para editar o texto.</p>
            <a href="#CRM_FORM_INJECT_ZONE" style="display: inline-block; padding: 15px 30px; background-color: #edb401; color: #333; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 6px;">Garanta sua Vaga</a>
          </section>
        `,
      });

      // ========================================================
      // 3. SUPER BLOCO: 3 CARDS DE BENEFÍCIOS
      // ========================================================
      editor.BlockManager.add('features-section-block', {
        label: '<i class="fa-solid fa-table-columns fa-2x"></i><br/>Benefícios',
        category: 'Seções Prontas',
        content: `
          <section style="padding: 60px 20px; background-color: #f4f7f6; font-family: sans-serif;">
            <div style="max-width: 1000px; margin: 0 auto;">
              <h2 style="text-align: center; color: #1F4E79; margin-bottom: 40px; font-size: 32px;">O que você vai aprender</h2>
              <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
                  <h3 style="color: #28a745; margin-top: 0;">Benefício 1</h3>
                  <p style="color: #666; font-size: 15px;">Explique o primeiro grande pilar do seu curso aqui.</p>
                </div>
                <div style="flex: 1; min-width: 250px; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
                  <h3 style="color: #28a745; margin-top: 0;">Benefício 2</h3>
                  <p style="color: #666; font-size: 15px;">Explique o segundo grande pilar do seu curso aqui.</p>
                </div>
                <div style="flex: 1; min-width: 250px; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
                  <h3 style="color: #28a745; margin-top: 0;">Benefício 3</h3>
                  <p style="color: #666; font-size: 15px;">Explique o terceiro grande pilar do seu curso aqui.</p>
                </div>
              </div>
            </div>
          </section>
        `,
      });

      // ========================================================
      // 4. SUPER BLOCO: RODAPÉ
      // ========================================================
      editor.BlockManager.add('footer-section-block', {
        label: '<i class="fa-solid fa-shoe-prints fa-2x"></i><br/>Rodapé',
        category: 'Seções Prontas',
        content: `
          <footer style="background-color: #223a8a; padding: 40px 20px; text-align: center; color: #fff; font-family: sans-serif; border-top: 4px solid #edb401;">
            <h3 style="margin-top: 0; margin-bottom: 15px;">Ficou com alguma dúvida?</h3>
            <p style="margin-bottom: 5px;">Entre em contato com nossa equipe de especialistas:</p>
            <p style="font-weight: bold; color: #edb401; margin-bottom: 20px;">(51) 99999-9999 | contato@suaempresa.com.br</p>
            <p style="font-size: 12px; color: #aaa;">Seus dados estão protegidos conosco. Respeitamos a LGPD.</p>
          </footer>
        `,
      });

      if (htmlInicial) {
        editor.setComponents(htmlInicial);
        if (cssInicial) editor.setStyle(cssInicial);
      } else {
        editor.setComponents('<div style="padding: 50px; text-align: center; font-family: sans-serif; color: #999;"><h1>Arraste os blocos da direita para cá</h1><p>Comece puxando a "Capa (Hero)" e o "Formulário CRM".</p></div>');
      }
    }

    return () => {
      if (!mostrarModal && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mostrarModal, htmlInicial, cssInicial]);

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function carregarDados() {
    setCarregando(true);
    try {
      const [resPages, resCamps] = await Promise.all([
        axios.get(`${API_URL}/landing-pages`, getHeaders()),
        axios.get(`${API_URL}/campanhas`, getHeaders())
      ]);
      setPaginas(resPages.data);
      setCampanhas(resCamps.data);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      setCarregando(false);
    }
  }

  function abrirModalNovo() {
    setEditandoId(null);
    setNome('');
    setSlug('');
    setStatusLP('rascunho');
    setCampanhaId('');
    setHtmlInicial('');
    setCssInicial('');
    setMostrarModal(true);
  }

  function abrirModalEdicao(lp) {
    setEditandoId(lp.id);
    setNome(lp.nome);
    setSlug(lp.slug);
    setStatusLP(lp.status || 'rascunho');
    setCampanhaId(lp.campanha_id || '');
    setHtmlInicial(lp.html_content || '');
    setCssInicial(lp.css_content || '');
    setMostrarModal(true);
  }

  async function salvarPagina(e) {
    e.preventDefault();
    if(!slug.trim()) return alert("O Slug é obrigatório!");

    const slugFormatado = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const htmlGerado = editorRef.current ? editorRef.current.getHtml() : htmlInicial;
    const cssGerado = editorRef.current ? editorRef.current.getCss() : cssInicial;

    const payload = {
      nome,
      slug: slugFormatado,
      status: statusLP,
      campanha_id: campanhaId || null,
      html_content: htmlGerado,
      css_content: cssGerado
    };

    try {
      if (editandoId) {
        await axios.put(`${API_URL}/landing-pages/${editandoId}`, payload, getHeaders());
      } else {
        await axios.post(`${API_URL}/landing-pages`, payload, getHeaders());
      }
      setMostrarModal(false);
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao salvar a página.');
    }
  }

  async function deletarPagina(id) {
    if (!window.confirm("Deseja realmente apagar esta Landing Page? Isso removerá a página do ar.")) return;
    try {
      await axios.delete(`${API_URL}/landing-pages/${id}`, getHeaders());
      setMostrarModal(false);
      carregarDados();
    } catch (err) {
      alert("Erro ao excluir página.");
    }
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const paginasFiltradas = paginas.filter(p => p.nome.toLowerCase().includes(buscaGeral.toLowerCase()) || p.slug.toLowerCase().includes(buscaGeral.toLowerCase()));

  return (
    <div>
      <Header titulo="Construtor de Landing Pages" />
      <div className="page-container">

        <div className="panel" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 150px', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '13px', color: '#aaa' }}></i>
            <input placeholder="Pesquisar por nome ou slug da página..." value={buscaGeral} onChange={e => setBuscaGeral(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ddd' }} />
          </div>
          <button onClick={abrirModalNovo} style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <i className="fa-solid fa-plus"></i> Criar Página
          </button>
        </div>

        {/* TABELA DE PÁGINAS */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="table-responsive" style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left', color: '#555' }}>
                  <th style={{ padding: '12px' }}>Página (Clique para Editar)</th>
                  <th style={{ padding: '12px' }}>Campanha Vinculada</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#666' }}><i className="fa-solid fa-spinner fa-spin"></i> Carregando páginas...</td></tr>
                ) : paginasFiltradas.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhuma Landing Page criada ainda.</td></tr>
                ) : (
                  paginasFiltradas.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee', transition: '0.2s' }}>
                      <td 
                        onClick={() => abrirModalEdicao(p)}
                        style={{ padding: '15px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f8ff'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <strong style={{ fontSize: '1.05rem', color: '#007bff' }}><i className="fa-solid fa-layer-group"></i> {p.nome}</strong>
                        <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>/lp/{p.slug}</div>
                      </td>
                      <td style={{ padding: '15px 12px', color: p.campanha_nome ? '#333' : '#aaa', fontWeight: 'bold' }}>
                        {p.campanha_nome || 'Sem Vínculo'}
                      </td>
                      <td style={{ padding: '15px 12px' }}>
                        <span style={{ background: p.status === 'publicada' ? '#d4edda' : '#fff3cd', color: p.status === 'publicada' ? '#155724' : '#856404', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {p.status === 'publicada' ? '🌐 Publicada' : '📝 Rascunho'}
                        </span>
                      </td>
                      <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                         <a href={`${API_URL}/lp/${p.slug}`} target="_blank" rel="noreferrer" style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }} title="Ver Página Ao Vivo">
                           <i className="fa-solid fa-arrow-up-right-from-square"></i> Ver Online
                         </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SUPER MODAL DO CONSTRUTOR LOW-CODE */}
      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setMostrarModal(false)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '1400px', height: '95vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ background: '#1F4E79', color: '#fff', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-palette"></i> Editor Visual (Low-Code)
              </h2>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {editandoId && (
                  <button type="button" onClick={() => deletarPagina(editandoId)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }} title="Excluir">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
                <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#fff' }}>&times;</button>
              </div>
            </div>

            <div style={{ padding: '20px', background: '#f4f7f6', borderBottom: '1px solid #ddd' }}>
              <form id="lpForm" onSubmit={salvarPagina} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Nome da Página</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Ex: Inscrição Curso XYZ" />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>URL Amigável (Slug)</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ background: '#e9ecef', border: '1px solid #ccc', borderRight: 'none', padding: '8px', borderRadius: '4px 0 0 4px', color: '#666', fontSize: '0.8rem' }}>/lp/</span>
                    <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required style={{ width: '100%', padding: '8px', borderRadius: '0 4px 4px 0', border: '1px solid #ccc' }} placeholder="curso-xyz" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Campanha Vinculada</label>
                  <select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">-- Sem Vínculo --</option>
                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Status</label>
                  <select value={statusLP} onChange={(e) => setStatusLP(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: statusLP === 'publicada' ? '#155724' : '#856404' }}>
                    <option value="rascunho">Rascunho</option>
                    <option value="publicada">Publicada</option>
                  </select>
                </div>
              </form>
            </div>

            {/* O CONTAINER ONDE O GRAPESJS VAI RENDERIZAR O EDITOR COMPLETO */}
            <div id="gjs" style={{ flex: 1, overflow: 'hidden' }}></div>

            <div style={{ background: '#fff', padding: '15px 30px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button type="button" onClick={() => setMostrarModal(false)} style={{ background: '#eee', color: '#333', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" form="lpForm" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                <i className="fa-solid fa-save"></i> Salvar Layout
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}