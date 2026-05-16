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

      // ========================================================
      // EVENTOS DE BLINDAGEM DO EDITOR PARA CLIENTES LEIGOS
      // ========================================================
      editor.on('load', () => {
        // Esconde o painel de Estilos (Pincel), Engrenagem (Traits) e Camadas
        editor.Panels.removeButton('views', 'open-sm');
        editor.Panels.removeButton('views', 'open-tm');
        editor.Panels.removeButton('views', 'open-layers');
        
        // Mantém a aba de blocos ativa por padrão
        editor.Panels.getButton('views', 'open-blocks').set('active', true);
      });

      // Abertura automática da galeria ao clicar numa imagem
      editor.on('component:selected', (component) => {
        if (component.get('type') === 'image') {
          editor.runCommand('open-assets', { target: component });
        }
      });

      // ========================================================
      // 1. BLOCO: CAPA AUTORIDADE (NOVO ESTILO ESCURO VIP)
      // ========================================================
      editor.BlockManager.add('autoridade-hero', {
        label: '<i class="fa-solid fa-crown fa-2x"></i><br/>Capa Autoridade',
        category: 'Estilo Premium',
        content: `
          <section style="background: linear-gradient(rgba(11, 25, 44, 0.85), rgba(11, 25, 44, 0.85)), url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop') center/cover; padding: 120px 20px; color: #fff; font-family: Arial, sans-serif;">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 40px;">
              <div style="flex: 1; min-width: 300px; max-width: 700px;">
                <h1 style="font-size: 46px; font-weight: 800; margin-bottom: 20px; line-height: 1.1;">Programa Avançado em <br/><span style="color: #fbbf24;">Licitações e Contratos</span></h1>
                <p style="font-size: 20px; line-height: 1.6; margin-bottom: 40px; color: #cbd5e1;">Com base na nova Lei 14.133/2021. Avance com prática, segurança jurídica e desburocratização no seu órgão público.</p>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                  <a href="#form-inscricao" style="background: #fbbf24; color: #000; padding: 18px 35px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 18px;">Quero garantir minha vaga!</a>
                  <a href="#sobre" style="border: 2px solid #ffffff; color: #ffffff; padding: 18px 35px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 18px;">Conhecer o Programa</a>
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

      // ========================================================
      // 2. BLOCO: CAPA HERO (ESTILO RD STATION CLÁSSICO)
      // ========================================================
      editor.BlockManager.add('rd-hero', {
        label: '<i class="fa-solid fa-heading fa-2x"></i><br/>Capa Padrão',
        category: 'Estilo Premium',
        content: `
          <section style="background-color: #0f172a; padding: 80px 20px; color: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 40px; align-items: center;">
              <div style="flex: 1; min-width: 300px;">
                <h1 style="font-size: 2.8rem; margin-bottom: 20px; line-height: 1.2; color: #ffffff;">Contabilidade Pública Para Não Contadores</h1>
                <p style="font-size: 1.2rem; color: #94a3b8; margin-bottom: 30px;">Curso desenvolvido para Auditores de Controle Interno que atuam no setor público.</p>
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                  <li style="margin-bottom: 10px;"><i class="fa-solid fa-check" style="color: #28a745; margin-right: 10px;"></i> 100% online e ao vivo</li>
                  <li style="margin-bottom: 10px;"><i class="fa-solid fa-check" style="color: #28a745; margin-right: 10px;"></i> Estrutura progressiva</li>
                  <li style="margin-bottom: 10px;"><i class="fa-solid fa-check" style="color: #28a745; margin-right: 10px;"></i> Foco na realidade municipal</li>
                </ul>
                <a href="#form-inscricao" style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1rem;">Garantir minha vaga</a>
              </div>
              <div style="flex: 1; min-width: 300px; text-align: center;">
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=500&auto=format&fit=crop" style="max-width: 100%; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" alt="Imagem Aula" />
              </div>
            </div>
          </section>
        `,
      });

      // ========================================================
      // 3. BLOCO: FORMULÁRIO DINÂMICO
      // ========================================================
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
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Setor/Secretaria*</label>
                    <input type="text" id="setor" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Cargo*</label>
                    <input type="text" id="cargo" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                </div>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Município*</label>
                    <input type="text" id="cidade" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
                  </div>
                  <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 0.9rem; font-weight: bold; color: #475569; display: block; margin-bottom: 5px;">Email*</label>
                    <input type="email" id="email" required style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; box-sizing: border-box; font-size: 14px;" />
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

                <button type="submit" id="btnSubmit" style="margin-top: 20px; width: 100%; padding: 18px; background-color: #0f172a; color: #fff; border: none; border-radius: 5px; font-size: 1.2rem; font-weight: bold; cursor: pointer; transition: background 0.3s;">
                  CONFIRMAR INSCRIÇÃO
                </button>
              </form>
            </div>
          </section>
        `,
      });

      // ========================================================
      // 4. BLOCO: DORES (PROBLEMA MUNICIPAL)
      // ========================================================
      editor.BlockManager.add('rd-benefits', {
        label: '<i class="fa-solid fa-triangle-exclamation fa-2x"></i><br/>Dores/Soluções',
        category: 'Estilo Premium',
        content: `
          <section id="sobre" style="padding: 80px 20px; background-color: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1000px; margin: 0 auto;">
              <h2 style="text-align: center; color: #0f172a; margin-bottom: 50px; font-size: 32px;">Você enfrenta esses desafios no município?</h2>
              <div style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 280px; background: #fff5f5; padding: 40px 30px; border-radius: 8px; border-top: 4px solid #dc3545; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <h3 style="color: #dc3545; margin-top: 0; font-size: 20px;">Apontamentos do TCE</h3>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5;">Notificações constantes do Tribunal de Contas devido à interpretação incorreta da nova lei.</p>
                </div>
                <div style="flex: 1; min-width: 280px; background: #fff5f5; padding: 40px 30px; border-radius: 8px; border-top: 4px solid #dc3545; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <h3 style="color: #dc3545; margin-top: 0; font-size: 20px;">Insegurança Jurídica</h3>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5;">Medo de assinar pareceres sem ter certeza da fundamentação técnica e legal.</p>
                </div>
                <div style="flex: 1; min-width: 280px; background: #f0f7ff; padding: 40px 30px; border-radius: 8px; border-top: 4px solid #007bff; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <h3 style="color: #007bff; margin-top: 0; font-size: 20px;">A Solução</h3>
                  <p style="color: #475569; font-size: 16px; line-height: 1.5;">Aprenda o passo a passo prático para implementar controles eficientes e blindar a gestão.</p>
                </div>
              </div>
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
          <PrimaryButton onClick={abrirModalNovo} className="btn-mobile">
            <i className="fa-solid fa-plus-circle"></i> Criar Página
          </PrimaryButton>
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
                        <LinkButton href={`${API_URL}/lp/${p.slug}`} target="_blank" rel="noreferrer" title="Abrir página online">
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
const ButtonBase = styled.button`padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; gap: 8px; justify-content: center; &:active { transform: scale(0.98); }`;
const PrimaryButton = styled(ButtonBase)`background: #007bff; color: #fff; &:hover { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }`;
const SecondaryButton = styled(ButtonBase)`background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; }`;
const DangerButton = styled(ButtonBase)`background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; &:hover { background: #dc3545; color: #fff; }`;

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
  display: flex; flex-direction: column; gap: 4px; flex: 1;
  label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;}
  
  input, select {
    padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; color: #2c3e50; outline: none; background: #f8fafc; transition: 0.2s; box-sizing: border-box; width: 100%;
    &:focus { border-color: #007bff; background: #fff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
    &.published { color: #155724; font-weight: 700; background: #e6f4ea; border-color: #c3e6cb;}
    &.draft { color: #856404; font-weight: 700; background: #fff3cd; border-color: #ffeeba;}
  }
`;

const SlugInputGroup = styled.div`
  display: flex; align-items: center;
  .prefix { background: #e2e8f0; color: #64748b; padding: 8px 10px; border: 1px solid #cbd5e1; border-right: none; border-radius: 6px 0 0 6px; font-size: 0.9rem; font-weight: 600;}
  input { border-radius: 0 6px 6px 0; flex: 1; }
`;