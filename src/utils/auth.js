import { jwtDecode } from 'jwt-decode';

export function getUserFromToken() {
  const token = localStorage.getItem('token');
  
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    console.error('Erro ao decodificar token', error);
    return null;
  }
}

export function getUserFirstName() {
  const user = getUserFromToken();
  
  return user?.nome?.split(' ')[0] || 'Usuário';
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('perfil');
  localStorage.removeItem('usuarioId');
}

export function getUserProfile() {
  const perfil = localStorage.getItem('perfil');
  return perfil || 'user'; // fallback seguro
}

export function getUserId() {
  return parseInt(localStorage.getItem('usuarioId') || '0');
}

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}