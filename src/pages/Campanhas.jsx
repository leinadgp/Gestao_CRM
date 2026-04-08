import { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Header } from '../componentes/Header.jsx';

export function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Controle das abas de visualização
  const [abaAtiva, setAbaAtiva] = useState('ativas'); // 'ativas' ou 'arquivadas'

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [informacaoExtra, setInformacaoExtra] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cargosAlvo, setCargosAlvo] = useState([]);
  const listaCargosDisponiveis = ['Prefeito', 'Secretário', 'Licita', 'CI-R', 'CI-E', 'Teste'];

  const etapasPadrao = ['CONTATO 1° E-MAIL', 'CONTATO TEL.', 'IDENTIFICAÇÃO DO INTERESSE', 'NÃO QUER LIGAÇÃO', 'VENDA REALIZADA', 'PERDIDO'];
  const [etapas, setEtapas] = useState(etapasPadrao);
  const [novaEtapa, setNovaEtapa] = useState('');

  const [modulos, setModulos] = useState([]);
  const [modNome, setModNome] = useState('');
  const [modValor, setModValor] = useState(''); 
  const [modEvento, setModEvento] = useState('');
  const [modEventoFim, setModEventoFim] = useState(''); 

  // Estados para a Trava de Segurança (Exclusão Matemática)
  const [modalExcluir, setModalExcluir] = useState(false);
  const [campanhaExcluir, setCampanhaExcluir] = useState(null);
  const [contaMath, setContaMath] = useState({ a: 0, b: 0, resultado: 0 });
  const [respostaMath, setRespostaMath] = useState('');

  const API_URL = 'https://server-js-gestao.onrender.com';

  function getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => { carregarCampanhas(); }, []);

  async function carregarCampanhas() {
    try {
      const res = await axios.get(`${API_URL}/campanhas`, getHeaders());
      const campanhasComModulos = await Promise.all(res.data.map(async (camp) => {
        const resMods = await axios.get(`${API_URL}/campanhas/${camp.id}/modulos`, getHeaders());
        return { ...camp, listaModulos: resMods.data };
      }));
      setCampanhas(campanhasComModulos);
    } catch (erro) { console.error(erro); }
  }

  function formatarMoeda(valor) { 
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
  }

  function abrirModalNovo() {
    setEditandoId(null); 
    setNome(''); 
    setDescricao(''); 
    setInformacaoExtra('');
    setDataInicio(''); 
    setDataFim(''); 
    setCargosAlvo([]);
    setEtapas(etapasPadrao); 
    setModulos([]); 
    setMostrarModal(true);
  }

  function abrirModalEdicao(camp) {
    setEditandoId(camp.id); 
    setNome(camp.nome); 
    setDescricao(camp.descricao || '');
    setInformacaoExtra(camp.informacao_extra || '');
    setDataInicio(camp.data_inicio ? camp.data_inicio.split('T')[0] : '');
    setDataFim(camp.data_fim ? camp.data_fim.split('T')[0] : '');
    
    let cargosSalvos = [];
    try { if (camp.cargos_alvo) cargosSalvos = typeof camp.cargos_alvo === 'string' ? JSON.parse(camp.cargos_alvo) : camp.cargos_alvo; } catch(e) {}
    setCargosAlvo(cargosSalvos || []);
    
    const modsFormatados = (camp.listaModulos || []).map(m => ({
      id: m.id, nome: m.nome, valor: m.valor,
      data_evento: m.data_evento ? m.data_evento.split('T')[0] : '',
      data_evento_fim: m.data_evento_fim ? m.data_evento_fim.split('T')[0] : ''
    }));
    setModulos(modsFormatados); setMostrarModal(true);
  }

  function toggleCargo(cargo) { 
    setCargosAlvo(prev => prev.includes(cargo) ? prev.filter(c => c !== cargo) : [...prev, cargo]); 
  }
  function adicionarEtapa() { 
    if (novaEtapa.trim() !== '') { setEtapas([...etapas, novaEtapa]); setNovaEtapa(''); } 
  }
  function removerEtapa(index) { 
    const novas = [...etapas]; novas.splice(index, 1); setEtapas(novas); 
  }

  function adicionarModulo() {
    if (!modNome.trim()) return alert('O nome do módulo é obrigatório.');
    setModulos([...modulos, { 
      nome: modNome, valor: modValor ? parseFloat(modValor) : 0,
      data_evento: modEvento || null, data_evento_fim: modEventoFim || null 
    }]);
    setModNome(''); setModValor(''); setModEvento(''); setModEventoFim('');
  }

  function removerModulo(index) { 
    const novos = [...modulos]; novos.splice(index, 1); setModulos(novos); 
  }
  function atualizarModulo(index, campo, valorCampo) {
    const novos = [...modulos];
    novos[index][campo] = campo === 'valor' ? (parseFloat(valorCampo) || 0) : valorCampo;
    setModulos(novos);
  }

  async function salvarCampanha(e) {
    e.preventDefault();
    if (!editandoId && etapas.length === 0) return alert('Adicione pelo menos uma etapa para o funil.');
    
    const payload = { 
        nome, 
        descricao, 
        informacao_extra: informacaoExtra, 
        data_inicio: dataInicio || null, 
        data_fim: dataFim || null, 
        cargos_alvo: cargosAlvo, 
        modulos 
    };
    
    try {
      if (editandoId) { 
        await axios.put(`${API_URL}/campanhas/${editandoId}`, payload, getHeaders()); 
      } else { 
        await axios.post(`${API_URL}/campanhas`, { ...payload, etapas }, getHeaders()); 
      }
      setMostrarModal(false); 
      carregarCampanhas();
    } catch (erro) { 
      console.error(erro);
      alert(erro.response?.data?.erro || 'Erro ao salvar configurações da campanha.'); 
    }
  }

  // --- LÓGICA DE ARQUIVAR ---
  async function alternarArquivamento(id, statusAtualArquivado) {
    const acao = statusAtualArquivado ? 'desarquivar' : 'arquivar';
    if (!window.confirm(`Tem certeza que deseja ${acao} este curso?`)) return;

    try {
      await axios.put(`${API_URL}/campanhas/${id}/arquivar`, { arquivada: !statusAtualArquivado }, getHeaders());
      carregarCampanhas();
    } catch (error) {
      alert('Erro ao alterar status de arquivamento.');
    }
  }

  // --- LÓGICA DE EXCLUSÃO COM SEGURANÇA MATEMÁTICA ---
  function iniciarExclusao(camp) {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setContaMath({ a, b, resultado: a + b });
    setRespostaMath('');
    setCampanhaExcluir(camp);
    setModalExcluir(true);
  }

  async function processarExclusao(e) {
    e.preventDefault();
    if (parseInt(respostaMath) !== contaMath.resultado) {
      return alert('O cálculo matemático está incorreto. Tente novamente.');
    }

    try { 
      await axios.delete(`${API_URL}/campanhas/${campanhaExcluir.id}`, getHeaders()); 
      setModalExcluir(false);
      carregarCampanhas(); 
      alert('Campanha excluída definitivamente!');
    } catch (error) { 
      console.error(error); 
      alert(error.response?.data?.erro || 'O banco de dados bloqueou a exclusão porque existem clientes atrelados a esta campanha.'); 
    }
  }

  function formatarDataBR(dataIso) {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR');
  }

  const campanhasFiltradas = campanhas.filter(camp => 
    abaAtiva === 'arquivadas' ? camp.arquivada === true : (camp.arquivada === false || camp.arquivada === null)
  );

  return (
    <>
      <Header titulo="Gestão de Cursos / Campanhas" />
      <PageContainer>
        
        <TopSection>
          <div>
            <Title>Cursos e Lançamentos</Title>
            <Subtitle>Configure os cursos, público-alvo e módulos.</Subtitle>
            
            <TabsContainer>
              <TabButton $active={abaAtiva === 'ativas'} onClick={() => setAbaAtiva('ativas')}>
                <i className="fa-solid fa-folder-open"></i> Cursos Ativos
              </TabButton>
              <TabButton $active={abaAtiva === 'arquivadas'} onClick={() => setAbaAtiva('arquivadas')}>
                <i className="fa-solid fa-box-archive"></i> Arquivados
              </TabButton>
            </TabsContainer>
          </div>

          <PrimaryButton onClick={abrirModalNovo}>
            <i className="fa-solid fa-plus"></i> Novo Curso
          </PrimaryButton>
        </TopSection>

        {campanhasFiltradas.length === 0 ? (
          <EmptyState>
            <i className="fa-solid fa-folder-open"></i>
            Nenhuma campanha encontrada nesta categoria.
          </EmptyState>
        ) : (
          <CampaignsGrid>
            {campanhasFiltradas.map(camp => (
              <CampaignCard key={camp.id} $arquivada={abaAtiva === 'arquivadas'}>
                <CardHeader>
                  <CardTitle $arquivada={abaAtiva === 'arquivadas'}>
                    <i className="fa-solid fa-graduation-cap"></i> {camp.nome}
                  </CardTitle>
                  <CardActions>
                    <IconButton onClick={() => alternarArquivamento(camp.id, camp.arquivada)} title={camp.arquivada ? "Desarquivar" : "Arquivar"}>
                      <i className={`fa-solid ${camp.arquivada ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                    </IconButton>
                    <IconButton onClick={() => abrirModalEdicao(camp)} className="edit" title="Editar">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </IconButton>
                    <IconButton onClick={() => iniciarExclusao(camp)} className="delete" title="Excluir Definitivamente">
                      <i className="fa-solid fa-trash"></i>
                    </IconButton>
                  </CardActions>
                </CardHeader>
                
                <CardDescription>{camp.descricao || 'Sem descrição definida.'}</CardDescription>

                <CardDates>
                  <div><i className="fa-solid fa-play text-green"></i> Início: {formatarDataBR(camp.data_inicio)}</div>
                  <div><i className="fa-solid fa-stop text-red"></i> Fim: {formatarDataBR(camp.data_fim)}</div>
                </CardDates>

                <ModulesSection>
                  <h4 className="section-title"><i className="fa-solid fa-calendar-days"></i> Turmas / Módulos ({camp.listaModulos?.length || 0})</h4>
                  {camp.listaModulos?.length > 0 ? (
                    <div className="modules-list">
                      {camp.listaModulos.map(mod => (
                        <ModuleItem key={mod.id}>
                          <span className="module-name">{mod.nome}</span>
                          <span className="module-price">{formatarMoeda(mod.valor)}</span>
                        </ModuleItem>
                      ))}
                    </div>
                  ) : (<span className="empty-text">Nenhum módulo.</span>)}
                </ModulesSection>
              </CampaignCard>
            ))}
          </CampaignsGrid>
        )}

        {/* MODAL DE CONTA MATEMÁTICA PARA EXCLUSÃO */}
        {modalExcluir && (
          <ModalOverlay onClick={() => setModalExcluir(false)}>
            <ModalContent $small onClick={e => e.stopPropagation()}>
              <MathWarningIcon className="fa-solid fa-triangle-exclamation" />
              <MathTitle>Confirmação de Exclusão</MathTitle>
              <MathSubtitle>
                Você está prestes a excluir o curso <strong>{campanhaExcluir?.nome}</strong> e todas as suas etapas e módulos.<br/>Esta ação não pode ser desfeita.
              </MathSubtitle>
              
              <MathBox>
                <label>Para confirmar, resolva o cálculo abaixo:</label>
                <div className="equation">
                  <span>{contaMath.a}</span> + <span>{contaMath.b}</span> = 
                  <input 
                    type="number" 
                    value={respostaMath} 
                    onChange={e => setRespostaMath(e.target.value)} 
                    autoFocus
                  />
                </div>
              </MathBox>

              <ModalFooter>
                <SecondaryButton onClick={() => setModalExcluir(false)}>Cancelar</SecondaryButton>
                <DangerButton onClick={processarExclusao}>Excluir Curso</DangerButton>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* MODAL PADRÃO DE CRIAÇÃO / EDIÇÃO */}
        {mostrarModal && (
          <ModalOverlay onClick={() => setMostrarModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              
              <ModalHeader>
                <h3>{editandoId ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                <CloseButton onClick={() => setMostrarModal(false)}>&times;</CloseButton>
              </ModalHeader>

              <form onSubmit={salvarCampanha}>
                <FormGroup>
                  <Label>Nome do Curso/Campanha *</Label>
                  <Input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                </FormGroup>
                  
                <SectionCard $bgColor="#f0f4f8" $borderColor="#d0d7de">
                  <SectionTitle $color="#1F4E79"><i className="fa-solid fa-users-gear"></i> Automação: Público e Validade</SectionTitle>
                  
                  <FormGrid $columns="1fr 1fr">
                    <FormGroup className="span-2">
                      <Label>Quais Cargos receberão a campanha? (Múltipla escolha)</Label>
                      <CheckboxGroup>
                        {listaCargosDisponiveis.map(cargo => (
                          <CheckboxPill key={cargo} $active={cargosAlvo.includes(cargo)}>
                            <input type="checkbox" checked={cargosAlvo.includes(cargo)} onChange={() => toggleCargo(cargo)} />
                            {cargo}
                          </CheckboxPill>
                        ))}
                      </CheckboxGroup>
                    </FormGroup>
                    
                    <FormGroup>
                      <Label $color="#28a745">Data de Início</Label>
                      <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                      <Label $color="#dc3545">Data Limite (Fim)</Label>
                      <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                    </FormGroup>
                  </FormGrid>
                </SectionCard>

                <FormGroup>
                  <Label>Descrição Breve</Label>
                  <TextArea value={descricao} onChange={e => setDescricao(e.target.value)} rows="2" />
                </FormGroup>

                <FormGroup>
                  <Label>Informação Extra</Label>
                  <TextArea value={informacaoExtra} onChange={e => setInformacaoExtra(e.target.value)} placeholder="Use este espaço para links, detalhes ou observações..." rows="3" />
                </FormGroup>

                <SectionCard $bgColor="#f4fbf5" $borderColor="#c3e6cb">
                  <SectionTitle $color="#28a745"><i className="fa-solid fa-calendar-days"></i> Gerenciar Módulos e Preços</SectionTitle>
                  
                  <ModuleInputGrid>
                    <FormGroup><Label $small>Novo Módulo</Label><Input type="text" value={modNome} onChange={e => setModNome(e.target.value)} placeholder="Nome" /></FormGroup>
                    <FormGroup><Label $small $color="#007bff">Preço</Label><Input type="number" step="0.01" value={modValor} onChange={e => setModValor(e.target.value)} /></FormGroup>
                    <FormGroup><Label $small>Início da Aula</Label><Input type="date" value={modEvento} onChange={e => setModEvento(e.target.value)} /></FormGroup>
                    <FormGroup><Label $small>Fim da Aula</Label><Input type="date" value={modEventoFim} onChange={e => setModEventoFim(e.target.value)} /></FormGroup>
                    <AddButton type="button" onClick={adicionarModulo}>+ ADD</AddButton>
                  </ModuleInputGrid>
                  
                  {modulos.length > 0 && (
                    <ModulesList>
                      {modulos.map((mod, index) => (
                        <ModuleRow key={index}>
                          <Input type="text" value={mod.nome} onChange={e => atualizarModulo(index, 'nome', e.target.value)} />
                          <Input type="number" step="0.01" value={mod.valor} onChange={e => atualizarModulo(index, 'valor', e.target.value)} className="highlight" />
                          <Input type="date" value={mod.data_evento || ''} onChange={e => atualizarModulo(index, 'data_evento', e.target.value)} title="Data Início" />
                          <Input type="date" value={mod.data_evento_fim || ''} onChange={e => atualizarModulo(index, 'data_evento_fim', e.target.value)} title="Data Fim" />
                          <IconButton type="button" className="delete" onClick={() => removerModulo(index)}>
                            <i className="fa-solid fa-times-circle"></i>
                          </IconButton>
                        </ModuleRow>
                      ))}
                    </ModulesList>
                  )}
                </SectionCard>

                {!editandoId && (
                  <SectionCard $bgColor="#f8f9fa" $borderColor="#eee">
                    <SectionTitle $color="#007bff"><i className="fa-solid fa-list-ol"></i> Etapas do Funil</SectionTitle>
                    
                    <AddStageRow>
                      <Input type="text" value={novaEtapa} onChange={e => setNovaEtapa(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); adicionarEtapa(); }}} placeholder="Nome da nova etapa..." />
                      <SecondaryButton type="button" onClick={adicionarEtapa}>Adicionar</SecondaryButton>
                    </AddStageRow>
                    
                    <StagesList>
                      {etapas.map((etp, index) => (
                        <StageItem key={index}>
                          <span className="stage-name"><span className="stage-index">{index + 1}.</span> {etp}</span>
                          <IconButton type="button" className="delete" onClick={() => removerEtapa(index)}>
                            <i className="fa-solid fa-times"></i>
                          </IconButton>
                        </StageItem>
                      ))}
                    </StagesList>
                  </SectionCard>
                )}

                <ModalFooter>
                  <SecondaryButton type="button" onClick={() => setMostrarModal(false)}>Cancelar</SecondaryButton>
                  <PrimaryButton type="submit">Salvar Configurações</PrimaryButton>
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
  padding: 30px;
  background-color: #f4f7f6;
  min-height: calc(100vh - 70px);
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const Title = styled.h2`
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: #6c757d;
  font-size: 0.95rem;
  margin: 5px 0 0 0;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const TabButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  background: ${props => props.$active ? '#1F4E79' : '#e9ecef'};
  color: ${props => props.$active ? '#ffffff' : '#6c757d'};

  &:hover {
    background: ${props => props.$active ? '#1F4E79' : '#dde2e6'};
  }
`;

const EmptyState = styled.div`
  padding: 50px;
  text-align: center;
  background: #ffffff;
  border: 2px dashed #dce1e6;
  border-radius: 12px;
  color: #a0aec0;
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  i { font-size: 2.5rem; color: #cbd5e1; }
`;

const CampaignsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
`;

const CampaignCard = styled.div`
  background: #ffffff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid #edf2f9;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  opacity: ${props => props.$arquivada ? 0.7 : 1};
  filter: ${props => props.$arquivada ? 'grayscale(20%)' : 'none'};

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const CardTitle = styled.h3`
  margin: 0;
  color: ${props => props.$arquivada ? '#6c757d' : '#007bff'};
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardActions = styled.div`
  display: flex;
  gap: 5px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 6px;
  font-size: 1.1rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover { background: #f8f9fa; color: #343a40; }
  &.edit:hover { color: #ffc107; background: #fffbeb; }
  &.delete:hover { color: #dc3545; background: #fdf5f6; }
`;

const CardDescription = styled.p`
  color: #555;
  font-size: 0.9rem;
  min-height: 40px;
  margin: 0 0 15px 0;
  line-height: 1.4;
`;

const CardDates = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 6px;
  font-weight: 500;
  color: #495057;

  .text-green { color: #28a745; margin-right: 5px; }
  .text-red { color: #dc3545; margin-right: 5px; }
`;

const ModulesSection = styled.div`
  margin-top: 15px;
  border-top: 1px solid #edf2f9;
  padding-top: 15px;

  .section-title {
    margin: 0 0 10px 0;
    color: #2c3e50;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .modules-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-text {
    font-size: 0.85rem;
    color: #a0aec0;
    font-style: italic;
  }
`;

const ModuleItem = styled.div`
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  border-left: 3px solid #28a745;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .module-name { font-weight: 600; color: #333; }
  .module-price { font-weight: 700; color: #28a745; }
`;

// --- MODAIS ---
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #ffffff;
  padding: 30px;
  border-radius: 12px;
  width: 100%;
  max-width: ${props => props.$small ? '420px' : '800px'};
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  border-bottom: 1px solid #edf2f9;
  padding-bottom: 15px;

  h3 { margin: 0; color: #2c3e50; font-size: 1.4rem; }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: ${props => props.$small ? 'space-between' : 'flex-end'};
  gap: 12px;
  margin-top: 25px;
  border-top: 1px solid #edf2f9;
  padding-top: 20px;
`;

const CloseButton = styled.button`
  background: none; border: none; font-size: 1.8rem;
  color: #a0aec0; cursor: pointer; transition: 0.2s;
  line-height: 1;
  &:hover { color: #dc3545; }
`;

// --- FORMULÁRIOS ---
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: 15px;
  
  .span-2 { grid-column: span 2; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: ${props => props.$small ? '0.75rem' : '0.9rem'};
  color: ${props => props.$color || '#495057'};
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  color: #333;
  background-color: #ffffff;
  transition: all 0.2s;

  &:focus {
    outline: none; border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0,123,255,0.15);
  }

  &.highlight {
    border-color: #007bff;
    background-color: #f0f7ff;
  }
`;

const TextArea = styled.textarea`
  width: 100%; padding: 10px 12px; border-radius: 6px;
  border: 1px solid #cbd5e1; font-size: 0.95rem;
  color: #333; background-color: #ffffff; resize: vertical;
  transition: all 0.2s;
  &:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
`;

// --- BLOCOS DE SEÇÃO DO FORMULÁRIO ---
const SectionCard = styled.div`
  background: ${props => props.$bgColor || '#f8f9fa'};
  border: 1px solid ${props => props.$borderColor || '#e9ecef'};
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 15px 0;
  color: ${props => props.$color || '#333'};
  font-size: 1.05rem;
  display: flex; align-items: center; gap: 8px;
`;

// --- BOTÕES GENÉRICOS ---
const ButtonBase = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;

  &:active { transform: scale(0.98); }
`;

const PrimaryButton = styled(ButtonBase)`
  background: #007bff; color: #fff;
  &:hover { background: #0056b3; box-shadow: 0 4px 10px rgba(0,123,255,0.2); }
`;

const SecondaryButton = styled(ButtonBase)`
  background: #e2e8f0; color: #475569;
  &:hover { background: #cbd5e1; }
`;

const DangerButton = styled(ButtonBase)`
  background: #dc3545; color: #fff;
  &:hover { background: #c82333; box-shadow: 0 4px 10px rgba(220,53,69,0.2); }
`;

const AddButton = styled(ButtonBase)`
  background: #28a745; color: #fff; padding: 10px;
  &:hover { background: #218838; }
`;

// --- COMPONENTES ESPECÍFICOS (CHECKBOX PILLS, MODULOS, ETAPAS) ---
const CheckboxGroup = styled.div`
  display: flex; flex-wrap: wrap; gap: 10px;
`;

const CheckboxPill = styled.label`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  
  background: ${props => props.$active ? '#e7f3ff' : '#ffffff'};
  border: 1px solid ${props => props.$active ? '#007bff' : '#cbd5e1'};
  color: ${props => props.$active ? '#007bff' : '#64748b'};

  input { display: none; }

  &:hover {
    background: ${props => props.$active ? '#d6ebff' : '#f8fafc'};
  }
`;

const ModuleInputGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px dashed #c3e6cb;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ModulesList = styled.div`
  display: flex; flexDirection: column; gap: 8px;
`;

const ModuleRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 10px;
  align-items: center;
  background: #ffffff;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AddStageRow = styled.div`
  display: flex; gap: 10px; margin-bottom: 15px;
`;

const StagesList = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;

const StageItem = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  background: #ffffff; padding: 10px 15px;
  border-radius: 6px; border: 1px solid #e2e8f0;

  .stage-name { font-weight: 600; color: #475569; }
  .stage-index { color: #007bff; margin-right: 8px; }
`;

// --- MODAL DE MATEMÁTICA ---
const MathWarningIcon = styled.i`
  font-size: 3.5rem; color: #dc3545; margin-bottom: 15px; display: block;
`;
const MathTitle = styled.h3`
  margin: 0 0 10px 0; color: #2c3e50; font-size: 1.4rem;
`;
const MathSubtitle = styled.p`
  color: #6c757d; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5;
`;
const MathBox = styled.div`
  background: #fff5f5; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb;
  
  label { display: block; font-weight: 600; color: #c82333; margin-bottom: 12px; }
  
  .equation {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    font-size: 1.8rem; font-weight: bold; color: #333;
    
    input {
      width: 80px; padding: 10px; font-size: 1.4rem;
      text-align: center; border: 2px solid #cbd5e1; border-radius: 8px;
      &:focus { border-color: #dc3545; outline: none; box-shadow: 0 0 0 3px rgba(220,53,69,0.15); }
    }
  }
`;