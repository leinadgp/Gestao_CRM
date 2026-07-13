import axios from 'axios';
import { clearAuth } from './auth.js';

let configurado = false;

// Sem timeout, uma resposta que nunca chega (banco lento/instável) deixa a
// tela esperando pra sempre, sem erro nenhum — parece "travado". Com timeout,
// a chamada falha em alguns segundos e o catch de cada tela consegue reagir.
axios.defaults.timeout = 20000;

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
          // Marca o erro pra quem for tratar não precisar mostrar seu próprio
          // alerta de erro em cima do redirecionamento — evita a sensação de
          // "travou e depois expulsou" quando na real é só sessão expirada.
          error.sessaoExpirada = true;
          clearAuth();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}
