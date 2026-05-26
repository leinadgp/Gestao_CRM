function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTexto(conteudo, nomeArquivo, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\ufeff', conteudo], { type: mime });
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

export function flattenExportEmpresas(payload) {
  const linhas = [];
  for (const bloco of payload.dados || []) {
    const emp = bloco.empresa || {};
    for (const op of bloco.oportunidades || []) {
      linhas.push({
        empresa_id: emp.id,
        empresa_nome: emp.nome,
        empresa_uf: emp.estado,
        empresa_cidade: emp.cidade,
        empresa_classificacao: emp.classificacao,
        empresa_telefones: emp.telefones,
        negociacao_id: op.id,
        negociacao_titulo: op.titulo,
        negociacao_status: op.status,
        negociacao_etapa: op.etapa_nome,
        negociacao_campanha: op.campanha_nome,
        negociacao_valor: op.valor,
        negociacao_vendedor: op.vendedor_nome,
        qtd_inscritos: op.qtd_inscritos,
        inscritos_json: JSON.stringify(op.inscritos_json || []),
        modulos_ids: JSON.stringify(op.modulos_ids || []),
        notas: op.notas_texto || '',
        tarefas: op.tarefas_texto || '',
        contatos_vinculados: JSON.stringify(op.contatos_vinculados || []),
        total_contatos_empresa: (bloco.contatos || []).length,
      });
    }
    if (!(bloco.oportunidades || []).length) {
      linhas.push({
        empresa_id: emp.id,
        empresa_nome: emp.nome,
        empresa_uf: emp.estado,
        empresa_cidade: emp.cidade,
        empresa_classificacao: emp.classificacao,
        empresa_telefones: emp.telefones,
        total_contatos_empresa: (bloco.contatos || []).length,
      });
    }
  }
  return linhas;
}

export function flattenExportContatos(payload) {
  const linhas = [];
  for (const bloco of payload.dados || []) {
    const ct = bloco.contato || {};
    for (const op of bloco.oportunidades || []) {
      linhas.push({
        contato_id: ct.id,
        contato_nome: ct.nome,
        contato_emails: JSON.stringify(ct.emails_json || []),
        contato_telefones: JSON.stringify(ct.telefones_json || []),
        contato_cargos: JSON.stringify(ct.cargos_json || []),
        empresa_nome: ct.empresa_nome,
        empresa_uf: ct.estado,
        empresa_cidade: ct.cidade,
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
      linhas.push({
        contato_id: ct.id,
        contato_nome: ct.nome,
        contato_emails: JSON.stringify(ct.emails_json || []),
        empresa_nome: ct.empresa_nome,
        empresa_uf: ct.estado,
      });
    }
  }
  return linhas;
}

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
    contato: op.contato_nome,
    vendedor: op.vendedor_nome,
    valor: op.valor,
    qtd_inscritos: op.qtd_inscritos,
    inscritos_json: JSON.stringify(op.inscritos_json || []),
    notas: op.notas_texto || '',
    tarefas: op.tarefas_texto || '',
    contatos_vinculados: JSON.stringify(op.contatos_vinculados || []),
  }));
}

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
    contato: op.contato_nome,
    vendedor: op.vendedor_nome,
    valor: op.valor,
    qtd_inscritos: op.qtd_inscritos,
    inscritos_json: JSON.stringify(op.inscritos_json || []),
    notas: op.notas_texto || '',
    tarefas: op.tarefas_texto || '',
    contatos_vinculados: JSON.stringify(op.contatos_vinculados || []),
  }));
}

/** Uma linha por inscrito (dados do dashboard /inscritos). */
export function flattenExportInscritosDashboard(items, parseJson) {
  const parse = parseJson || ((d, f) => (d == null ? f : d));
  const linhas = [];

  for (const ins of items || []) {
    const emails = parse(ins.emails_json, []);
    const tels = parse(ins.telefones_json, []);
    const lista = parse(ins.inscritos_json, []).filter((p) => p?.nome || p?.email);
    const qtd = ins.qtd_inscritos || lista.length || 0;

    const base = {
      oportunidade_id: ins.oportunidade_id,
      contato_nome: ins.contato_nome || '',
      prefeitura: ins.empresa_nome || '',
      curso: ins.curso_nome || '',
      qtd_inscritos: qtd,
      data_inscricao: ins.data_inscricao || '',
      email_lead: Array.isArray(emails) ? emails.join('; ') : '',
      telefone_lead: Array.isArray(tels) ? tels.join('; ') : '',
    };

    if (!lista.length) {
      linhas.push({
        ...base,
        inscrito_nome: '',
        inscrito_email: '',
        inscrito_telefone: '',
        inscrito_cargo: '',
        inscrito_formacao: '',
      });
      continue;
    }

    for (const p of lista) {
      linhas.push({
        ...base,
        inscrito_nome: p.nome || '',
        inscrito_email: p.email || '',
        inscrito_telefone: p.telefone || '',
        inscrito_cargo: p.cargo || '',
        inscrito_formacao: p.formacao || '',
      });
    }
  }

  return linhas;
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
