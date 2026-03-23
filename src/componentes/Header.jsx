// src/components/Header.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Header({ titulo }) {
  const navigate = useNavigate();
  const [nomeUsuario, setNomeUsuario] = useState('Usuário');

  // Esse código lê o Token do seu login e descobre o seu nome automaticamente
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])); // Decodifica o JWT
        setNomeUsuario(payload.nome);
      } catch (error) {
        console.error('Erro ao ler nome do usuário');
      }
    }
  }, []);

  function fazerLogout() {
    localStorage.removeItem('token');
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