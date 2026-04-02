// src/App.jsx
// Trocamos BrowserRouter por HashRouter
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import { Sidebar } from './componentes/Sidebar.jsx';
import { Home } from './pages/Home.jsx';
import { Contatos } from './pages/Contatos.jsx';
import { Login } from './pages/Login.jsx';
import { Empresas } from './pages/Empresas.jsx';
import { Funil } from './pages/Funil.jsx';
import { Disparos } from './pages/Disparos.jsx';
import { Campanhas } from './pages/Campanhas.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { LandingPages } from './pages/LandingPages.jsx';

function RotaProtegida({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // O Navigate funcionará normalmente com o HashRouter
    return <Navigate to="/login" replace />;
  }

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
    // Envolvemos tudo com HashRouter em vez de BrowserRouter
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

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
        <Route path="/landing-pages" element={
          <RotaProtegida>
            <LandingPages />
          </RotaProtegida>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;