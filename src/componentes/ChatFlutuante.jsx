// src/componentes/ChatFlutuante.jsx
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';

export function ChatFlutuante() {
  const location = useLocation();

  const [credenciais, setCredenciais] = useState({
    meuId: localStorage.getItem('usuarioId'),
    token: localStorage.getItem('token')
  });

  useEffect(() => {
    setCredenciais({
      meuId: localStorage.getItem('usuarioId'),
      token: localStorage.getItem('token')
    });
  }, [location.pathname]);

  const { meuId, token } = credenciais;

  const [aberto, setAberta] = useState(false);
  const [equipe, setEquipe] = useState([]);
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [usuariosOnline, setUsuariosOnline] = useState([]);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(false);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
  
  const socketRef = useRef(null);
  const mensagensEndRef = useRef(null);
  const abertoRef = useRef(aberto);

  useEffect(() => {
    abertoRef.current = aberto;
  }, [aberto]);

  useEffect(() => {
    if (!meuId || !token) return;

    axios.get(`${API_URL}/usuarios/equipe`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setEquipe(res.data.filter(u => String(u.id) !== String(meuId) && u.ativo !== false)))
    .catch(err => console.error("Erro ao buscar equipe no chat:", err));

    socketRef.current = io(API_URL);
    socketRef.current.emit('registrar_usuario', meuId);

    socketRef.current.on('usuarios_online', (ids) => {
      setUsuariosOnline(ids.map(String));
    });

    socketRef.current.on('nova_mensagem', (msg) => {
      setMensagens(prev => [...prev, msg]);
      if (!abertoRef.current) setMensagensNaoLidas(true); 
    });

    socketRef.current.on('mensagem_enviada_ok', (msg) => {
      setMensagens(prev => [...prev, msg]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [API_URL, meuId, token]); 

  useEffect(() => {
    if (mensagensEndRef.current) {
      mensagensEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aberto, contatoAtivo]);

  if (!meuId || !token) return null;

  const abrirConversa = async (usuario) => {
    setContatoAtivo(usuario);
    setMensagens([]); 
    setCarregandoMensagens(true);

    try {
      const res = await axios.get(`${API_URL}/chat/${usuario.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensagens(res.data);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
    } finally {
      setCarregandoMensagens(false);
    }
  };

  const enviarMensagem = (e) => {
    e.preventDefault();
    if (!texto.trim() || !contatoAtivo || !socketRef.current) return;

    socketRef.current.emit('enviar_mensagem', {
      remetente_id: meuId,
      destinatario_id: contatoAtivo.id,
      mensagem: texto
    });

    setTexto('');
  };

  const toggleChat = () => {
    setAberta(!aberto);
    if (!aberto) setMensagensNaoLidas(false);
  };

  return (
    <ChatContainer>
      {aberto && (
        <ChatWindow>
          {!contatoAtivo ? (
            <>
              <ChatHeader>
                <h4><i className="fa-solid fa-comments"></i> Chat da Equipe</h4>
                <button onClick={toggleChat}><i className="fa-solid fa-times"></i></button>
              </ChatHeader>
              <EquipeList>
                {equipe.map(user => {
                  const isOnline = usuariosOnline.includes(String(user.id));
                  return (
                    <EquipeItem key={user.id} onClick={() => abrirConversa(user)}>
                      <div className="avatar">
                        {/* AQUI ESTÁ A LÓGICA DA FOTO NA LISTA */}
                        {user.foto_perfil ? (
                          <img src={user.foto_perfil} alt={user.nome} />
                        ) : (
                          <i className="fa-solid fa-user"></i>
                        )}
                        <StatusDot $online={isOnline} />
                      </div>
                      <div className="info">
                        <strong>{user.nome}</strong>
                        <span>{user.perfil}</span>
                      </div>
                    </EquipeItem>
                  )
                })}
                {equipe.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0', fontSize: '0.85rem' }}>
                    Nenhum outro usuário ativo no momento.
                  </div>
                )}
              </EquipeList>
            </>
          ) : (
            <>
              <ChatHeader>
                <button onClick={() => setContatoAtivo(null)} className="back-btn">
                  <i className="fa-solid fa-arrow-left"></i>
                </button>

                {/* AQUI ESTÁ A LÓGICA DA FOTO NO CABEÇALHO DO CHAT */}
                <div className="chat-active-avatar">
                  {contatoAtivo.foto_perfil ? (
                    <img src={contatoAtivo.foto_perfil} alt={contatoAtivo.nome} />
                  ) : (
                    <div className="placeholder-avatar"><i className="fa-solid fa-user"></i></div>
                  )}
                </div>

                <div style={{ flex: 1, marginLeft: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{contatoAtivo.nome}</h4>
                  <span style={{ fontSize: '0.75rem', color: usuariosOnline.includes(String(contatoAtivo.id)) ? '#90ee90' : '#cbd5e1' }}>
                    {usuariosOnline.includes(String(contatoAtivo.id)) ? 'Online' : 'Offline'}
                  </span>
                </div>
                <button onClick={toggleChat}><i className="fa-solid fa-times"></i></button>
              </ChatHeader>
              
              <MessagesArea>
                {carregandoMensagens ? (
                  <div style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '20px'}}>
                    <i className="fa-solid fa-spinner fa-spin"></i> Carregando...
                  </div>
                ) : mensagens.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '20px'}}>
                    Nenhuma mensagem ainda. Envie um "Olá"!
                  </div>
                ) : (
                  mensagens.map((msg, idx) => {
                    const souEu = String(msg.remetente_id) === String(meuId);
                    return (
                      <MessageBubble key={idx} $souEu={souEu}>
                        {msg.mensagem}
                        <span className="time">
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </MessageBubble>
                    )
                  })
                )}
                <div ref={mensagensEndRef} />
              </MessagesArea>

              <MessageInputForm onSubmit={enviarMensagem}>
                <input 
                  type="text" 
                  placeholder="Digite sua mensagem..." 
                  value={texto} 
                  onChange={e => setTexto(e.target.value)} 
                  autoFocus
                />
                <button type="submit" disabled={!texto.trim() || carregandoMensagens}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </MessageInputForm>
            </>
          )}
        </ChatWindow>
      )}

      <FloatingButton onClick={toggleChat} $ativo={aberto}>
        {aberto ? <i className="fa-solid fa-times"></i> : <i className="fa-solid fa-comment-dots"></i>}
        {!aberto && mensagensNaoLidas && <NotificationBadge />}
      </FloatingButton>
    </ChatContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================
const ChatContainer = styled.div`
  position: fixed; bottom: 30px; right: 30px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end;
`;
const FloatingButton = styled.button`
  width: 60px; height: 60px; border-radius: 50%; background-color: ${props => props.$ativo ? '#dc3545' : '#007bff'}; color: white; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 1.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; position: relative;
  &:hover { transform: scale(1.05); }
`;
const NotificationBadge = styled.div`
  position: absolute; top: 0; right: 0; width: 16px; height: 16px; background-color: #dc3545; border-radius: 50%; border: 2px solid white;
`;
const ChatWindow = styled.div`
  width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); margin-bottom: 20px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #edf2f9; animation: slideUp 0.3s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
const ChatHeader = styled.div`
  background: #1F4E79; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;
  h4 { margin: 0; display: flex; align-items: center; gap: 8px;}
  button { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; opacity: 0.8; transition: 0.2s; &:hover { opacity: 1; } }
  .back-btn { font-size: 1rem; }

  .chat-active-avatar {
    width: 35px; height: 35px; border-radius: 50%; overflow: hidden; margin-left: 12px; border: 2px solid rgba(255,255,255,0.2);
    img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-avatar { width: 100%; height: 100%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; i { font-size: 1rem; } }
  }
`;
const EquipeList = styled.div`
  flex: 1; overflow-y: auto; padding: 10px 0;
`;
const EquipeItem = styled.div`
  display: flex; align-items: center; gap: 15px; padding: 12px 20px; cursor: pointer; border-bottom: 1px solid #f8fafc; transition: background 0.2s;
  &:hover { background: #f0f7ff; }
  .avatar { 
    position: relative; width: 45px; height: 45px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; 
    /* Estilo para a imagem encaixar redondinha */
    img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  }
  .info { display: flex; flex-direction: column; strong { color: #2c3e50; font-size: 0.95rem; } span { color: #94a3b8; font-size: 0.8rem; text-transform: capitalize; } }
`;
const StatusDot = styled.div`
  position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; background-color: ${props => props.$online ? '#28a745' : '#cbd5e1'};
`;
const MessagesArea = styled.div`
  flex: 1; background: #f4f7f6; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
`;
const MessageBubble = styled.div`
  max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 0.9rem; line-height: 1.4; position: relative; word-wrap: break-word;
  align-self: ${props => props.$souEu ? 'flex-end' : 'flex-start'};
  background: ${props => props.$souEu ? '#007bff' : '#ffffff'};
  color: ${props => props.$souEu ? '#ffffff' : '#2c3e50'};
  border: 1px solid ${props => props.$souEu ? '#007bff' : '#e2e8f0'};
  border-bottom-right-radius: ${props => props.$souEu ? '4px' : '12px'};
  border-bottom-left-radius: ${props => props.$souEu ? '12px' : '4px'};
  .time { display: block; font-size: 0.65rem; margin-top: 5px; text-align: right; color: ${props => props.$souEu ? 'rgba(255,255,255,0.7)' : '#94a3b8'}; }
`;
const MessageInputForm = styled.form`
  display: flex; padding: 15px; background: white; border-top: 1px solid #edf2f9;
  input { flex: 1; padding: 10px 15px; border: 1px solid #cbd5e1; border-radius: 20px; outline: none; font-size: 0.9rem; transition: 0.2s; &:focus { border-color: #007bff; } }
  button { background: none; border: none; color: #007bff; font-size: 1.5rem; margin-left: 10px; cursor: pointer; transition: 0.2s; &:disabled { color: #cbd5e1; cursor: not-allowed; } &:hover:not(:disabled) { transform: scale(1.1); } }
`;