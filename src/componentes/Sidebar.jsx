// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

export function Sidebar() {
  const perfilUsuario = localStorage.getItem('perfil');

  return (
    <SidebarContainer>
      <Logo>
        <div className="icon-wrapper">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <span>Meu CRM</span>
      </Logo>
      
      <NavList>
        <span className="nav-label">MENU PRINCIPAL</span>
        
        <NavItem to="/" end>
          <i className="fa-solid fa-house"></i> Home
        </NavItem>
        
        {perfilUsuario === 'admin' && (
          <NavItem to="/dashboard">
            <i className="fa-solid fa-chart-pie"></i> Dashboard
          </NavItem>
        )}
        
        <NavItem to="/funil">
          <i className="fa-solid fa-layer-group"></i> Funil de Vendas
        </NavItem>
        
        <span className="nav-label">OPERAÇÃO</span>
        
        <NavItem to="/contatos">
          <i className="fa-solid fa-users"></i> Contatos
        </NavItem>
        
        <NavItem to="/empresas">
          <i className="fa-solid fa-building"></i> Prefeituras / Empresas
        </NavItem>
        
        {perfilUsuario === 'admin' && (
          <>
            <span className="nav-label">MARKETING & VENDAS</span>
            
            <NavItem to="/campanhas">
              <i className="fa-solid fa-bullhorn"></i> Cursos e Campanhas
            </NavItem>
            
            <NavItem to="/disparos">
              <i className="fa-solid fa-paper-plane"></i> Máquina de Disparos
            </NavItem>
            
            <NavItem to="/landing-pages">
              <i className="fa-solid fa-window-maximize"></i> Landing Pages
            </NavItem>
          </>
        )}
      </NavList>
    </SidebarContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const SidebarContainer = styled.aside`
  width: 260px;
  background-color: #0f172a; /* Tom escuro super moderno (Slate 900) */
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 25px 0;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.05);
  z-index: 100;
  flex-shrink: 0; /* Impede que o menu seja esmagado em telas menores */
`;

const Logo = styled.div`
  font-size: 1.4rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 25px;
  margin-bottom: 40px;
  color: #ffffff;
  letter-spacing: -0.5px;

  .icon-wrapper {
    background: #007bff;
    color: #ffffff;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    font-size: 1.1rem;
    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3);
  }
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 15px;

  .nav-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #64748b; /* Slate 500 */
    margin: 15px 0 5px 15px;
    letter-spacing: 1px;
  }
`;

// Estilizando o NavLink do React Router Dom
const NavItem = styled(NavLink)`
  padding: 12px 18px;
  color: #94a3b8; /* Slate 400 */
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  i {
    font-size: 1.1rem;
    width: 20px;
    text-align: center;
    transition: color 0.2s ease;
  }

  &:hover {
    color: #f8fafc;
    background-color: #1e293b; /* Slate 800 */
    
    i {
      color: #007bff;
    }
  }

  &.active {
    color: #ffffff;
    background-color: rgba(0, 123, 255, 0.15); /* Fundo azul translúcido */
    
    i {
      color: #007bff;
    }

    /* Linha azul indicadora na esquerda */
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10%;
      height: 80%;
      width: 4px;
      background-color: #007bff;
      border-radius: 0 4px 4px 0;
    }
  }
`;