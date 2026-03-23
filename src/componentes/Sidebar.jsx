// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <i className="fa-solid fa-chart-line"></i> Meu CRM
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <i className="fa-solid fa-house"></i> Home
        </NavLink>
        <NavLink to="/funil" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <i className="fa-solid fa-filter"></i> Funil de Vendas
        </NavLink>
        <NavLink to="/contatos" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <i className="fa-solid fa-users"></i> Contatos
        </NavLink>
        <NavLink to="/empresas" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <i className="fa-solid fa-building"></i> Empresas
        </NavLink>
      </nav>
    </aside>
  );
}