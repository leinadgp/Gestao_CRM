import axios from 'axios';
import { clearAuth } from './auth.js';

let configurado = false;

/** Renova o token a cada resposta autenticada (inatividade máx. 8h no servidor). */
export function setupAxiosAuth() {
  if (configurado) return;
  configurado = true;

  axios.interceptors.response.use(
    (response) => {
      const novo = response.headers?.['x-renewed-token'];
      if (novo) {
        localStorage.setItem('token', novo);
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        const path = window.location.pathname;
        if (!path.includes('/login')) {
          clearAuth();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}
