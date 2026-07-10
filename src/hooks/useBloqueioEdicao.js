import { useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
const INTERVALO_HEARTBEAT_MS = 60000;
const FALHAS_ANTES_DE_DESISTIR = 2;

function getHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

// Trava de edição genérica (Bloco 33): impede que duas pessoas editem o mesmo
// recurso (negociação, landing page...) ao mesmo tempo. Renova sozinha via
// heartbeat enquanto a edição estiver aberta; se o heartbeat falhar 2 vezes
// seguidas (trava expirou e foi tomada por outra pessoa), chama onTravaPerdida
// pra quem estiver editando ser avisado e voltar pra tela inicial.
export function useBloqueioEdicao(recursoTipo, { onTravaPerdida } = {}) {
  const recursoIdRef = useRef(null);
  const intervalRef = useRef(null);
  const falhasRef = useRef(0);

  const pararHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const iniciarHeartbeat = useCallback((recursoId) => {
    pararHeartbeat();
    intervalRef.current = setInterval(async () => {
      try {
        await axios.post(`${API_URL}/bloqueios`, { recurso_tipo: recursoTipo, recurso_id: recursoId }, getHeaders());
        falhasRef.current = 0;
      } catch (e) {
        falhasRef.current += 1;
        console.error('Falha ao renovar bloqueio de edição.', e);
        if (falhasRef.current >= FALHAS_ANTES_DE_DESISTIR) {
          pararHeartbeat();
          recursoIdRef.current = null;
          if (onTravaPerdida) onTravaPerdida();
        }
      }
    }, INTERVALO_HEARTBEAT_MS);
  }, [recursoTipo, onTravaPerdida, pararHeartbeat]);

  const tentarAbrir = useCallback(async (recursoId) => {
    try {
      await axios.post(`${API_URL}/bloqueios`, { recurso_tipo: recursoTipo, recurso_id: recursoId }, getHeaders());
      recursoIdRef.current = recursoId;
      falhasRef.current = 0;
      iniciarHeartbeat(recursoId);
      return { ok: true };
    } catch (e) {
      const dados = e.response?.data || {};
      return { ok: false, usuario_nome: dados.usuario_nome || null, expira_em: dados.expira_em || null };
    }
  }, [recursoTipo, iniciarHeartbeat]);

  const liberar = useCallback(async () => {
    pararHeartbeat();
    const recursoId = recursoIdRef.current;
    recursoIdRef.current = null;
    falhasRef.current = 0;
    if (recursoId == null) return;
    try {
      await axios.delete(`${API_URL}/bloqueios`, { ...getHeaders(), data: { recurso_tipo: recursoTipo, recurso_id: recursoId } });
    } catch (e) {
      console.error('Erro ao liberar bloqueio de edição.', e);
    }
  }, [recursoTipo, pararHeartbeat]);

  return { tentarAbrir, liberar };
}
