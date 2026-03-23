// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function Login() {
  // Trocamos 'nome' por 'login'
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  
  const navigate = useNavigate();
  const API_URL = 'https://server-js-gestao.onrender.com';

  async function fazerLogin(e) {
    e.preventDefault();
    setErro('');

    try {
      // Envia o login e a senha para o backend
      const resposta = await axios.post(`${API_URL}/login`, { login, senha });
      
      localStorage.setItem('token', resposta.data.token);
      navigate('/');
    } catch (error) {
      console.error(error);
      setErro(error.response?.data?.erro || 'Erro ao conectar com o servidor.');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <i className="fa-solid fa-chart-line"></i> Meu CRM
        </div>
        <p>Acesse sua conta para continuar</p>
        
        <form className="login-form" onSubmit={fazerLogin}>
          {erro && <div style={{color: 'red', fontSize: '0.9rem', marginBottom: '10px'}}>{erro}</div>}
          
          <input 
            type="text" 
            placeholder="Seu Login (ex: daniel123)" 
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="Sua Senha" 
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required 
          />
          
          <button type="submit" className="btn-login">
            <i className="fa-solid fa-right-to-bracket"></i> Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}