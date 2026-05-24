import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { getUserProfile } from '../utils/auth';
import { temPermissao } from '../utils/permissoes';

// IMPORTAÇÃO DA SUA LOGO (Ajuste para .svg ou .jpg se necessário)
import logoCliente from '../assets/Logointerno.png'; 

const MENU_CONFIG = [
  {
    section: 'MENU PRINCIPAL',
    items: [
      { label: 'Home', path: '/', icon: 'fa-house', modulo: 'home' },
      { label: 'Dashboard', path: '/dashboard', icon: 'fa-chart-pie', modulo: 'dashboard' },
      { label: 'Funil de Vendas', path: '/funil', icon: 'fa-layer-group', modulo: 'funil' }
    ]
  },
  {
    section: 'OPERAÇÃO',
    items: [
      { label: 'Contatos', path: '/contatos', icon: 'fa-users', modulo: 'contatos' },
      { label: 'Prefeituras / Empresas', path: '/empresas', icon: 'fa-building', modulo: 'empresas' },
    ]
  },
  {
    section: 'MARKETING & VENDAS',
    items: [
      { label: 'Cursos e Campanhas', path: '/campanhas', icon: 'fa-bullhorn', modulo: 'campanhas' },
      { label: 'Máquina de Disparos', path: '/disparos', icon: 'fa-paper-plane', modulo: 'disparos' },
      { label: 'Landing Pages', path: '/landing-pages', icon: 'fa-window-maximize', modulo: 'landing_pages' }
    ]
  }
];

export function Sidebar({ menuAberto, setMenuAberto }) {
  const [perfilUsuario] = useState(() => getUserProfile());
  const location = useLocation();

  // Fecha a gaveta no mobile ao clicar em um link
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname, setMenuAberto]);

  return (
    <>
      {/* Overlay Escuro: Só aparece no celular quando o menu estiver aberto */}
      {menuAberto && <Overlay onClick={() => setMenuAberto(false)} />}
      
      <SidebarContainer $aberto={menuAberto}>
        <div className="sidebar-top">
          
          {/* === AQUI ENTRA A LOGO DO CLIENTE === */}
          {/* <Logo>
            <img src={logoCliente} alt="Logo do Cliente" className="img-logo" />
          </Logo> */}
          
          <button className="close-btn" onClick={() => setMenuAberto(false)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <NavList>
          {MENU_CONFIG.map((section, index) => {
            const visibleItems = section.items.filter(
              (item) => !item.modulo || temPermissao(item.modulo)
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
    </>
  );
}

// ==========================================
// ANIMAÇÕES E ESTILOS
// ==========================================
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Overlay = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: block;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: 999;
    animation: ${fadeIn} 0.3s ease;
  }
`;

const SidebarContainer = styled.aside`
  width: 260px; /* Largura fixa, não ocupa a tela inteira */
  background-color: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;

  .sidebar-top {
    padding: 25px 25px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-btn {
    display: none;
    background: rgba(255,255,255,0.1);
    border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;
    width: 32px; height: 32px; border-radius: 6px;
  }

  /* COMPORTAMENTO NO CELULAR */
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh; /* Altura segura para iPhone */
    padding-bottom: env(safe-area-inset-bottom);
    
    /* Efeito de gaveta */
    transform: translateX(${props => (props.$aberto ? '0' : '-100%')});
    
    .close-btn { display: flex; align-items: center; justify-content: center; }
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  
  .img-logo {
    max-width: 170px; /* Limita o tamanho para não estourar a sidebar */
    max-height: 50px; /* Evita que logos altas desfigurem o menu */
    object-fit: contain; /* Garante que a imagem não seja cortada ou esticada */
  }
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 15px 20px;

  .nav-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: #64748b;
    margin: 15px 0 5px 15px;
    letter-spacing: 1px;
    display: block;
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
  margin-bottom: 4px;

  i {
    font-size: 1.1rem;
    width: 20px;
    text-align: center;
    transition: color 0.2s ease;
  }

  &:hover {
    color: #f8fafc;
    background-color: #1e293b;
    i { color: #007bff; }
  }

  &.active {
    color: #ffffff;
    background-color: rgba(0, 123, 255, 0.15);
    i { color: #007bff; }

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