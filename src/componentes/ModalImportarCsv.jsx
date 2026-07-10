import { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { getAuthHeaders } from '../utils/auth';
import { parseCsv, downloadTexto } from '../utils/exportarCsv';

const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

/**
 * Modal genérico de importação via CSV (Excel ou formato compatível), com
 * validação prévia obrigatória: primeiro mostra o preview do que vai ser
 * criado/atualizado e os erros encontrados, só grava no banco depois que o
 * usuário confirmar.
 */
export function ModalImportarCsv({ aberto, onFechar, endpoint, titulo, colunasModelo, onImportado }) {
  const [etapa, setEtapa] = useState('selecionar'); // selecionar | preview | concluido
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');

  if (!aberto) return null;

  function baixarModelo() {
    const cabecalho = colunasModelo.join(',');
    downloadTexto(cabecalho + '\n', `modelo_importacao.csv`);
  }

  function handleArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setNomeArquivo(arquivo.name);
    setErroGeral('');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const texto = evt.target.result;
      const linhasParsed = parseCsv(texto);
      if (!linhasParsed.length) {
        setErroGeral('Não foi possível ler nenhuma linha válida deste arquivo. Confira se é um CSV com cabeçalho na primeira linha.');
        return;
      }
      setLinhas(linhasParsed);
      await validar(linhasParsed);
    };
    reader.readAsText(arquivo, 'utf-8');
  }

  async function validar(linhasParaValidar) {
    setProcessando(true);
    setErroGeral('');
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { linhas: linhasParaValidar, confirmar: false }, getAuthHeaders());
      setResultado(res.data);
      setEtapa('preview');
    } catch (err) {
      setErroGeral(err.response?.data?.erro || 'Erro ao validar o arquivo.');
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarImportacao() {
    setProcessando(true);
    setErroGeral('');
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { linhas, confirmar: true }, getAuthHeaders());
      setResultado(res.data);
      setEtapa('concluido');
      onImportado?.();
    } catch (err) {
      setErroGeral(err.response?.data?.erro || 'Erro ao importar o arquivo.');
    } finally {
      setProcessando(false);
    }
  }

  function reiniciar() {
    setEtapa('selecionar');
    setNomeArquivo('');
    setLinhas([]);
    setResultado(null);
    setErroGeral('');
  }

  function fechar() {
    reiniciar();
    onFechar();
  }

  return (
    <Overlay onClick={fechar}>
      <Conteudo onClick={(e) => e.stopPropagation()}>
        <Cabecalho>
          <h3><i className="fa-solid fa-file-csv"></i> {titulo}</h3>
          <Fechar onClick={fechar}>&times;</Fechar>
        </Cabecalho>

        <Corpo>
          {etapa === 'selecionar' && (
            <>
              <p>Envie um arquivo CSV (pode ser um .csv exportado ou salvo do Excel). A primeira linha deve ser o cabeçalho com os nomes das colunas.</p>
              <BotaoModelo type="button" onClick={baixarModelo}>
                <i className="fa-solid fa-download"></i> Baixar modelo de planilha (.csv)
              </BotaoModelo>
              <InputArquivo type="file" accept=".csv,text/csv" onChange={handleArquivo} />
              {nomeArquivo && <p className="arquivo-nome">Arquivo: {nomeArquivo}</p>}
              {processando && <p><i className="fa-solid fa-spinner fa-spin"></i> Validando...</p>}
              {erroGeral && <Aviso className="erro">{erroGeral}</Aviso>}
            </>
          )}

          {etapa === 'preview' && resultado && (
            <>
              <ResumoGrid>
                <ResumoItem className="criar">
                  <strong>{resultado.criar}</strong>
                  <span>Novo(s) registro(s)</span>
                </ResumoItem>
                <ResumoItem className="atualizar">
                  <strong>{resultado.atualizar}</strong>
                  <span>Serão atualizados</span>
                </ResumoItem>
                <ResumoItem className={resultado.erros.length ? 'erro' : ''}>
                  <strong>{resultado.erros.length}</strong>
                  <span>Linha(s) com erro (ignoradas)</span>
                </ResumoItem>
              </ResumoGrid>

              {resultado.erros.length > 0 && (
                <ListaErros>
                  {resultado.erros.map((e, i) => (
                    <li key={i}><strong>Linha {e.linha}:</strong> {e.erro}</li>
                  ))}
                </ListaErros>
              )}

              {(resultado.criar + resultado.atualizar) === 0 ? (
                <Aviso className="erro">Nenhuma linha válida para importar. Corrija o arquivo e tente novamente.</Aviso>
              ) : (
                <Aviso>Nada foi salvo ainda. Confira o resumo acima e confirme para gravar no banco.</Aviso>
              )}

              {erroGeral && <Aviso className="erro">{erroGeral}</Aviso>}
            </>
          )}

          {etapa === 'concluido' && resultado && (
            <>
              <Aviso className="sucesso">
                <i className="fa-solid fa-circle-check"></i> Importação concluída: {resultado.criar} criado(s) e {resultado.atualizar} atualizado(s).
              </Aviso>
              {resultado.erros.length > 0 && (
                <>
                  <p>Linhas ignoradas por erro:</p>
                  <ListaErros>
                    {resultado.erros.map((e, i) => (
                      <li key={i}><strong>Linha {e.linha}:</strong> {e.erro}</li>
                    ))}
                  </ListaErros>
                </>
              )}
            </>
          )}
        </Corpo>

        <Rodape>
          {etapa === 'preview' && (
            <>
              <BotaoSecundario type="button" onClick={reiniciar}>Escolher outro arquivo</BotaoSecundario>
              <BotaoPrimario
                type="button"
                disabled={processando || (resultado.criar + resultado.atualizar) === 0}
                onClick={confirmarImportacao}
              >
                {processando ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Confirmar importação
              </BotaoPrimario>
            </>
          )}
          {etapa === 'concluido' && (
            <BotaoPrimario type="button" onClick={fechar}>Fechar</BotaoPrimario>
          )}
          {etapa === 'selecionar' && (
            <BotaoSecundario type="button" onClick={fechar}>Cancelar</BotaoSecundario>
          )}
        </Rodape>
      </Conteudo>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex;
  align-items: center; justify-content: center; z-index: 10000; padding: 16px;
`;
const Conteudo = styled.div`
  background: #fff; border-radius: 12px; width: 100%; max-width: 560px; max-height: 85vh;
  display: flex; flex-direction: column; overflow: hidden;
`;
const Cabecalho = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 18px 22px;
  border-bottom: 1px solid #edf2f9;
  h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
`;
const Fechar = styled.button`
  background: none; border: none; font-size: 1.6rem; line-height: 1; cursor: pointer; color: #94a3b8;
`;
const Corpo = styled.div`
  padding: 20px 22px; overflow-y: auto; flex: 1;
  p { color: #475569; font-size: 0.9rem; }
  .arquivo-nome { font-weight: 600; color: #1F4E79; }
`;
const Rodape = styled.div`
  display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid #edf2f9;
`;
const BotaoModelo = styled.button`
  background: #eef6ff; color: #1e3a8a; border: 1px solid #bfdbfe; border-radius: 8px;
  padding: 10px 14px; font-weight: 600; cursor: pointer; margin-bottom: 14px;
  display: inline-flex; align-items: center; gap: 8px;
  &:hover { background: #dbeafe; }
`;
const InputArquivo = styled.input`
  display: block; width: 100%; margin-top: 4px;
`;
const ResumoGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;
`;
const ResumoItem = styled.div`
  background: #f8fafc; border-radius: 10px; padding: 12px; text-align: center;
  strong { display: block; font-size: 1.4rem; color: #1F4E79; }
  span { font-size: 0.75rem; color: #64748b; }
  &.criar strong { color: #198754; }
  &.atualizar strong { color: #0d6efd; }
  &.erro strong { color: #dc3545; }
`;
const ListaErros = styled.ul`
  background: #fff5f5; border: 1px solid #f8d7da; border-radius: 8px; padding: 10px 14px 10px 30px;
  margin: 0 0 14px; max-height: 180px; overflow-y: auto;
  li { color: #991b1b; font-size: 0.82rem; margin-bottom: 4px; }
`;
const Aviso = styled.p`
  background: #f1f5f9; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem !important;
  &.erro { background: #fff5f5; color: #991b1b !important; }
  &.sucesso { background: #e6f4ea; color: #195326 !important; }
`;
const ButtonBase = styled.button`
  padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; border: none;
  display: inline-flex; align-items: center; gap: 8px;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const BotaoPrimario = styled(ButtonBase)`
  background: #1F4E79; color: #fff;
  &:hover:not(:disabled) { background: #163a5c; }
`;
const BotaoSecundario = styled(ButtonBase)`
  background: #f1f5f9; color: #475569;
  &:hover:not(:disabled) { background: #e2e8f0; }
`;
