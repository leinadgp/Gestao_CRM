// src/components/Header.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Header({ titulo }) {
  const navigate = useNavigate();
  const [nomeUsuario, setNomeUsuario] = useState('Usuário');
  
  // Esse código lê o Token do seu login e descobre o seu nome automaticamente (agora com acentos!)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // 1. Pega a parte do payload do JWT
        const base64Url = token.split('.')[1];
        
        // 2. Converte para o formato base64 padrão
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // 3. A MÁGICA: Converte os caracteres estranhos de volta para UTF-8 (ã, ç, é)
        const jsonPayload = decodeURIComponent(
          window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        
        const payload = JSON.parse(jsonPayload); 
        
        // Se quiser exibir apenas o primeiro nome (Ex: "Camila" em vez de "Camila Guimarães"), 
        // mude para: setNomeUsuario(payload.nome.split(' ')[0]);
        setNomeUsuario(payload.nome);
        
      } catch (error) {
        console.error('Erro ao ler nome do usuário', error);
      }
    }
  }, []);

  function fazerLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('perfil'); // Limpa a permissão de Admin/Usuario por segurança
    navigate('/login'); // Chuta o usuário de volta para a tela de login
  }

  return (
    <header className="header">
      <div className="header-title">{titulo}</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{ color: '#555', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
          <i className="fa-solid fa-user-circle" style={{ marginRight: '8px', fontSize: '1.4rem', color: '#007bff' }}></i>
          Olá, {nomeUsuario}
        </span>
        
        <button onClick={fazerLogout} className="btn-logout">
          <i className="fa-solid fa-sign-out-alt"></i> Sair
        </button>
      </div>
    </header>
  );
}