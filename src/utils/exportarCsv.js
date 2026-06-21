import { parseJSONSeguro, normalizarCargosJson, normalizarListaJson, cargosParaTexto } from './jsonHelpers.js';

// ─── Helpers de formatação ────────────────────────────────────────────────────

function joinLista(val, sep = '; ') {
  return normalizarListaJson(val, []).join(sep);
}

function primeiroEmail(emailsJson) {
  return normalizarListaJson(emailsJson, [])[0] || '';
}

// Formata lista de inscritos como texto legível em célula única
// Ex: "João Silva | joao@email.com | (51) 99999-9999 | Auditor || Maria Souza | maria@email.com"
function formatarInscritos(val) {
  const lista = parseJSONSeguro(val, []);
  if (!Array.isArray(lista) || !lista.length) return '';
  return lista
    .filter(p => p?.nome || p?.email)
    .map(p => [p.nome, p.email, p.telefone, p.cargo, p.formacao].filter(Boolean).join(' | '))
    .join(' || ');
}

// Formata contatos vinculados como "Nome (Cargo) <email>; ..."
function formatarContatosVinculados(lista) {
  if (!Array.isArray(lista) || !lista.length) return '';
  return lista
    .map(p => {
      const cargo = cargosParaTexto(p.cargos_json, '; ');
      const email = primeiroEmail(p.emails_json);
      return [p.nome, cargo ? `(${cargo})` : null, email ? `<${email}>` : null].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join('; ');
}

// ─── Infraestrutura CSV ───────────────────────────────────────────────────────

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTexto(conteudo, nomeArquivo, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿', conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(dados, nomeArquivo) {
  downloadTexto(JSON.stringify(dados, null, 2), nomeArquivo, 'application/json;charset=utf-8;');
}

export function linhasParaCsv(linhas, colunas) {
  const header = colunas.map((c) => escapeCsv(c.label)).join(',');
  const body = linhas.map((row) =>
    colunas.map((c) => escapeCsv(typeof c.get === 'function' ? c.get(row) : row[c.key])).join(',')
  );
  return [header, ...body].join('\n');
}

export function exportarLinhasComoCsv(linhas, prefixoArquivo) {
  if (!linhas.length) return false;
  const keys = Object.keys(linhas[0]);
  const colunas = keys.map((k) => ({ key: k, label: k }));
  const csv = linhasParaCsv(linhas, colunas);
  const data = new Date().toISOString().slice(0, 10);
  downloadTexto(csv, `${prefixoArquivo}_${data}.csv`);
  return true;
}

// ─── Flatten: Empresas ────────────────────────────────────────────────────────

export function flattenExportEmpresas(payload) {
  const linhas = [];
  for (const bloco of payload.dados || []) {
    const emp = bloco.empresa || {};
    const contatos = bloco.contatos || [];

    const resumo_contatos = contatos
      .map(c => {
        const cargo = cargosParaTexto(c.cargos_json, '; ');
        const email = primeiroEmail(c.emails_json);
        const tel = normalizarListaJson(c.telefones_json, [])[0] || '';
        return [c.nome, cargo ? `(${cargo})` : null, email ? `<${email}>` : null, tel || null]
          .filter(Boolean).join(' ');
      })
      .join(' || ');

    const baseEmpresa = {
      empresa_id: emp.id,
      empresa_nome: emp.nome,
      empresa_uf: emp.estado,
      empresa_cidade: emp.cidade,
      empresa_classificacao: emp.classificacao,
      total_contatos: contatos.length,
      contatos_da_empresa: resumo_contatos,
    };

    for (const op of bloco.oportunidades || []) {
      linhas.push({
        ...baseEmpresa,
        negociacao_id: op.id,
        negociacao_titulo: op.titulo,
        negociacao_status: op.status,
        negociacao_etapa: op.etapa_nome,
        negociacao_campanha: op.campanha_nome,
        negociacao_valor: op.valor,
        negociacao_vendedor: op.vendedor_nome,
        qtd_inscritos: op.qtd_inscritos,
        inscritos: formatarInscritos(op.inscritos_json),
        contatos_vinculados: formatarContatosVinculados(op.contatos_vinculados),
        notas: op.notas_texto || '',
        tarefas: op.tarefas_texto || '',
      });
    }
    if (!(bloco.oportunidades || []).length) {
      linhas.push(baseEmpresa);
    }
  }
  return linhas;
}

// ─── Flatten: Contatos ────────────────────────────────────────────────────────

export function flattenExportContatos(payload) {
  const linhas = [];
  for (const bloco of payload.dados || []) {
    const ct = bloco.contato || {};
    const baseContato = {
      contato_id: ct.id,
      contato_nome: ct.nome,
      contato_emails: joinLista(ct.emails_json),
      contato_telefones: joinLista(ct.telefones_json),
      contato_cargos: cargosParaTexto(ct.cargos_json, '; '),
      empresa_nome: ct.empresa_nome,
      empresa_uf: ct.estado,
      empresa_cidade: ct.cidade,
    };
    for (const op of bloco.oportunidades || []) {
      linhas.push({
        ...baseContato,
        negociacao_id: op.id,
        negociacao_titulo: op.titulo,
        negociacao_status: op.status,
        negociacao_campanha: op.campanha_nome,
        negociacao_valor: op.valor,
        notas: op.notas_texto || '',
        tarefas: op.tarefas_texto || '',
      });
    }
    if (!(bloco.oportunidades || []).length) {
      linhas.push(baseContato);
    }
  }
  return linhas;
}

// ─── Flatten: Oportunidades ───────────────────────────────────────────────────

export function flattenExportOportunidades(payload) {
  return (payload.dados || []).map((op) => ({
    negociacao_id: op.id,
    titulo: op.titulo,
    status: op.status,
    etapa: op.etapa_nome,
    campanha: op.campanha_nome,
    empresa: op.empresa_nome,
    empresa_uf: op.empresa_estado,
    empresa_cidade: op.empresa_cidade,
    contato_principal: op.contato_nome,
    vendedor: op.vendedor_nome,
    valor: op.valor,
    qtd_inscritos: op.qtd_inscritos,
    inscritos: formatarInscritos(op.inscritos_json),
    contatos_vinculados: formatarContatosVinculados(op.contatos_vinculados),
    notas: op.notas_texto || '',
    tarefas: op.tarefas_texto || '',
  }));
}

// ─── Flatten: Campanha ────────────────────────────────────────────────────────

export function flattenExportCampanha(payload) {
  return (payload.negociacoes || []).map((op) => ({
    campanha: payload.campanha?.nome,
    etapa: op.etapa_nome,
    negociacao_id: op.id,
    titulo: op.titulo,
    status: op.status,
    empresa: op.empresa_nome,
    empresa_uf: op.empresa_estado,
    empresa_cidade: op.empresa_cidade,
    contato_principal: op.contato_nome,
    vendedor: op.vendedor_nome,
    valor: op.valor,
    qtd_inscritos: op.qtd_inscritos,
    inscritos: formatarInscritos(op.inscritos_json),
    contatos_vinculados: formatarContatosVinculados(op.contatos_vinculados),
    notas: op.notas_texto || '',
    tarefas: op.tarefas_texto || '',
  }));
}

// ─── Flatten: Inscritos Dashboard ────────────────────────────────────────────

/** Uma linha por inscrito (dados do dashboard /inscritos). */
export function flattenExportInscritosDashboard(items, parseJsonExterno) {
  const parse = parseJsonExterno
    ? (val, fb) => { try { return parseJsonExterno(val, fb); } catch { return fb; } }
    : parseJSONSeguro;

  const linhas = [];
  for (const ins of items || []) {
    const emails = normalizarListaJson(parse(ins.emails_json, []), []);
    const tels   = normalizarListaJson(parse(ins.telefones_json, []), []);
    const lista  = parse(ins.inscritos_json, []).filter((p) => p?.nome || p?.email);
    const qtd    = ins.qtd_inscritos || lista.length || 0;

    const base = {
      oportunidade_id: ins.oportunidade_id,
      contato_nome:    ins.contato_nome || '',
      prefeitura:      ins.empresa_nome || '',
      curso:           ins.curso_nome || '',
      qtd_inscritos:   qtd,
      data_inscricao:  ins.data_inscricao || '',
      email_lead:      emails.join('; '),
      telefone_lead:   tels.join('; '),
    };

    if (!lista.length) {
      linhas.push({ ...base, inscrito_nome: '', inscrito_email: '', inscrito_telefone: '', inscrito_cargo: '', inscrito_formacao: '' });
      continue;
    }
    for (const p of lista) {
      linhas.push({
        ...base,
        inscrito_nome:     p.nome || '',
        inscrito_email:    p.email || '',
        inscrito_telefone: p.telefone || '',
        inscrito_cargo:    p.cargo || '',
        inscrito_formacao: p.formacao || '',
      });
    }
  }
  return linhas;
}
