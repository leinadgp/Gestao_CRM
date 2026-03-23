// src/pages/Login.jsx
import { useState } from 'react';
import axios from 'axios';

// Se você estiver usando react-router-dom para trocar de tela:
// import { useNavigate } from 'react-router-dom';

export function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // const navigate = useNavigate(); // Descomente se usar react-router-dom

  const API_URL = 'https://server-js-gestao.onrender.com';

  async function fazerLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await axios.post(`${API_URL}/login`, {
        login,
        senha
      });

      // 1. Guarda o Token de Segurança
      localStorage.setItem('token', resposta.data.token);
      
      // 2. A MÁGICA DO RBAC: Guarda o perfil do usuário (admin ou usuario)
      // Se o backend ainda não mandar, ele assume 'usuario' por segurança
      localStorage.setItem('perfil', resposta.data.perfil || 'usuario');

      // 3. Redireciona para a tela principal (Dashboard ou Empresas)
      window.location.href = '/empresas'; 
      // navigate('/empresas'); // Use isso em vez do window.location se usar react-router-dom

    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErro('Usuário ou senha inválidos.');
      } else {
        setErro('Erro ao conectar com o servidor. Tente novamente.');
      }
      console.error('Erro no login:', error);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>
            <i className="fa-solid fa-right-to-bracket" style={{ color: '#007bff' }}></i> Acesso ao Sistema
          </h2>
          <p style={{ color: '#777', fontSize: '0.9rem' }}>Insira suas credenciais para continuar.</p>
        </div>

        {erro && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #f5c6cb' }}>
            <i className="fa-solid fa-circle-exclamation"></i> {erro}
          </div>
        )}

        <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>Usuário</label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-user" style={{ position: 'absolute', left: '12px', top: '14px', color: '#aaa' }}></i>
              <input 
                type="text" 
                placeholder="Digite seu usuário..." 
                value={login} 
                onChange={e => setLogin(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 12px 12px 35px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }} 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-lock" style={{ position: 'absolute', left: '12px', top: '14px', color: '#aaa' }}></i>
              <input 
                type="password" 
                placeholder="Sua senha secreta..." 
                value={senha} 
                onChange={e => setSenha(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 12px 12px 35px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            style={{ 
              background: carregando ? '#ccc' : '#007bff', 
              color: '#fff', 
              padding: '12px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              cursor: carregando ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              transition: 'background 0.3s'
            }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  );
}