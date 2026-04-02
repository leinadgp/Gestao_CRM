import { useState, useEffect } from 'react';
import axios from 'axios';
import SunEditorModule from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { Header } from '../componentes/Header.jsx';

const SunEditor = SunEditorModule.default || SunEditorModule;

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
  const [htmlContent, setHtmlContent] = useState('');

  const [modoVisual, setModoVisual] = useState(true);

  const API_URL = 'https://server-js-gestao.onrender.com';

  const editorOptions = {
    buttonList: [
      ['undo', 'redo'], ['font', 'fontSize', 'formatBlock'],
      ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
      ['fontColor', 'hiliteColor', 'textStyle'], ['removeFormat'],
      ['outdent', 'indent'], ['align', 'horizontalRule', 'list', 'lineHeight'],
      ['link', 'image', 'video'], ['fullScreen', 'showBlocks', 'codeView']
    ],
    defaultTag: 'div',
    minHeight: '400px',
  };

  useEffect(() => {
    carregarDados();
  }, []);

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
    setHtmlContent('<div style="text-align: center; padding: 50px;"><h1>Nova Landing Page</h1><p>Substitua este texto pelo conteúdo da sua página.</p></div>');
    setMostrarModal(true);
  }

  function abrirModalEdicao(lp) {
    setEditandoId(lp.id);
    setNome(lp.nome);
    setSlug(lp.slug);
    setStatusLP(lp.status || 'rascunho');
    setCampanhaId(lp.campanha_id || '');
    setHtmlContent(lp.html_content || '');
    setMostrarModal(true);
  }

  async function salvarPagina(e) {
    e.preventDefault();
    if(!slug.trim()) return alert("O Slug é obrigatório!");

    // O Slug não pode ter espaços
    const slugFormatado = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const payload = {
      nome,
      slug: slugFormatado,
      status: statusLP,
      campanha_id: campanhaId || null,
      html_content: htmlContent
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
    if (!window.confirm("Deseja realmente apagar esta Landing Page? Isso removerá a página do ar se estiver publicada.")) return;
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
                  <th style={{ padding: '12px', textAlign: 'center' }}>Atualizada em</th>
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
                        <strong style={{ fontSize: '1.05rem', color: '#007bff' }}><i className="fa-solid fa-pager"></i> {p.nome}</strong>
                        <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>/{p.slug}</div>
                      </td>
                      <td style={{ padding: '15px 12px', color: p.campanha_nome ? '#333' : '#aaa', fontWeight: 'bold' }}>
                        {p.campanha_nome || 'Sem Vínculo'}
                      </td>
                      <td style={{ padding: '15px 12px' }}>
                        <span style={{ 
                          background: p.status === 'publicada' ? '#d4edda' : '#fff3cd', 
                          color: p.status === 'publicada' ? '#155724' : '#856404', 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' 
                        }}>
                          {p.status === 'publicada' ? '🌐 Publicada' : '📝 Rascunho'}
                        </span>
                      </td>
                      <td style={{ padding: '15px 12px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                        {formatarDataHora(p.atualizado_em)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SUPER MODAL DO CONSTRUTOR */}
      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#f4f7f6', width: '100%', maxWidth: '1100px', maxHeight: '95vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ background: '#1F4E79', color: '#fff', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-laptop-code"></i> {editandoId ? 'Editor de Landing Page' : 'Nova Landing Page'}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
              <form id="lpForm" onSubmit={salvarPagina}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome da Página *</label>
                    <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="Ex: Inscrição Curso XYZ" />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>URL Amigável (Slug) *</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ background: '#e9ecef', border: '1px solid #ccc', borderRight: 'none', padding: '10px', borderRadius: '6px 0 0 6px', color: '#666', fontSize: '0.85rem' }}>/lp/</span>
                      <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required style={{ width: '100%', padding: '10px', borderRadius: '0 6px 6px 0', border: '1px solid #ccc' }} placeholder="curso-xyz" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Status de Publicação</label>
                    <select value={statusLP} onChange={(e) => setStatusLP(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontWeight: 'bold', color: statusLP === 'publicada' ? '#155724' : '#856404', background: statusLP === 'publicada' ? '#d4edda' : '#fff3cd' }}>
                      <option value="rascunho">📝 Rascunho (Offline)</option>
                      <option value="publicada">🌐 Publicada (Online)</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Vincular a uma Campanha/Curso</label>
                    <select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                      <option value="">-- Não vincular (Página Institucional) --</option>
                      {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#333' }}>Conteúdo da Página (HTML/CSS)</h4>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>Crie o visual da sua Landing Page aqui.</span>
                    </div>
                    <button type="button" onClick={() => setModoVisual(!modoVisual)} style={{ background: '#eee', color: '#333', border: '1px solid #ccc', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-code"></i> {modoVisual ? 'Editar como HTML Cru' : 'Voltar para Editor Visual'}
                    </button>
                  </div>

                  {modoVisual ? (
                    <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
                      <SunEditor setOptions={editorOptions} setContents={htmlContent} onChange={setHtmlContent} />
                    </div>
                  ) : (
                    <textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} style={{ width: '100%', minHeight: '400px', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'monospace', backgroundColor: '#2d2d2d', color: '#f8f8f2' }} />
                  )}
                </div>

              </form>
            </div>

            {/* FOOTER DO MODAL (BOTÃO SALVAR) */}
            <div style={{ background: '#fff', padding: '15px 30px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button type="button" onClick={() => setMostrarModal(false)} style={{ background: '#eee', color: '#333', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" form="lpForm" style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                <i className="fa-solid fa-save"></i> Salvar Landing Page
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}