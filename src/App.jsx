// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './componentes/Sidebar';
import { Home } from './pages/Home';
import { Contatos } from './pages/Contatos';

export function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contatos" element={<Contatos />} />
            {/* As outras rotas criaremos depois */}
            <Route path="/funil" element={<div><h1 className="page-title">Funil de Vendas</h1></div>} />
            <Route path="/empresas" element={<div><h1 className="page-title">Empresas</h1></div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;