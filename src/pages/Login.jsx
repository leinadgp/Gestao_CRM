// src/pages/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

export function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();
  const API_URL = 'https://server-js-gestao.onrender.com';

  async function fazerLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await axios.post(`${API_URL}/login`, { login, senha });

      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('perfil', resposta.data.perfil || 'usuario');
      
      if (resposta.data.usuarioId) localStorage.setItem('usuarioId', resposta.data.usuarioId);
      if (resposta.data.nome) localStorage.setItem('nome', resposta.data.nome);

      navigate('/'); 

    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErro('Usuário ou senha inválidos.');
      } else {
        setErro('Erro ao conectar com o servidor. Tente novamente.');
      }
      console.error('Erro no login:', error);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <PageContainer>
      <LoginCard>
        
        <Header>
          <h2>
            <i className="fa-solid fa-right-to-bracket"></i> Acesso ao Sistema
          </h2>
          <p>Insira suas credenciais para continuar.</p>
        </Header>

        {erro && (
          <ErrorMessage>
            <i className="fa-solid fa-circle-exclamation"></i> {erro}
          </ErrorMessage>
        )}

        <Form onSubmit={fazerLogin}>
          <InputGroup>
            <label>Usuário</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-user"></i>
              <Input 
                type="text" 
                placeholder="Digite seu usuário..." 
                value={login} 
                onChange={e => setLogin(e.target.value)} 
                required 
              />
            </div>
          </InputGroup>

          <InputGroup>
            <label>Senha</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <Input 
                type="password" 
                placeholder="Sua senha secreta..." 
                value={senha} 
                onChange={e => setSenha(e.target.value)} 
                required 
              />
            </div>
          </InputGroup>

          <SubmitButton type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </SubmitButton>
        </Form>

      </LoginCard>
    </PageContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const PageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  /* Gradiente moderno baseado na paleta da sua aplicação */
  background: linear-gradient(135deg, #1F4E79 0%, #0056b3 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: #ffffff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 420px;
  animation: fadeIn 0.4s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;

  h2 {
    color: #333;
    margin: 0 0 8px 0;
    font-size: 1.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    i {
      color: #007bff;
    }
  }

  p {
    color: #777;
    font-size: 0.95rem;
    margin: 0;
  }
`;

const ErrorMessage = styled.div`
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  border: 1px solid #f5c6cb;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;

  label {
    font-weight: 600;
    margin-bottom: 8px;
    color: #444;
    font-size: 0.9rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    i {
      position: absolute;
      left: 14px;
      color: #aaa;
      font-size: 1rem;
      transition: color 0.3s;
    }
  }

  /* Muda a cor do ícone quando o input ganha foco */
  &:focus-within i {
    color: #007bff;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 14px 14px 40px;
  border-radius: 8px;
  border: 1px solid #dcdcdc;
  font-size: 1rem;
  color: #333;
  background-color: #fcfcfc;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &::placeholder {
    color: #bbb;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
    background-color: #ffffff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
  }
`;

const SubmitButton = styled.button`
  background: ${props => props.disabled ? '#cccccc' : '#007bff'};
  color: #ffffff;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin-top: 10px;
  transition: all 0.3s ease;
  box-shadow: ${props => props.disabled ? 'none' : '0 4px 12px rgba(0, 123, 255, 0.3)'};

  &:hover {
    background: ${props => props.disabled ? '#cccccc' : '#0056b3'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 6px 15px rgba(0, 123, 255, 0.4)'};
  }

  &:active {
    transform: translateY(0);
  }
`;