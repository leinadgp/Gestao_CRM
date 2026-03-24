// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './componentes/Sidebar.jsx';
import { Home } from './pages/Home.jsx';
import { Contatos } from './pages/Contatos.jsx';
import { Login } from './pages/Login.jsx';
import { Empresas } from './pages/Empresas.jsx';
import { Funil } from './pages/Funil.jsx';
import { Disparos } from './pages/Disparos.jsx';
import { Campanhas } from './pages/Campanhas.jsx';
import { Dashboard } from './pages/Dashboard.jsx';

// === COMPONENTE DE PROTEÇÃO E LAYOUT ===
// Tudo que ficar aqui dentro só aparece se o usuário estiver logado
function RotaProtegida({ children }) {
  const token = localStorage.getItem('token');

  // Se não tem token, joga pra tela de login imediatamente
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Se tem token, renderiza a casca do sistema (Sidebar) e a página solicitada (children)
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública (Não tem Sidebar, não tem proteção) */}
        <Route path="/login" element={<Login />} />

        {/* Rotas Privadas (Envelopadas pelo componente RotaProtegida) */}
        <Route path="/" element={
          <RotaProtegida>
            <Home />
          </RotaProtegida>
        } />

        <Route path="/contatos" element={
          <RotaProtegida>
            <Contatos />
          </RotaProtegida>
        } />

         <Route path="/campanhas" element={
          <RotaProtegida>
            <Campanhas />
          </RotaProtegida>
        } />
        <Route path="/funil" element={
          <RotaProtegida>
            <Funil />
          </RotaProtegida>
        } />
        <Route path="/dashboard" element={
          <RotaProtegida>
            <Dashboard />
          </RotaProtegida>
        } />
        <Route path="/empresas" element={
          <RotaProtegida>
            <Empresas />
          </RotaProtegida>
        } />
        <Route path="/disparos" element={
          <RotaProtegida>
            <Disparos />
          </RotaProtegida>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;