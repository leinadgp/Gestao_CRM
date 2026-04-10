// src/componentes/Header.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getUserFirstName, clearAuth } from '../utils/auth';

export function Header({ titulo }) {
  const navigate = useNavigate();
  
  // Lê o nome e a foto na montagem do componente
  const [nomeUsuario, setNomeUsuario] = useState(() => getUserFirstName() || 'Usuário');
  const [fotoPerfil, setFotoPerfil] = useState(() => localStorage.getItem('foto_perfil') || null);

  // Escuta o evento de atualização do perfil para trocar a foto na hora, sem precisar dar F5
  useEffect(() => {
    const handleStorageChange = () => {
      setNomeUsuario(getUserFirstName() || 'Usuário');
      setFotoPerfil(localStorage.getItem('foto_perfil') || null);
    };
    
    window.addEventListener('perfilAtualizado', handleStorageChange);
    return () => window.removeEventListener('perfilAtualizado', handleStorageChange);
  }, []);

  function fazerLogout() {
    clearAuth();
    navigate('/login');
  }

  function irParaConfiguracoes() {
    navigate('/configuracoes');
  }

  return (
    <HeaderContainer>
      <HeaderTitle>{titulo}</HeaderTitle>
      
      <HeaderActions>
        <UserInfo>
          {fotoPerfil ? (
            <AvatarImage src={fotoPerfil} alt="Foto de Perfil" />
          ) : (
            <i className="fa-solid fa-user-circle"></i>
          )}
          <span>Olá, {nomeUsuario}</span>
        </UserInfo>
        
        <ConfigButton onClick={irParaConfiguracoes} title="Configurações da Conta">
          <i className="fa-solid fa-gear"></i>
        </ConfigButton>
        
        <LogoutButton onClick={fazerLogout} title="Sair do Sistema">
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
  gap: 20px;
`;

const UserInfo = styled.div`
  color: #495057;
  font-weight: 600;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  margin-right: 5px;

  i {
    margin-right: 8px;
    font-size: 1.8rem; /* Aumentei um pouco para igualar com o tamanho da foto */
    color: #007bff;
  }
`;

const AvatarImage = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
  border: 2px solid #edf2f9;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const ConfigButton = styled.button`
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #cbd5e1;
  padding: 10px;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    color: #007bff;
    border-color: #94a3b8;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
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