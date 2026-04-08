// src/components/Header.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styled from 'styled-components';

export function Header({ titulo }) {
  const navigate = useNavigate();
  const [nomeUsuario, setNomeUsuario] = useState('Usuário');
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        const jsonPayload = decodeURIComponent(
          window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        
        const payload = JSON.parse(jsonPayload); 
        setNomeUsuario(payload.nome.split(' ')[0]);
        
      } catch (error) {
        console.error('Erro ao ler nome do usuário', error);
      }
    }
  }, []);

  function fazerLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('perfil'); 
    localStorage.removeItem('usuarioId'); 
    navigate('/login'); 
  }

  return (
    <HeaderContainer>
      <HeaderTitle>{titulo}</HeaderTitle>
      
      <HeaderActions>
        <UserInfo>
          <i className="fa-solid fa-user-circle"></i>
          Olá, {nomeUsuario}
        </UserInfo>
        
        <LogoutButton onClick={fazerLogout}>
          <i className="fa-solid fa-sign-out-alt"></i> Sair
        </LogoutButton>
      </HeaderActions>
    </HeaderContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const HeaderContainer = styled.header`
  background-color: #ffffff;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.04);
  border-bottom: 1px solid #edf2f9;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: -0.5px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;
`;

const UserInfo = styled.span`
  color: #495057;
  font-weight: 600;
  display: flex;
  align-items: center;
  font-size: 0.95rem;

  i {
    margin-right: 8px;
    font-size: 1.5rem;
    color: #007bff;
  }
`;

const LogoutButton = styled.button`
  background: #fff5f5;
  color: #dc3545;
  border: 1px solid #f8d7da;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #dc3545;
    color: #ffffff;
    border-color: #dc3545;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(220, 53, 69, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;