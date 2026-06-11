import { createContext, useCallback, useContext, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const ToastContext = createContext(null);

const slideIn = keyframes`
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
  pointer-events: none;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  min-width: 260px;
  max-width: 380px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  animation: ${slideIn} 0.25s ease;
  pointer-events: auto;
  background: ${({ $type }) =>
    $type === 'erro'    ? '#d63031' :
    $type === 'sucesso' ? '#00b894' :
                          '#0984e3'};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 16px;
  cursor: pointer;
  margin-left: auto;
  line-height: 1;
  padding: 0;
  &:hover { color: #fff; }
`;

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remover = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const mostrar = useCallback((mensagem, tipo = 'info', duracao = 4000) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    timers.current[id] = setTimeout(() => remover(id), duracao);
  }, [remover]);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <Container>
        {toasts.map(t => (
          <Item key={t.id} $type={t.tipo}>
            <span>{t.mensagem}</span>
            <CloseBtn onClick={() => remover(t.id)}>×</CloseBtn>
          </Item>
        ))}
      </Container>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
