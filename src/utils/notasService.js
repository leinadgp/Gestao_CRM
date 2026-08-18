import axios from 'axios';

function getApiUrl() {
  return import.meta.env?.VITE_API_URL || 'https://server-js-gestao.onrender.com';
}

function getHeaders() {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function listarNotasOportunidade(oportunidadeId) {
  const res = await axios.get(`${getApiUrl()}/oportunidades/${oportunidadeId}/notas`, getHeaders());
  return res.data;
}

export async function criarNota(oportunidadeId, nota) {
  const res = await axios.post(
    `${getApiUrl()}/oportunidades/${oportunidadeId}/notas`,
    { nota, criado_em: new Date().toISOString() },
    getHeaders()
  );
  return res.data;
}

export async function atualizarNota(notaId, nota) {
  const res = await axios.put(`${getApiUrl()}/notas/${notaId}`, { nota }, getHeaders());
  return res.data;
}
