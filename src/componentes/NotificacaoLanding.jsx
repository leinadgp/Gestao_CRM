import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { io } from 'socket.io-client';

const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

export function NotificacaoLanding() {
  const [notificacao, setNotificacao] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect_error', (err) => {
      console.warn('Falha ao conectar socket de notificações:', err.message);
    });

    socket.on('nova_inscricao_landing', (data) => {
      setNotificacao(data);
      tocarSom();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setNotificacao(null), 7000);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      socket.disconnect();
    };
  }, []);

  function tocarSom() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.value = 620;
      gain.gain.value = 0.12;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.16);

      oscillator.onended = () => ctx.close();
    } catch (error) {
      console.warn('Não foi possível tocar som de notificação.', error);
    }
  }

  if (!notificacao) return null;

  return (
    <ToastWrapper>
      <ToastCard>
        <ToastIcon>
          <i className="fa-solid fa-bell"></i>
        </ToastIcon>
        <ToastContent>
          <strong>Nova inscrição via landing page</strong>
          <p>{notificacao.curso_nome || notificacao.mensagem}</p>
          {notificacao.empresaNome && <small>{notificacao.empresaNome}</small>}
        </ToastContent>
        <CloseButton onClick={() => setNotificacao(null)}>
          <i className="fa-solid fa-xmark"></i>
        </CloseButton>
      </ToastCard>
    </ToastWrapper>
  );
}

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const ToastWrapper = styled.div`
  position: fixed;
  bottom: 26px;
  right: 26px;
  z-index: 10001;
  pointer-events: none;
`;

const ToastCard = styled.div`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(360px, calc(100vw - 32px));
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #f8fafc;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(148, 163, 184, 0.18);
  padding: 18px 18px 18px 14px;
  animation: ${slideIn} 0.28s ease-out;
`;

const ToastIcon = styled.div`
  width: 46px;
  height: 46px;
  min-width: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f59e0b;
  color: #0f172a;
  font-size: 1.2rem;
`;

const ToastContent = styled.div`
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.35;
  p { margin: 6px 0 0; color: #cbd5e1; }
  small { display: block; margin-top: 4px; color: #94a3b8; }
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 8px;
  border-radius: 8px;
  transition: color 0.15s ease;
  &:hover { color: #fff; }
`;
