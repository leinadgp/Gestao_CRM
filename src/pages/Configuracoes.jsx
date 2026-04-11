// src/pages/Configuracoes.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';

export function Configuracoes() {
  const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
  const fileInputRef = useRef(null);
  
  const [perfilUsuario] = useState(() => localStorage.getItem('perfil'));
  const [abaAtiva, setAbaAtiva] = useState('perfil'); 
  
  // --- ESTADOS DO MEU PERFIL ---
  const [meuNome, setMeuNome] = useState('');
  const [meuEmail, setMeuEmail] = useState('');
  const [meuTelefone, setMeuTelefone] = useState('');
  const [minhaFoto, setMinhaFoto] = useState(''); 
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  // --- ESTADOS DA EQUIPE ---
  const [equipe, setEquipe] = useState([]);
  const [carregandoEquipe, setCarregandoEquipe] = useState(false);
  const [mostrarModalNovoUser, setMostrarModalNovoUser] = useState(false);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novaSenhaUser, setNovaSenhaUser] = useState('');
  const [novoPerfil, setNovoPerfil] = useState('vendedor');
  const [salvandoUser, setSalvandoUser] = useState(false);

  // --- ESTADOS DE SENHA ---
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const carregarMeuPerfil = useCallback(async () => {
    setCarregandoPerfil(true);
    try {
      const res = await axios.get(`${API_URL}/usuarios/me`, getHeaders());
      setMeuNome(res.data.nome || '');
      setMeuEmail(res.data.email || '');
      setMeuTelefone(res.data.telefone || '');
      setMinhaFoto(res.data.foto_perfil || '');
    } catch (error) {
      console.error('Erro ao carregar perfil', error);
    } finally {
      setCarregandoPerfil(false);
    }
  }, [API_URL, getHeaders]);

  const carregarEquipe = useCallback(async () => {
    if (perfilUsuario !== 'admin') return;
    setCarregandoEquipe(true);
    try {
      const res = await axios.get(`${API_URL}/usuarios/equipe`, getHeaders());
      setEquipe(res.data);
    } catch (error) {
      console.error('Erro ao carregar equipe', error);
    } finally {
      setCarregandoEquipe(false);
    }
  }, [API_URL, getHeaders, perfilUsuario]);

  useEffect(() => {
    if (abaAtiva === 'perfil') carregarMeuPerfil();
    if (abaAtiva === 'equipe') carregarEquipe();
  }, [abaAtiva, carregarMeuPerfil, carregarEquipe]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return alert("A imagem é muito grande. Escolha uma foto menor que 2MB.");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMinhaFoto(reader.result); 
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSalvarPerfil(e) {
    e.preventDefault();
    setSalvandoPerfil(true);
    try {
      const res = await axios.put(`${API_URL}/usuarios/me`, {
        nome: meuNome, email: meuEmail, telefone: meuTelefone, foto_perfil: minhaFoto
      }, getHeaders());
      
      localStorage.setItem('nome', res.data.nome);
      if (res.data.foto_perfil) localStorage.setItem('foto_perfil', res.data.foto_perfil);
      window.dispatchEvent(new Event('perfilAtualizado'));

      alert('✅ Perfil atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar o perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function handleAlterarSenha(e) {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) return alert('As senhas não conferem.');
    if (novaSenha.length < 4) return alert('A senha deve ter pelo menos 4 caracteres.');

    setAlterandoSenha(true);
    try {
      await axios.put(`${API_URL}/usuarios/alterar-senha`, { senhaAtual, novaSenha }, getHeaders());
      alert('✅ Senha alterada com sucesso!');
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao alterar a senha.');
    } finally {
      setAlterandoSenha(false);
    }
  }

  async function handleCriarUsuario(e) {
    e.preventDefault();
    setSalvandoUser(true);
    try {
      await axios.post(`${API_URL}/usuarios`, {
        nome: novoNome, login: novoLogin, senha: novaSenhaUser, perfil: novoPerfil
      }, getHeaders());
      
      alert('Usuário criado com sucesso!');
      setMostrarModalNovoUser(false);
      setNovoNome(''); setNovoLogin(''); setNovaSenhaUser(''); setNovoPerfil('vendedor');
      carregarEquipe();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao criar usuário.');
    } finally {
      setSalvandoUser(false);
    }
  }

  // --- LÓGICA DE ATIVAR/DESATIVAR USUÁRIO ---
  async function alternarStatusUsuario(id, statusAtual) {
    const acao = statusAtual ? 'desativar' : 'ativar';
    const confirmacao = window.confirm(`Tem certeza que deseja ${acao} este usuário? Ele ${statusAtual ? 'não poderá mais logar' : 'voltará a ter acesso'} no sistema.`);
    
    if (!confirmacao) return;

    try {
      await axios.put(`${API_URL}/usuarios/${id}/status`, { ativo: !statusAtual }, getHeaders());
      carregarEquipe();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao alterar status do usuário.');
    }
  }

  return (
    <>
      <Header titulo="Configurações da Conta" />
      <PageContainer>
        <TopSection>
          <div>
            <Title>Ajustes do Sistema</Title>
            <Subtitle>Gerencie o seu perfil, segurança e acessos da equipe.</Subtitle>
            
            <TabsContainer>
              <TabButton $active={abaAtiva === 'perfil'} onClick={() => setAbaAtiva('perfil')}>
                <i className="fa-solid fa-id-badge"></i> Meu Perfil
              </TabButton>
              <TabButton $active={abaAtiva === 'senha'} onClick={() => setAbaAtiva('senha')}>
                <i className="fa-solid fa-lock"></i> Segurança
              </TabButton>
              {perfilUsuario === 'admin' && (
                <TabButton $active={abaAtiva === 'equipe'} onClick={() => setAbaAtiva('equipe')}>
                  <i className="fa-solid fa-users-gear"></i> Equipe
                </TabButton>
              )}
            </TabsContainer>
          </div>
        </TopSection>

        {/* === ABA 1: MEU PERFIL === */}
        {abaAtiva === 'perfil' && (
          <FormPanel>
            <div className="form-header">
              <h3><i className="fa-solid fa-user text-blue"></i> Informações Pessoais</h3>
              <p>Atualize seus dados de contato e foto de exibição.</p>
            </div>
            {carregandoPerfil ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando dados...</div>
            ) : (
              <form onSubmit={handleSalvarPerfil} style={{ padding: '25px' }}>
                <ProfileLayout>
                  <div className="avatar-section">
                    <div className="avatar-preview">
                      {minhaFoto ? <img src={minhaFoto} alt="Avatar" /> : <i className="fa-solid fa-user"></i>}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <SecondaryButton type="button" onClick={() => fileInputRef.current.click()}>
                      <i className="fa-solid fa-camera"></i> Escolher Foto
                    </SecondaryButton>
                    <p className="help-text">Recomendado: 200x200px. Máximo 2MB.</p>
                  </div>

                  <div className="fields-section">
                    <FormGroup>
                      <label>Nome de Exibição *</label>
                      <Input type="text" value={meuNome} onChange={e => setMeuNome(e.target.value)} required />
                    </FormGroup>
                    <FormGrid $columns="1fr 1fr">
                      <FormGroup>
                        <label>E-mail de Contato</label>
                        <Input type="email" value={meuEmail} onChange={e => setMeuEmail(e.target.value)} placeholder="seu@email.com" />
                      </FormGroup>
                      <FormGroup>
                        <label>Telefone / WhatsApp</label>
                        <Input type="text" value={meuTelefone} onChange={e => setMeuTelefone(e.target.value)} placeholder="(XX) 99999-9999" />
                      </FormGroup>
                    </FormGrid>
                  </div>
                </ProfileLayout>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #edf2f9', paddingTop: '20px' }}>
                  <PrimaryButton type="submit" disabled={salvandoPerfil}>
                    {salvandoPerfil ? <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-save"></i> Salvar Perfil</>}
                  </PrimaryButton>
                </div>
              </form>
            )}
          </FormPanel>
        )}

        {/* === ABA 2: SEGURANÇA === */}
        {abaAtiva === 'senha' && (
          <FormPanel>
            <div className="form-header">
              <h3><i className="fa-solid fa-key text-green"></i> Alterar Senha de Acesso</h3>
              <p>Crie uma senha forte e não compartilhe com outras pessoas.</p>
            </div>
            <form onSubmit={handleAlterarSenha} style={{ padding: '25px' }}>
              <FormGroup>
                <label>Senha Atual *</label>
                <Input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required placeholder="Digite sua senha atual" />
              </FormGroup>
              <FormGrid $columns="1fr 1fr">
                <FormGroup>
                  <label>Nova Senha *</label>
                  <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required placeholder="No mínimo 4 caracteres" className="highlight-blue" />
                </FormGroup>
                <FormGroup>
                  <label>Confirmar Nova Senha *</label>
                  <Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required placeholder="Repita a nova senha" className={confirmarSenha && novaSenha !== confirmarSenha ? 'error' : 'highlight-blue'} />
                  {confirmarSenha && novaSenha !== confirmarSenha && <span className="error-text">As senhas não conferem.</span>}
                </FormGroup>
              </FormGrid>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <PrimaryButton type="submit" disabled={alterandoSenha}>
                  {alterandoSenha ? <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-save"></i> Atualizar Senha</>}
                </PrimaryButton>
              </div>
            </form>
          </FormPanel>
        )}

        {/* === ABA 3: EQUIPE === */}
        {abaAtiva === 'equipe' && perfilUsuario === 'admin' && (
          <Panel>
            <PanelHeader>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2c3e50' }}><i className="fa-solid fa-user-tie text-blue"></i> Colaboradores do CRM</h3>
              <PrimaryButton onClick={() => setMostrarModalNovoUser(true)}>
                <i className="fa-solid fa-user-plus"></i> Novo Usuário
              </PrimaryButton>
            </PanelHeader>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Acesso</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregandoEquipe ? (
                    <tr><td colSpan="3" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando equipe...</td></tr>
                  ) : equipe.length === 0 ? (
                    <tr><td colSpan="3" className="text-center text-muted">Nenhum colaborador encontrado.</td></tr>
                  ) : (
                    equipe.map(user => {
                      const isAtivo = user.ativo !== false; // Se for nulo/true, é ativo
                      return (
                        <tr key={user.id} style={{ opacity: isAtivo ? 1 : 0.5, background: isAtivo ? 'transparent' : '#f8fafc' }}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ textDecoration: isAtivo ? 'none' : 'line-through' }}>{user.nome}</strong>
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>{user.login}</span>
                            </div>
                          </td>
                          <td>
                            <Badge className={user.perfil === 'admin' ? 'badge-admin' : 'badge-vendedor'}>
                              {user.perfil === 'admin' ? '⭐ Administrador' : 'Vendedor'}
                            </Badge>
                            {!isAtivo && <Badge className="badge-danger" style={{ marginLeft: '10px' }}>Inativo</Badge>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <ActionButton 
                              $isAtivo={isAtivo} 
                              onClick={() => alternarStatusUsuario(user.id, isAtivo)}
                              title={isAtivo ? "Desativar Acesso" : "Reativar Acesso"}
                            >
                              <i className={`fa-solid ${isAtivo ? 'fa-ban' : 'fa-check-circle'}`}></i>
                            </ActionButton>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </Table>
            </TableContainer>
          </Panel>
        )}

        {/* MODAL DE NOVO USUÁRIO */}
        {mostrarModalNovoUser && (
          <ModalOverlay onClick={() => setMostrarModalNovoUser(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <h3 style={{ margin: 0 }}><i className="fa-solid fa-user-plus text-blue"></i> Adicionar Colaborador</h3>
                <CloseButton onClick={() => setMostrarModalNovoUser(false)}>&times;</CloseButton>
              </ModalHeader>
              <form onSubmit={handleCriarUsuario}>
                <div style={{ padding: '25px' }}>
                  <FormGroup>
                    <label>Nome Completo *</label>
                    <Input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} required placeholder="Ex: João da Silva" />
                  </FormGroup>

                  <FormGrid $columns="1fr 1fr">
                    <FormGroup>
                      <label>Login de Acesso (Usuário) *</label>
                      <Input type="text" value={novoLogin} onChange={e => setNovoLogin(e.target.value.toLowerCase().replace(/\s+/g, ''))} required placeholder="Ex: joao.vendas" />
                    </FormGroup>
                    <FormGroup>
                      <label>Senha Inicial *</label>
                      <Input type="text" value={novaSenhaUser} onChange={e => setNovaSenhaUser(e.target.value)} required placeholder="Crie uma senha..." />
                    </FormGroup>
                  </FormGrid>

                  <FormGroup>
                    <label>Nível de Acesso (Perfil) *</label>
                    <Select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)}>
                      <option value="vendedor">Vendedor / Operador (Acesso restrito ao funil)</option>
                      <option value="admin">Administrador (Acesso total)</option>
                    </Select>
                  </FormGroup>
                </div>
                <ModalFooter>
                  <SecondaryButton type="button" onClick={() => setMostrarModalNovoUser(false)}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit" disabled={salvandoUser}>
                    {salvandoUser ? 'Criando...' : 'Criar Colaborador'}
                  </PrimaryButton>
                </ModalFooter>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}

      </PageContainer>
    </>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================
const PageContainer = styled.div`
  padding: 30px; background-color: #f4f7f6; min-height: calc(100vh - 70px);
`;
const TopSection = styled.div`
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;
`;
const Title = styled.h2`
  margin: 0; color: #2c3e50; font-size: 1.8rem; font-weight: 700;
`;
const Subtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin: 5px 0 0 0;
`;
const TabsContainer = styled.div`
  display: flex; gap: 10px; margin-top: 15px;
`;
const TabButton = styled.button`
  padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;
  background: ${props => props.$active ? '#1F4E79' : '#e9ecef'}; color: ${props => props.$active ? '#ffffff' : '#6c757d'};
  &:hover { background: ${props => props.$active ? '#1F4E79' : '#dde2e6'}; }
`;

const ProfileLayout = styled.div`
  display: flex; gap: 40px; align-items: flex-start;
  @media (max-width: 768px) { flex-direction: column; align-items: center; gap: 20px;}
  .avatar-section { display: flex; flex-direction: column; align-items: center; gap: 15px; width: 200px;
    .avatar-preview { width: 150px; height: 150px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      img { width: 100%; height: 100%; object-fit: cover; } i { font-size: 4rem; color: #94a3b8; } }
    .help-text { font-size: 0.75rem; color: #94a3b8; text-align: center; margin: 0;} }
  .fields-section { flex: 1; width: 100%; }
`;

const Panel = styled.div`
  background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; overflow: hidden; margin-bottom: 20px;
`;
const PanelHeader = styled.div`
  padding: 20px 25px; border-bottom: 1px solid #edf2f9; display: flex; justify-content: space-between; align-items: center; background: #fbfbfc;
  .text-blue { color: #007bff; }
`;
const TableContainer = styled.div`overflow-x: auto;`;
const Table = styled.table`
  width: 100%; border-collapse: collapse; min-width: 600px;
  th { text-align: left; padding: 15px 25px; background: #ffffff; color: #6c757d; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #edf2f9; }
  td { padding: 15px 25px; border-bottom: 1px solid #edf2f9; color: #2c3e50; vertical-align: middle;}
  tr:last-child td { border-bottom: none; }
  tr:hover td { background-color: #fbfbfc; }
  .text-center { text-align: center; } .text-muted { color: #a0aec0; }
`;

const Badge = styled.span`
  padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
  &.badge-admin { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
  &.badge-vendedor { background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; }
  &.badge-danger { background: #fdf2f2; color: #dc3545; border: 1px solid #f8d7da; }
`;

const ActionButton = styled.button`
  background: none; border: none; font-size: 1.2rem; cursor: pointer; transition: 0.2s; padding: 5px; border-radius: 5px;
  color: ${props => props.$isAtivo ? '#dc3545' : '#28a745'};
  &:hover { background: ${props => props.$isAtivo ? '#fdf2f2' : '#e6f4ea'}; transform: scale(1.1); }
`;

const FormPanel = styled.div`
  background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #edf2f9; overflow: hidden; max-width: 900px;
  .form-header { padding: 25px; border-bottom: 1px solid #edf2f9; background: #fbfbfc; h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;} p { margin: 0; color: #6c757d; font-size: 0.9rem; } .text-green { color: #28a745; } .text-blue { color: #007bff; } }
`;
const FormGrid = styled.div`
  display: grid; grid-template-columns: ${props => props.$columns || '1fr'}; gap: 20px; margin-bottom: 15px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px;
  label { font-weight: 700; font-size: 0.9rem; color: #475569; }
  .error-text { color: #dc3545; font-size: 0.8rem; font-weight: 600; margin-top: 2px;}
`;
const Input = styled.input`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; transition: 0.2s;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  &.highlight-blue { background: #f8fafc; } &.error { border-color: #dc3545; background: #fdf2f2; }
`;
const Select = styled.select`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.95rem; color: #333; outline: none; cursor: pointer; background: #f8fafc;
  &:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;

const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px); padding: 20px;
`;
const ModalContent = styled.div`
  background: #ffffff; border-radius: 12px; width: 100%; max-width: 600px; box-shadow: 0 15px 40px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.2s ease-out;
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #edf2f9; background: #fbfbfc;
  .text-blue { color: #007bff; }
`;
const ModalFooter = styled.div`
  display: flex; justify-content: flex-end; gap: 10px; padding: 20px 25px; border-top: 1px solid #edf2f9; background: #fbfbfc;
`;
const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem; color: #a0aec0; cursor: pointer; line-height: 1; &:hover { color: #dc3545; }
`;

const ButtonBase = styled.button`
  padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const PrimaryButton = styled(ButtonBase)`
  background: #007bff; color: #fff; &:hover:not(:disabled) { background: #0056b3; }
`;
const SecondaryButton = styled(ButtonBase)`
  background: #e2e8f0; color: #475569; &:hover:not(:disabled) { background: #cbd5e1; }
`;