// src/pages/Disparos.jsx
import { useState, useEffect } from 'react';
import { Header } from '../componentes/Header.jsx'; // Ajuste o caminho se necessário

export function Disparos() {
  // === ESTADOS DO FORMULÁRIO ===
  const [emailCru, setEmailCru] = useState('');
  const [tituloemail, setTituloemail] = useState('');
  const [curso, setCurso] = useState('');
  const [etapa, setEtapa] = useState('');
  const [enviando, setEnviando] = useState(false);

  // === TRAVA DE SEGURANÇA (RBAC) ===
  useEffect(() => {
    const perfil = localStorage.getItem('perfil');
    if (perfil !== 'admin') {
      alert('🔒 Acesso Negado: Apenas administradores podem acessar a central de disparos em massa.');
      window.location.href = '/empresas'; // Expulsa de volta para o sistema
    }
  }, []);

  // === FUNÇÃO 1: ENVIO DE TESTE (POST para o n8n) ===
  async function handleEnviarTeste(e) {
    e.preventDefault();
    setEnviando(true);

    const data = { emailCru, tituloemail, curso, etapa };

    try {
      await fetch(
        'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/7f271a6b-4135-4126-9a8e-ef7ea3eaba9d',
        {
          method: 'POST',
          mode: 'no-cors', // Mantido conforme seu original
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );
      alert('✅ Formulário enviado com sucesso para processamento da IA!');
      console.log('Payload enviado:', data);
    } catch (error) {
      console.error(error);
      alert('❌ Erro ao enviar os dados para o n8n.');
    } finally {
      setEnviando(false);
    }
  }

  // === FUNÇÃO 2: INICIAR DISPARO OFICIAL (GET para o n8n) ===
  async function iniciarDisparo() {
    if (!window.confirm('⚠️ TEM CERTEZA que deseja iniciar os disparos oficiais para todos os destinatários?')) {
      return;
    }

    try {
      await fetch(
        'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/e636462f-be3e-432c-b658-4e5934c71031?disparos_ativo=true',
        { method: 'GET' }
      );
      alert('🚀 Disparos INICIADOS com sucesso!');
    } catch (error) {
      console.error(error);
      alert('❌ Erro ao iniciar os disparos no n8n.');
    }
  }

  // === FUNÇÃO 3: PARAR DISPARO (GET para o n8n) ===
  async function pararDisparo() {
    if (!window.confirm('Deseja interromper os disparos oficiais?')) {
      return;
    }

    try {
      await fetch(
        'https://deccel-ia-n8n-nova-versao.cdqhrl.easypanel.host/webhook/e636462f-be3e-432c-b658-4e5934c71031?disparos_ativo=false',
        { method: 'GET' }
      );
      alert('🛑 Disparos INTERROMPIDOS com sucesso!');
    } catch (error) {
      console.error(error);
      alert('❌ Erro ao parar os disparos no n8n.');
    }
  }

  return (
    <div>
      <Header titulo="Central de Disparos" />
      
      <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div className="panel" style={{ borderTop: '5px solid #007bff' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: '#333', marginTop: 0 }}>Gerador de Conteúdo e Disparo (IA)</h2>
            <p style={{ color: '#777', fontSize: '0.95rem' }}>
              Preencha os dados abaixo para gerar um <strong>E-mail HTML</strong> automático pelo n8n via inteligência artificial.
            </p>
          </div>

          {/* FORMULÁRIO DE TESTE/PREPARAÇÃO */}
          <form onSubmit={handleEnviarTeste} style={{ display: 'grid', gap: '20px' }}>
            
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555', display: 'block', marginBottom: '5px' }}>
                <i className="fa-solid fa-code"></i> Conteúdo do E-mail (HTML ou Cru) *
              </label>
              <textarea 
                required 
                placeholder="Cole aqui o conteúdo cru ou HTML..."
                value={emailCru}
                onChange={e => setEmailCru(e.target.value)}
                style={{ width: '100%', minHeight: '150px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555', display: 'block', marginBottom: '5px' }}>
                <i className="fa-solid fa-heading"></i> Título do E-mail (Assunto) *
              </label>
              <input 
                type="text"
                required
                placeholder="Insira o assunto do e-mail..."
                value={tituloemail}
                onChange={e => setTituloemail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555', display: 'block', marginBottom: '5px' }}>
                  <i className="fa-solid fa-graduation-cap"></i> Curso Alvo *
                </label>
                <select 
                  required
                  value={curso}
                  onChange={e => setCurso(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                >
                  <option value="">Selecione o curso...</option>
                  <option value="PareceresCI">PareceresCI</option>
                  <option value="Licitacoes">Licitações</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555', display: 'block', marginBottom: '5px' }}>
                  <i className="fa-solid fa-layer-group"></i> Etapa / Sequência *
                </label>
                <select 
                  required
                  value={etapa}
                  onChange={e => setEtapa(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                >
                  <option value="">Selecione a etapa...</option>
                  <option value="1">1º E-mail</option>
                  <option value="2">2º E-mail</option>
                  <option value="3">3º E-mail</option>
                  <option value="4">4º E-mail</option>
                  <option value="5">5º E-mail</option>
                  <option value="6">6º E-mail</option>
                  <option value="7">7º E-mail</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={enviando}
              style={{ 
                width: '100%', padding: '15px', marginTop: '10px',
                background: enviando ? '#ccc' : '#007bff', 
                color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', 
                border: 'none', borderRadius: '8px', cursor: enviando ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s'
              }}
            >
              {enviando ? 'Enviando payload...' : '⚙️ Enviar para Processamento e Teste'}
            </button>
          </form>

          {/* SESSÃO DE DISPARO OFICIAL */}
          <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px dashed #ddd', textAlign: 'center' }}>
            <h3 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Zona de Disparo Oficial
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              Após validar o e-mail de teste na sua caixa de entrada, utilize os controles abaixo. <strong>Atenção: A ação de disparo afetará toda a base vinculada no n8n.</strong>
            </p>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button 
                onClick={iniciarDisparo}
                style={{ 
                  flex: 1, maxWidth: '300px', padding: '15px', 
                  background: '#28a745', color: '#fff', fontSize: '1rem', fontWeight: 'bold', 
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(40, 167, 69, 0.3)'
                }}
              >
                🚀 INICIAR DISPAROS
              </button>

              <button 
                onClick={pararDisparo}
                style={{ 
                  flex: 1, maxWidth: '300px', padding: '15px', 
                  background: '#dc3545', color: '#fff', fontSize: '1rem', fontWeight: 'bold', 
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(220, 53, 69, 0.3)'
                }}
              >
                🛑 PARAR DISPAROS
              </button>
            </div>
          </div>

        </div>
        
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#999' }}>
          © 2026 • CRM Inteligente integrado com n8n AI
        </div>

      </div>
    </div>
  );
}