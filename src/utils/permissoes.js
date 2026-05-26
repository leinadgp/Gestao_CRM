export const MODULOS_CRM = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'funil', label: 'Funil de Vendas', path: '/funil' },
  { id: 'contatos', label: 'Contatos', path: '/contatos' },
  { id: 'empresas', label: 'Prefeituras / Empresas', path: '/empresas' },
  { id: 'campanhas', label: 'Cursos e Campanhas', path: '/campanhas' },
  { id: 'disparos', label: 'Máquina de Disparos', path: '/disparos' },
  { id: 'landing_pages', label: 'Landing Pages', path: '/landing-pages' },
];

/** Permissões extras (não são rotas do menu) — o admin libera por usuário */
export const PERMISSOES_ESPECIAIS = [
  { id: 'excluir_inscricao', label: 'Excluir inscrições no Dashboard' },
];

const IDS_MODULOS = new Set(MODULOS_CRM.map((m) => m.id));

export function isModuloPermissao(id) {
  return IDS_MODULOS.has(id);
}

export function temPermissaoEspecial(especialId) {
  const perfil = localStorage.getItem('perfil');
  if (perfil === 'admin') return true;
  const permissoes = getPermissoes();
  if (!permissoes) return false;
  return permissoes.includes(especialId);
}

export function getPermissoes() {
  try {
    const raw = localStorage.getItem('permissoes');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setPermissoes(lista) {
  if (Array.isArray(lista)) {
    localStorage.setItem('permissoes', JSON.stringify(lista));
  }
}

export function temPermissao(moduloId) {
  const perfil = localStorage.getItem('perfil');
  if (perfil === 'admin') return true;
  const permissoes = getPermissoes();
  if (!permissoes) return true;
  return permissoes.includes(moduloId);
}

export function pathParaModulo(pathname) {
  if (!pathname || pathname === '/') return 'home';
  const p = pathname.replace(/\/$/, '') || '/';
  const mod = MODULOS_CRM.find((m) => m.path !== '/' && p.startsWith(m.path));
  return mod ? mod.id : 'configuracoes';
}

export function primeiraRotaPermitida() {
  const mod = MODULOS_CRM.find((m) => temPermissao(m.id));
  return mod?.path || '/configuracoes';
}
