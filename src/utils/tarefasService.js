import axios from 'axios';

const STORAGE_KEY_PREFIX = 'crm_tarefas_';
const LEMBRETE_ANTECEDENCIA_MS = 15 * 60 * 1000;

function storageKey() {
  const usuarioId = localStorage.getItem('usuarioId') || 'anon';
  return `${STORAGE_KEY_PREFIX}${usuarioId}`;
}

function lerLocal() {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarLocal(tarefas) {
  localStorage.setItem(storageKey(), JSON.stringify(tarefas));
  window.dispatchEvent(new CustomEvent('tarefasAtualizadas'));
}

function getApiUrl() {
  return import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
}

function getHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

function gerarId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getLembreteAntecedenciaMs() {
  return LEMBRETE_ANTECEDENCIA_MS;
}

export async function listarTarefasOportunidade(oportunidadeId) {
  const opId = Number(oportunidadeId);
  try {
    const res = await axios.get(
      `${getApiUrl()}/oportunidades/${opId}/tarefas`,
      getHeaders()
    );
    return res.data;
  } catch (erro) {
    if (erro.response?.status === 404) {
      return lerLocal()
        .filter(t => Number(t.oportunidade_id) === opId)
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    }
    throw erro;
  }
}

export async function listarMinhasTarefas() {
  const meuId = localStorage.getItem('usuarioId');
  try {
    const res = await axios.get(`${getApiUrl()}/tarefas/minhas`, getHeaders());
    return res.data;
  } catch (erro) {
    if (erro.response?.status === 404) {
      return lerLocal()
        .filter(t => String(t.criado_por_id) === String(meuId))
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    }
    throw erro;
  }
}

export async function criarTarefa({
  oportunidade_id,
  oportunidade_titulo,
  titulo,
  descricao = '',
  data_hora,
}) {
  const payload = {
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    data_hora,
  };

  const temOportunidade = oportunidade_id !== undefined && oportunidade_id !== null && String(oportunidade_id).trim() !== '';
  if (temOportunidade) {
    payload.oportunidade_id = Number(oportunidade_id);
    payload.oportunidade_titulo = oportunidade_titulo;
  }

  try {
    const endpoint = temOportunidade
      ? `${getApiUrl()}/oportunidades/${payload.oportunidade_id}/tarefas`
      : `${getApiUrl()}/tarefas`;

    const res = await axios.post(endpoint, payload, getHeaders());
    window.dispatchEvent(new CustomEvent('tarefasAtualizadas'));
    return res.data;
  } catch (erro) {
    if (erro.response?.status === 404) {
      const nova = {
        id: gerarId(),
        oportunidade_id: temOportunidade ? Number(oportunidade_id) : null,
        oportunidade_titulo: temOportunidade ? oportunidade_titulo : '',
        titulo: payload.titulo,
        descricao: payload.descricao,
        data_hora,
        criado_por_id: Number(localStorage.getItem('usuarioId')) || null,
        criado_por_nome: localStorage.getItem('nome') || 'Usuário',
        concluida: false,
        criado_em: new Date().toISOString(),
      };
      const todas = lerLocal();
      todas.push(nova);
      salvarLocal(todas);
      return nova;
    }
    throw erro;
  }
}

export async function listarTodasTarefas() {
  try {
    const res = await axios.get(`${getApiUrl()}/tarefas`, getHeaders());
    return res.data;
  } catch (erro) {
    if (erro.response?.status === 404) {
      return lerLocal().sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    }
    throw erro;
  }
}

export async function atualizarTarefa(tarefaId, { titulo, descricao, data_hora }) {
  const payload = {};
  if (titulo !== undefined) payload.titulo = String(titulo).trim();
  if (descricao !== undefined) payload.descricao = String(descricao).trim();
  if (data_hora !== undefined) payload.data_hora = data_hora;

  try {
    const res = await axios.put(
      `${getApiUrl()}/tarefas/${tarefaId}`,
      payload,
      getHeaders()
    );
    window.dispatchEvent(new CustomEvent('tarefasAtualizadas'));
    return res.data;
  } catch (erro) {
    if (erro.response?.status !== 404) throw erro;

    const todas = lerLocal().map(t =>
      t.id === tarefaId
        ? {
            ...t,
            ...(payload.titulo !== undefined ? { titulo: payload.titulo } : {}),
            ...(payload.descricao !== undefined ? { descricao: payload.descricao } : {}),
            ...(payload.data_hora !== undefined ? { data_hora: payload.data_hora } : {}),
          }
        : t
    );
    salvarLocal(todas);
    return todas.find(t => t.id === tarefaId);
  }
}

export async function concluirTarefa(tarefaId) {
  try {
    const res = await axios.put(
      `${getApiUrl()}/tarefas/${tarefaId}/concluir`,
      {},
      getHeaders()
    );
    window.dispatchEvent(new CustomEvent('tarefasAtualizadas'));
    return res.data;
  } catch (erro) {
    if (erro.response?.status !== 404) throw erro;

    const todas = lerLocal().map(t =>
      t.id === tarefaId
        ? { ...t, concluida: true, concluida_em: new Date().toISOString() }
        : t
    );
    salvarLocal(todas);
    return todas.find(t => t.id === tarefaId);
  }
}

export async function excluirTarefa(tarefaId) {
  try {
    await axios.delete(`${getApiUrl()}/tarefas/${tarefaId}`, getHeaders());
    window.dispatchEvent(new CustomEvent('tarefasAtualizadas'));
  } catch (erro) {
    if (erro.response?.status !== 404) throw erro;
    salvarLocal(lerLocal().filter(t => t.id !== tarefaId));
  }
}

export function classificarTarefa(tarefa, agora = Date.now()) {
  if (tarefa.concluida) return 'concluida';
  const quando = new Date(tarefa.data_hora).getTime();
  if (quando <= agora) return 'vencida';
  if (quando - agora <= LEMBRETE_ANTECEDENCIA_MS) return 'proxima';
  return 'agendada';
}

export function tarefasQuePrecisamAlerta(tarefas, agora = Date.now()) {
  return tarefas.filter(t => {
    const status = classificarTarefa(t, agora);
    return status === 'proxima' || status === 'vencida';
  });
}

export function formatarDataHoraTarefa(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function paraInputDatetimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const pad = (str) => String(str).padStart(2, '0');
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export function deInputDatetimeLocal(valor) {
  if (!valor) return null;
  return new Date(valor).toISOString();
}
