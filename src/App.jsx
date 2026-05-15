import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import styled, { createGlobalStyle } from 'styled-components';

// Importação dos Componentes de Layout
import { Sidebar } from './componentes/Sidebar.jsx';
import { Header } from './componentes/Header.jsx';

// Importação das Páginas
import { Home } from './pages/Home.jsx';
import { Contatos } from './pages/Contatos.jsx';
import { Login } from './pages/Login.jsx';
import { Empresas } from './pages/Empresas.jsx';
import { Funil } from './pages/Funil.jsx';
import { Disparos } from './pages/Disparos.jsx';
import { Campanhas } from './pages/Campanhas.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { LandingPages } from './pages/LandingPages.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';

// === ESTILOS GLOBAIS E FIX PARA IPHONE ===
const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%;
    background-color: #0B0F19; font-family: 'Inter', sans-serif;
    overscroll-behavior: none; /* FIX IPHONE: Remove o efeito elástico */
    -webkit-font-smoothing: antialiased;
  }
  * { box-sizing: border-box; }
`;

function RotaProtegida({ children, titulo }) {
  const token = localStorage.getItem('token');
  // Estado que controla se o menu do celular está aberto ou fechado
  const [menuAberto, setMenuAberto] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      
      <ContentWrapper>
        <Header titulo={titulo} setMenuAberto={setMenuAberto} />
        <MainContent>
          {children}
          
        </MainContent>
      </ContentWrapper>
    </AppLayout>
  );
}

export function App() {
  return (
    <>
      <GlobalStyle />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<RotaProtegida titulo="Dashboard"><Home /></RotaProtegida>} />
          <Route path="/contatos" element={<RotaProtegida titulo="Base de Contatos"><Contatos /></RotaProtegida>} />
          <Route path="/campanhas" element={<RotaProtegida titulo="Cursos e Campanhas"><Campanhas /></RotaProtegida>} />
          <Route path="/funil" element={<RotaProtegida titulo="Funil de Vendas"><Funil /></RotaProtegida>} />
          <Route path="/dashboard" element={<RotaProtegida titulo="Métricas Globais"><Dashboard /></RotaProtegida>} />
          <Route path="/empresas" element={<RotaProtegida titulo="Prefeituras / Empresas"><Empresas /></RotaProtegida>} />
          <Route path="/disparos" element={<RotaProtegida titulo="Máquina de Disparos"><Disparos /></RotaProtegida>} />
          <Route path="/landing-pages" element={<RotaProtegida titulo="Landing Pages"><LandingPages /></RotaProtegida>} />
          <Route path="/configuracoes" element={<RotaProtegida titulo="Configurações"><Configuracoes /></RotaProtegida>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

// ==========================================
// STYLED COMPONENTS DO LAYOUT
// ==========================================
const AppLayout = styled.div`
  display: flex;
  flex-direction: row; /* Layout clássico: Sidebar esquerda, conteúdo direita */
  width: 100vw;
  height: 100dvh; /* Altura exata da tela, blinda o iPhone */
  overflow: hidden; 
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* O Wrapper não rola, quem rola é o MainContent */
`;

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  position: relative;
  background-color: #f8fafc; /* Fundo mais claro para as páginas, se desejar */
  
  /* Scrollbar estilizada */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;