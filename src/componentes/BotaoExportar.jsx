import { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { getAuthHeaders } from '../utils/auth';
import {
  downloadJson,
  exportarLinhasComoCsv,
  flattenExportCampanha,
  flattenExportContatos,
  flattenExportEmpresas,
  flattenExportOportunidades,
} from '../utils/exportarCsv';

const API_URL = import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';

const FLATTENERS = {
  empresas: flattenExportEmpresas,
  contatos: flattenExportContatos,
  oportunidades: flattenExportOportunidades,
  campanha: flattenExportCampanha,
};

export function BotaoExportar({
  tipo,
  params = {},
  label = 'Exportar',
  className = '',
  mostrarJson = false,
  compact = false,
}) {
  const [exportando, setExportando] = useState(false);

  async function buscarDados() {
    let url = '';
    if (tipo === 'empresas') url = `${API_URL}/export/empresas`;
    else if (tipo === 'contatos') url = `${API_URL}/export/contatos`;
    else if (tipo === 'oportunidades') url = `${API_URL}/export/oportunidades`;
    else if (tipo === 'campanha') url = `${API_URL}/export/campanha/${params.campanha_id}`;
    else throw new Error('Tipo de exportação inválido');

    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    );
    const res = await axios.get(url, { ...getAuthHeaders(), params: query });
    return res.data;
  }

  async function exportar(formato) {
    setExportando(true);
    try {
      const payload = await buscarDados();
      const data = new Date().toISOString().slice(0, 10);
      if (formato === 'json') {
        downloadJson(payload, `export_${tipo}_${data}.json`);
        return;
      }
      const flatten = FLATTENERS[tipo];
      const linhas = flatten ? flatten(payload) : [];
      if (!linhas.length) {
        alert('Nenhum dado encontrado para exportar com os filtros atuais.');
        return;
      }
      exportarLinhasComoCsv(linhas, `export_${tipo}`);
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
        localStorage.clear();
        window.location.href = '/login';
        return;
      }
      const msg = err.response?.data?.erro || err.response?.data?.detalhe || 'Erro ao exportar dados.';
      alert(msg);
    } finally {
      setExportando(false);
    }
  }

  if (compact) {
    return (
      <BtnCompact
        type="button"
        className={className}
        disabled={exportando}
        onClick={() => exportar('csv')}
        title="Exportar esta etapa (CSV)"
      >
        {exportando ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-download" />}
      </BtnCompact>
    );
  }

  return (
    <Wrapper className={className}>
      <Btn type="button" disabled={exportando} onClick={() => exportar('csv')} title="Planilha CSV com notas, tarefas e vínculos">
        {exportando ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-file-csv" />}
        {label}
      </Btn>
      {mostrarJson && (
        <BtnSec type="button" disabled={exportando} onClick={() => exportar('json')} title="JSON completo com todos os detalhes">
          <i className="fa-solid fa-file-code" /> JSON
        </BtnSec>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Btn = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #198754;
  background: #e6f4ea;
  color: #195326;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #d1e7dd; }
`;

const BtnCompact = styled.button`
  border: none;
  background: rgba(255,255,255,0.15);
  color: inherit;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  &:disabled { opacity: 0.5; }
  &:hover:not(:disabled) { background: rgba(255,255,255,0.25); }
`;

const BtnSec = styled(Btn)`
  border-color: #64748b;
  background: #f1f5f9;
  color: #475569;
  padding: 10px 12px;
  &:hover:not(:disabled) { background: #e2e8f0; }
`;
