// src/componentes/Sidebar.jsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { getUserProfile } from '../utils/auth';

// 1. OTIMIZAÇÃO: Constante movida para fora do componente.
// Evita alocação de memória desnecessária a cada re-render do React.
const MENU_CONFIG = [
  {
    section: 'MENU PRINCIPAL',
    items: [
      { label: 'Home', path: '/', icon: 'fa-house' },
      { label: 'Dashboard', path: '/dashboard', icon: 'fa-chart-pie', role: 'admin' },
      { label: 'Funil de Vendas', path: '/funil', icon: 'fa-layer-group' }
    ]
  },
  {
    section: 'OPERAÇÃO',
    items: [
      { label: 'Contatos', path: '/contatos', icon: 'fa-users' },
      { label: 'Prefeituras / Empresas', path: '/empresas', icon: 'fa-building' },
        
    ]
  },
  {
    section: 'MARKETING & VENDAS',
    role: 'admin',
    items: [
      { label: 'Cursos e Campanhas', path: '/campanhas', icon: 'fa-bullhorn' },
      { label: 'Máquina de Disparos', path: '/disparos', icon: 'fa-paper-plane' },
      { label: 'Landing Pages', path: '/landing-pages', icon: 'fa-window-maximize' }
    ]
  }
];

export function Sidebar() {
  // 2. OTIMIZAÇÃO: Lazy Initialization para ler o perfil apenas na montagem
  const [perfilUsuario] = useState(() => getUserProfile());

  return (
    <SidebarContainer>
      <Logo>
        <div className="icon-wrapper">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <span>Meu CRM</span>
      </Logo>

      <NavList>
        {MENU_CONFIG.map((section, index) => {
          // Verifica permissão da seção inteira
          if (section.role && section.role !== perfilUsuario) return null;

          // Filtra itens por permissão
          const visibleItems = section.items.filter(
            item => !item.role || item.role === perfilUsuario
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={index}>
              <span className="nav-label">{section.section}</span>

              {visibleItems.map((item, idx) => (
                <NavItem key={idx} to={item.path} end={item.path === '/'}>
                  <i className={`fa-solid ${item.icon}`}></i>
                  {item.label}
                </NavItem>
              ))}
            </div>
          );
        })}
      </NavList>
    </SidebarContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const SidebarContainer = styled.aside`
  width: 260px;
  background-color: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 25px 0;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.05);
  z-index: 100;
  flex-shrink: 0;
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
    color: #64748b;
    margin: 15px 0 5px 15px;
    letter-spacing: 1px;
  }
`;

const NavItem = styled(NavLink)`
  padding: 12px 18px;
  color: #94a3b8;
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
    background-color: #1e293b;
    
    i {
      color: #007bff;
    }
  }

  &.active {
    color: #ffffff;
    background-color: rgba(0, 123, 255, 0.15);
    
    i {
      color: #007bff;
    }

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