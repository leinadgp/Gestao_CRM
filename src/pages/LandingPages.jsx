// src/pages/LandingPages.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
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

  // === INICIALIZAÇÃO DO GRAPESJS ===
  useEffect(() => {
    // Só inicia se o modal estiver aberto e o editor ainda não existir
    if (mostrarModal && !editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        fromElement: true,
        height: '100%',
        width: 'auto',
        storageManager: false, // O salvamento é manual via React state
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {}
        },
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

      // Injeta o HTML/CSS se for uma edição, ou um placeholder se for novo
      if (htmlInicial) {
        editor.setComponents(htmlInicial);
        if (cssInicial) editor.setStyle(cssInicial);
      } else {
        editor.setComponents('<div style="padding: 50px; text-align: center; font-family: sans-serif; color: #999;"><h1>Arraste os blocos da direita para cá</h1><p>Comece puxando a "Capa (Hero)" e o "Formulário CRM".</p></div>');
      }
    }

    // Cleanup: Destrói a instância do GrapesJS quando o modal fecha para evitar memory leaks
    return () => {
      if (!mostrarModal && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [mostrarModal, htmlInicial, cssInicial]); // Recria o editor se o HTML base mudar na abertura

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

    // Extrai o HTML e CSS limpos gerados pelo GrapesJS
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
        alert("Página atualizada com sucesso!");
      } else {
        await axios.post(`${API_URL}/landing-pages`, payload, getHeaders());
        alert("Página criada com sucesso!");
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

  // === MEMOIZAÇÃO DE PERFORMANCE ===
  const paginasFiltradas = useMemo(() => {
    const termo = buscaGeral.toLowerCase();
    return paginas.filter(p => 
      p.nome.toLowerCase().includes(termo) || 
      p.slug.toLowerCase().includes(termo)
    );
  }, [paginas, buscaGeral]);

  return (
    <>
      <Header titulo="Construtor de Landing Pages" />
      <PageContainer>

        <TopSection>
          <div>
            <Title>Minhas Páginas</Title>
            <Subtitle>Crie, edite e publique páginas de venda integradas ao funil.</Subtitle>
          </div>
          <PrimaryButton onClick={abrirModalNovo}>
            <i className="fa-solid fa-plus-circle"></i> Criar Página
          </PrimaryButton>
        </TopSection>

        <FilterBar>
          <SearchWrapper>
            <i className="fa-solid fa-search icon"></i>
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou slug da página..." 
              value={buscaGeral} 
              onChange={e => setBuscaGeral(e.target.value)} 
            />
          </SearchWrapper>
        </FilterBar>

        {/* TABELA DE PÁGINAS */}
        <Panel>
          <TableContainer>
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
                  paginasFiltradas.map(p => (
                    <ClickableRow key={p.id}>
                      <td onClick={() => abrirModalEdicao(p)}>
                        <div className="main-name"><i className="fa-solid fa-window-maximize"></i> {p.nome}</div>
                        <div className="meta">
                          <span><i className="fa-solid fa-link"></i> /lp/{p.slug}</span>
                        </div>
                      </td>
                      <td onClick={() => abrirModalEdicao(p)}>
                        <div className={p.campanha_nome ? "comp-name" : "text-muted"}>
                          {p.campanha_nome ? <><i className="fa-solid fa-graduation-cap"></i> {p.campanha_nome}</> : 'Sem Vínculo (Genérica)'}
                        </div>
                      </td>
                      <td onClick={() => abrirModalEdicao(p)} className="text-center">
                        <StatusBadge className={p.status === 'publicada' ? 'published' : 'draft'}>
                          {p.status === 'publicada' ? '🌐 Publicada' : '📝 Rascunho'}
                        </StatusBadge>
                      </td>
                      <td className="text-center">
                        <LinkButton href={`${API_URL}/lp/${p.slug}`} target="_blank" rel="noreferrer" title="Abrir página online">
                          <i className="fa-solid fa-arrow-up-right-from-square"></i> Visitar
                        </LinkButton>
                      </td>
                    </ClickableRow>
                  ))
                )}
              </tbody>
            </Table>
          </TableContainer>
        </Panel>

      </PageContainer>

      {/* SUPER MODAL DO CONSTRUTOR LOW-CODE (FULL SCREEN) */}
      {mostrarModal && (
        <FullScreenModalOverlay>
          <FullScreenContent>
            
            {/* HEADER DE CONFIGURAÇÃO (FICA NO TOPO ENQUANTO EDITA) */}
            <BuilderHeader>
              <div className="logo-area">
                <i className="fa-solid fa-palette text-blue"></i>
                <div>
                  <h3>Editor Visual</h3>
                  <span className="sub">{editandoId ? 'Editando Landing Page' : 'Nova Landing Page'}</span>
                </div>
              </div>

              <form id="lpForm" onSubmit={salvarPagina} className="config-form">
                <FormGroup>
                  <label>Nome da Página</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Inscrição Módulo B" />
                </FormGroup>
                
                <FormGroup>
                  <label>URL Amigável</label>
                  <SlugInputGroup>
                    <span className="prefix">/lp/</span>
                    <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required placeholder="modulo-b" />
                  </SlugInputGroup>
                </FormGroup>

                <FormGroup>
                  <label>Campanha do Formulário</label>
                  <select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)}>
                    <option value="">-- Sem Vínculo --</option>
                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>Status</label>
                  <select value={statusLP} onChange={(e) => setStatusLP(e.target.value)} className={statusLP === 'publicada' ? 'published' : 'draft'}>
                    <option value="rascunho">Rascunho</option>
                    <option value="publicada">Publicada (Online)</option>
                  </select>
                </FormGroup>
              </form>

              <div className="actions">
                {editandoId && (
                  <DangerButton type="button" onClick={() => deletarPagina(editandoId)} title="Excluir">
                    <i className="fa-solid fa-trash-can"></i>
                  </DangerButton>
                )}
                <SecondaryButton type="button" onClick={() => setMostrarModal(false)}>Cancelar</SecondaryButton>
                <PrimaryButton type="submit" form="lpForm"><i className="fa-solid fa-save"></i> Salvar Layout</PrimaryButton>
              </div>
            </BuilderHeader>

            {/* O CONTAINER DO GRAPESJS VAI AQUI (OCUPA O RESTO DA TELA) */}
            {/* O GrapesJS gerencia seus próprios z-indexes, certifique-se de que nenhum elemento pai oculte seus modais nativos */}
            <div id="gjs" style={{ flex: 1, overflow: 'hidden' }}></div>

          </FullScreenContent>
        </FullScreenModalOverlay>
      )}
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

// --- FILTROS ---
const FilterBar = styled.div`
  display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 25px; background: #fff; padding: 15px 20px; border-radius: 12px; border: 1px solid #edf2f9;
`;
const SearchWrapper = styled.div`
  position: relative; flex: 1; min-width: 250px;
  .icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
  input { width: 100%; padding: 12px 12px 12px 40px; border-radius: 50px; border: 1px solid #cbd5e1; font-size: 0.95rem; outline: none; transition: 0.2s; &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); } }
`;

// --- TABELA ---
const Panel = styled.div`
  background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; overflow: hidden; margin-bottom: 20px;
`;
const TableContainer = styled.div`overflow-x: auto;`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 20px; background: #fbfbfc; color: #6c757d; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; font-weight: 700;}
  td { padding: 15px 20px; border-bottom: 1px solid #edf2f9; vertical-align: middle; color: #2c3e50; transition: background 0.2s;}
  tr:last-child td { border-bottom: none; }
  .sticky-head th { position: sticky; top: 0; z-index: 10; }
  .text-center { text-align: center; } .text-muted { color: #a0aec0; } .font-bold { font-weight: 700;}
`;
const ClickableRow = styled.tr`
  cursor: pointer; transition: 0.2s;
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
const ButtonBase = styled.button`padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; gap: 8px; &:active { transform: scale(0.98); }`;
const PrimaryButton = styled(ButtonBase)`background: #007bff; color: #fff; &:hover { background: #0056b3; }`;
const SecondaryButton = styled(ButtonBase)`background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; }`;
const DangerButton = styled(ButtonBase)`background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; &:hover { background: #dc3545; color: #fff; }`;

// --- EDITOR FULL SCREEN (LOW-CODE) ---
const FullScreenModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; flex-direction: column;
`;

const FullScreenContent = styled.div`
  width: 100%; height: 100%; background: #ffffff; display: flex; flex-direction: column; overflow: hidden;
`;

const BuilderHeader = styled.div`
  background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); z-index: 100;

  .logo-area {
    display: flex; align-items: center; gap: 15px;
    i { font-size: 2rem; } .text-blue { color: #007bff; }
    h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
    .sub { font-size: 0.8rem; color: #94a3b8; font-weight: 600;}
  }

  .config-form {
    display: flex; gap: 20px; align-items: flex-end; flex: 1; max-width: 800px; margin: 0 30px;
  }

  .actions { display: flex; gap: 10px; align-items: center; }
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 4px; flex: 1;
  label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;}
  
  input, select {
    padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; color: #2c3e50; outline: none; background: #f8fafc; transition: 0.2s;
    &:focus { border-color: #007bff; background: #fff; }
    &.published { color: #155724; font-weight: 700; background: #e6f4ea; border-color: #c3e6cb;}
    &.draft { color: #856404; font-weight: 700; background: #fff3cd; border-color: #ffeeba;}
  }
`;

const SlugInputGroup = styled.div`
  display: flex; align-items: center;
  .prefix { background: #e2e8f0; color: #64748b; padding: 8px 10px; border: 1px solid #cbd5e1; border-right: none; border-radius: 6px 0 0 6px; font-size: 0.9rem; font-weight: 600;}
  input { border-radius: 0 6px 6px 0; flex: 1; }
`;