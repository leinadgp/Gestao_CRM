# Múltiplos Participantes com Campanhas Diferentes em LP Multi-Campanha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir 1-5 participantes em landing pages com múltiplas campanhas vinculadas, cada participante escolhendo suas próprias campanhas/módulos, com desconto de pacote configurável por landing page (por pessoa ou por organização).

**Architecture:** O backend (`server CRUD/server.js`) reescreve o branch multi-campanha de `POST /webhook/inscricao-externa` para receber um payload `participantes[]` (cada um com sua própria lista de campanhas/módulos) em vez do atual `inscricoes[]` (uma lista compartilhada pelo grupo), agrupando por campanha tocada e calculando desconto por pessoa ou por organização conforme `landing_pages.modo_desconto`. O script client-side injetado (`scriptFormulario`, mesma rota `GET /lp/:slug`) ganha um seletor de módulos por participante (reaproveitando o `#containerModulos` para o participante 1 e criando um bloco por participante 2-5), e remove a trava que hoje esconde quantidade/participantes quando a página é multi-campanha. O editor de landing pages (`frontend-crm`) ganha um seletor "Modo de desconto" ao lado da escolha de campanhas.

**Tech Stack:** Node/Express + `pg` sem ORM (server CRUD), React + Vite + styled-components (frontend-crm), JavaScript puro injetado como string (script client-side da LP publicada).

**Spec:** `docs/superpowers/specs/2026-09-22-desconto-multi-campanha-por-participante-design.md`

## Global Constraints

- Tudo vale só dentro de **um único envio** do formulário — sem rastrear inscrições da mesma prefeitura ao longo do tempo/envios separados.
- Modo de campanha única (`MODO_MULTI === false`, a maioria das páginas hoje) **não muda em nada** — segue com seleção de módulos compartilhada pelo grupo, exatamente como está em produção.
- `landing_pages.modo_desconto`: `'por_pessoa'` (padrão) ou `'por_organizacao'`.
- **Modo "por pessoa":** desconto de cada participante = 15% se ele mesmo escolheu ≥3 campanhas distintas, 10% se =2, 0% se =1. Independente do que os outros participantes do grupo escolheram.
- **Modo "por organização":** desconto único para o envio inteiro = 15%/10%/0% pela união de todas as campanhas escolhidas por qualquer participante do grupo.
- Cada campanha tocada por qualquer participante do envio vira/atualiza uma negociação (empresa+campanha), como já acontece hoje — só a composição de `inscritos_json` e o cálculo de valor/desconto mudam.
- `oportunidades.desconto` (coluna única) continua existindo; quando os participantes de uma negociação específica têm descontos individuais diferentes (modo por pessoa), grava a média ponderada pelo valor bruto de cada um — informativo, não a fonte da verdade de preço (essa vive em `inscritos_json`).
- Este backend não tem migrations versionadas: DDL é `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, idempotente, no topo do `server.js`.
- Sem framework de teste automatizado para rotas Express, para o script client-side injetado, nem para os componentes React grandes deste projeto — verificação é manual (curl, leitura direta no Postgres, harness ad-hoc tipo jsdom quando fizer sentido).

---

## Task 1: Migração — coluna `landing_pages.modo_desconto`

**Files:**
- Modify: `server CRUD/server.js` (bloco de migrações de `landing_pages`, perto de `campanhas_ids`)

**Interfaces:**
- Produces: coluna `landing_pages.modo_desconto VARCHAR(20) NOT NULL DEFAULT 'por_pessoa'`.

- [ ] **Step 1: Adicionar o bloco de migração**

Local: logo após o bloco existente de `campanhas_ids` (busque por `Aviso migração landing_pages campanhas_ids`):

```js
pool.query(`
  ALTER TABLE landing_pages
    ADD COLUMN IF NOT EXISTS campanhas_ids JSONB DEFAULT NULL
`).catch((err) => console.warn('Aviso migração landing_pages campanhas_ids:', err.message));
```

Inserir logo abaixo:

```js
pool.query(`
  ALTER TABLE landing_pages
    ADD COLUMN IF NOT EXISTS modo_desconto VARCHAR(20) NOT NULL DEFAULT 'por_pessoa'
`).catch((err) => console.warn('Aviso migração landing_pages modo_desconto:', err.message));
```

- [ ] **Step 2: Verificar manualmente**

Reiniciar o backend local e confirmar que **não** aparece o aviso `Aviso migração landing_pages modo_desconto:`. Se tiver acesso ao Postgres local, `\d landing_pages` deve listar `modo_desconto` como `character varying(20) NOT NULL DEFAULT 'por_pessoa'::character varying`.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: adiciona coluna modo_desconto em landing_pages"
```

---

## Task 2: Backend — webhook multi-campanha recebe `participantes[]` e calcula desconto por pessoa/organização

**Files:**
- Modify: `server CRUD/server.js` (função `normalizarInscritosJson`)
- Modify: `server CRUD/server.js` (branch multi-campanha de `POST /webhook/inscricao-externa`)

**Interfaces:**
- Consumes: coluna `landing_pages.modo_desconto` (Task 1, indiretamente — o valor chega no payload já calculado pelo frontend, ver Task 4).
- Consumes: `resolverOuCriarContatoPorEmail(client, {email, nome, telefone, cargo, empresaId})`, `resolverEtapasLanding(client, campanhaId)`, `anexarContatosOportunidade`, `sincronizarContatosOportunidade`, `normalizarInscritosJson` — todas já existentes, sem mudança de assinatura.
- Produces: aceita `req.body.participantes` (array) e `req.body.modo_desconto` no lugar de `inscricoes`/`desconto_percentual`/`desconto_motivo` (removidos do destructure — não são mais usados por nenhum branch desta rota). Cada item de `inscritos_json` passa a ter também `desconto_percentual` (numérico).

- [ ] **Step 1: `normalizarInscritosJson` preserva `desconto_percentual`**

Trecho atual:

```js
function normalizarInscritosJson(val) {
  if (val == null) return [];
  let parsed = val;
  if (typeof val === 'string') {
    try { parsed = JSON.parse(val); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    let modulosIds = [];
    if (Array.isArray(item?.modulos_ids)) {
      modulosIds = item.modulos_ids.map((id) => Number(id)).filter(Boolean);
    }
    return {
      nome: item?.nome ? String(item.nome).trim() : '',
      email: item?.email ? String(item.email).trim().toLowerCase() : '',
      telefone: item?.telefone || item?.whatsapp ? String(item.telefone || item.whatsapp).trim() : '',
      formacao: item?.formacao ? String(item.formacao).trim() : '',
      cargo: item?.cargo ? String(item.cargo).trim() : '',
      contato_id: item?.contato_id ? Number(item.contato_id) : null,
      modulos_ids: modulosIds,
    };
  }).filter((i) => i.nome || i.email);
}
```

Substituir por (só o `return` interno do `.map` ganha uma linha):

```js
function normalizarInscritosJson(val) {
  if (val == null) return [];
  let parsed = val;
  if (typeof val === 'string') {
    try { parsed = JSON.parse(val); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    let modulosIds = [];
    if (Array.isArray(item?.modulos_ids)) {
      modulosIds = item.modulos_ids.map((id) => Number(id)).filter(Boolean);
    }
    return {
      nome: item?.nome ? String(item.nome).trim() : '',
      email: item?.email ? String(item.email).trim().toLowerCase() : '',
      telefone: item?.telefone || item?.whatsapp ? String(item.telefone || item.whatsapp).trim() : '',
      formacao: item?.formacao ? String(item.formacao).trim() : '',
      cargo: item?.cargo ? String(item.cargo).trim() : '',
      contato_id: item?.contato_id ? Number(item.contato_id) : null,
      modulos_ids: modulosIds,
      desconto_percentual: item?.desconto_percentual != null ? Number(item.desconto_percentual) : 0,
    };
  }).filter((i) => i.nome || i.email);
}
```

- [ ] **Step 2: Destructure do payload**

Trecho atual (topo de `POST /webhook/inscricao-externa`):

```js
  const {
    nome, email, whatsapp, telefone, curso_id, modulos_ids, setor, cargo, formacao,
    cidade, municipio, uf, curso_nome, inscritos, qtd_inscritos, origem,
    inscricoes, desconto_percentual, desconto_motivo, tipo_orgao, forma_pagamento,
  } = req.body;
```

Substituir por:

```js
  const {
    nome, email, whatsapp, telefone, curso_id, modulos_ids, setor, cargo, formacao,
    cidade, municipio, uf, curso_nome, inscritos, qtd_inscritos, origem,
    participantes, modo_desconto, tipo_orgao, forma_pagamento,
  } = req.body;
```

- [ ] **Step 3: Substituir o branch multi-campanha inteiro**

Localizar o comentário `// MODO MULTI-CAMPANHA: payload contém array inscricoes[]` e todo o bloco `if (Array.isArray(inscricoes) && inscricoes.length > 0) { ... }` até o `finally { client.release(); }` que fecha esse `if` (é o primeiro bloco de tratamento da rota, antes do comentário `// MODO LEGADO`). Substituir **o bloco inteiro** por:

```js
  // MODO MULTI-CAMPANHA: payload contém array participantes[], cada um com suas próprias campanhas/módulos
  if (Array.isArray(participantes) && participantes.length > 0) {
    if (!cidadeFinal) return res.status(400).json({ erro: 'Município é obrigatório para vincular à prefeitura.' });
    const participantesValidos = participantes.filter((p) => p && p.email && Array.isArray(p.campanhas) && p.campanhas.length > 0);
    if (!participantesValidos.length) return res.status(400).json({ erro: 'Informe ao menos um participante com email e campanha selecionada.' });

    const modoDescontoReq = modo_desconto === 'por_organizacao' ? 'por_organizacao' : 'por_pessoa';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const empresaId = await resolverEmpresaPorMunicipio(client, cidadeFinal, uf, tipo_orgao);
      if (!empresaId) throw new Error('Não foi possível identificar a prefeitura.');
      const empNomeRes = await client.query('SELECT nome FROM empresas WHERE id = $1', [empresaId]);
      const empresaNome = empNomeRes.rows[0]?.nome || `Prefeitura de ${cidadeFinal}`;

      // Resolve/cria um contato por participante — cada um pode ser uma pessoa diferente
      // da prefeitura, diferente do modo legado que tem só 1 pessoa por envio.
      for (const p of participantesValidos) {
        p._emailNorm = String(p.email).trim().toLowerCase();
        p._contatoId = await resolverOuCriarContatoPorEmail(client, {
          email: p._emailNorm, nome: p.nome || 'Novo Lead', telefone: p.telefone, cargo: p.cargo, empresaId,
        });
      }

      // Modo "por organização": desconto único pela união de todas as campanhas escolhidas
      // por qualquer participante do envio.
      let descontoOrganizacaoPct = 0;
      if (modoDescontoReq === 'por_organizacao') {
        const campanhasUniao = new Set();
        participantesValidos.forEach((p) => p.campanhas.forEach((c) => campanhasUniao.add(Number(c.campanha_id))));
        const qtd = campanhasUniao.size;
        descontoOrganizacaoPct = qtd >= 3 ? 15 : qtd === 2 ? 10 : 0;
      }

      // Agrupa por campanha: toda campanha tocada por qualquer participante vira/atualiza
      // uma negociação. Modo "por pessoa": cada participante carrega seu próprio desconto,
      // calculado só pelas campanhas que ELE escolheu.
      const campanhasTocadas = new Map();
      for (const p of participantesValidos) {
        let descontoPessoaPct = 0;
        if (modoDescontoReq === 'por_pessoa') {
          const qtdPessoa = new Set(p.campanhas.map((c) => Number(c.campanha_id))).size;
          descontoPessoaPct = qtdPessoa >= 3 ? 15 : qtdPessoa === 2 ? 10 : 0;
        }
        const descontoAplicado = modoDescontoReq === 'por_organizacao' ? descontoOrganizacaoPct : descontoPessoaPct;
        for (const c of p.campanhas) {
          const cid = Number(c.campanha_id);
          if (!cid) continue;
          const modulosIds = Array.isArray(c.modulos_ids) ? c.modulos_ids.map(Number).filter(Boolean) : [];
          if (!campanhasTocadas.has(cid)) campanhasTocadas.set(cid, []);
          campanhasTocadas.get(cid).push({ participante: p, modulosIds, descontoAplicado });
        }
      }

      const resultados = [];
      for (const [cursoId, entradas] of campanhasTocadas) {
        const todosModulosIds = [...new Set(entradas.flatMap((e) => e.modulosIds))];
        const precosModulos = new Map();
        if (todosModulosIds.length > 0) {
          const modsRes = await client.query('SELECT id, valor FROM modulos WHERE id = ANY($1)', [todosModulosIds]);
          modsRes.rows.forEach((m) => precosModulos.set(Number(m.id), Number(m.valor) || 0));
        }

        const { inscritoId } = await resolverEtapasLanding(client, cursoId);

        let valorTotalCampanha = 0;
        let somaBruto = 0;
        let somaBrutoPonderado = 0;
        const inscritosNovos = entradas.map((e) => {
          const brutoParticipante = e.modulosIds.reduce((acc, id) => acc + (precosModulos.get(id) || 0), 0);
          const finalParticipante = e.descontoAplicado > 0 ? +(brutoParticipante * (1 - e.descontoAplicado / 100)).toFixed(2) : brutoParticipante;
          valorTotalCampanha += finalParticipante;
          somaBruto += brutoParticipante;
          somaBrutoPonderado += brutoParticipante * e.descontoAplicado;
          return {
            nome: e.participante.nome || '', email: e.participante._emailNorm, telefone: e.participante.telefone || '',
            cargo: e.participante.cargo || '', formacao: e.participante.formacao || '', contato_id: e.participante._contatoId,
            modulos_ids: e.modulosIds, desconto_percentual: e.descontoAplicado,
          };
        });
        const descontoMedioCampanha = somaBruto > 0 ? +(somaBrutoPonderado / somaBruto).toFixed(2) : 0;
        const contatosCampanha = [...new Set(entradas.map((e) => e.participante._contatoId).filter(Boolean))];
        const contatoPrincipalCampanha = contatosCampanha[0] || null;

        const opRes = await client.query(
          `SELECT o.id, o.status, o.inscritos_json, o.qtd_inscritos, o.vendedor_id, u.nome AS vendedor_nome
           FROM oportunidades o LEFT JOIN usuarios u ON u.id_usuario = o.vendedor_id
           WHERE o.empresa_id = $1 AND o.campanha_id = $2 LIMIT 1`,
          [empresaId, cursoId]
        );
        let oportunidadeId;
        let contaComoNovaInscricao = false;
        let vendedorIdEvento = null;
        let vendedorNomeEvento = 'Landing Page';
        if (opRes.rows.length > 0) {
          oportunidadeId = opRes.rows[0].id;
          const statusAntes = opRes.rows[0].status;
          contaComoNovaInscricao = statusAntes !== 'inscricao' && statusAntes !== 'ganho';
          if (opRes.rows[0].vendedor_id) {
            vendedorIdEvento = opRes.rows[0].vendedor_id;
            vendedorNomeEvento = opRes.rows[0].vendedor_nome || 'Landing Page';
          }
          const inscritosAtuais = normalizarInscritosJson(opRes.rows[0].inscritos_json);
          const chave = (i) => `${(i.email||'').toLowerCase()}|${(i.nome||'').toLowerCase()}`;
          const mapa = new Map(inscritosAtuais.map((i) => [chave(i), i]));
          for (const ins of inscritosNovos) mapa.set(chave(ins), { ...mapa.get(chave(ins)), ...ins });
          const merged = [...mapa.values()];
          await client.query(
            `UPDATE oportunidades SET status='inscricao', etapa_id=$1, modulos_ids=$2, qtd_inscritos=$3,
             inscritos_json=$4, valor=$5, desconto=$6, atualizado_em=CURRENT_TIMESTAMP, origem_lead=COALESCE($8,origem_lead),
             forma_pagamento=COALESCE($9, forma_pagamento) WHERE id=$7`,
            [inscritoId, JSON.stringify(todosModulosIds), merged.length, JSON.stringify(merged), valorTotalCampanha, descontoMedioCampanha, oportunidadeId, origem || null, formaPagamentoSegura]
          );
          await anexarContatosOportunidade(client, oportunidadeId, contatosCampanha, null);
        } else {
          const novaOp = await client.query(
            `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, campanha_id, status, origem_venda, modulos_ids, qtd_inscritos, inscritos_json, origem_lead, forma_pagamento, desconto)
             VALUES ($1,$2,$3,$4,$5,$6,'inscricao','landing_page',$7,$8,$9,$10,$11,$12) RETURNING id`,
            [`Inscrição Web - ${empresaNome}`, valorTotalCampanha, contatoPrincipalCampanha, empresaId, inscritoId, cursoId,
             JSON.stringify(todosModulosIds), inscritosNovos.length, JSON.stringify(inscritosNovos), origem || null, formaPagamentoSegura, descontoMedioCampanha]
          );
          oportunidadeId = novaOp.rows[0].id;
          contaComoNovaInscricao = true;
          await sincronizarContatosOportunidade(client, oportunidadeId, contatosCampanha, contatoPrincipalCampanha);
        }
        if (contaComoNovaInscricao) {
          await client.query(
            `INSERT INTO oportunidade_eventos (oportunidade_id, tipo, etapa_anterior_id, etapa_nova_id, usuario_id, usuario_nome)
             VALUES ($1, 'venda', NULL, $2, $3, $4)`,
            [oportunidadeId, inscritoId, vendedorIdEvento, vendedorNomeEvento]
          );
        }
        const nota = [
          `Inscrição via Landing Page (pacote multi-campanha, modo de desconto: ${modoDescontoReq === 'por_organizacao' ? 'por organização' : 'por pessoa'})`,
          '',
          `Pessoas inscritas nesta campanha: ${inscritosNovos.length}`,
          ...inscritosNovos.map((ins, idx) => (
            `${idx + 1}. ${ins.nome || '—'} | ${ins.email || '—'} | ${ins.telefone || '—'} | ${ins.cargo || '—'} | desconto: ${ins.desconto_percentual}%`
          )),
        ].join('\n');
        await client.query(
          'INSERT INTO historico_notas (oportunidade_id, usuario_nome, nota) VALUES ($1,$2,$3)',
          [oportunidadeId, 'Landing Page', nota]
        );
        resultados.push({ campanha_id: cursoId, oportunidade_id: oportunidadeId });
      }

      await client.query('COMMIT');
      io.emit('nova_inscricao_landing', { mensagem: 'Inscrições do pacote criadas!', empresaNome, resultados });
      return res.json({ mensagem: 'Inscrições criadas com sucesso!', resultados });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro inscrição LP multi:', err);
      return res.status(500).json({ erro: err.message || 'Erro ao processar inscrição no servidor.' });
    } finally { client.release(); }
  }
```

- [ ] **Step 4: Verificar manualmente (curl, modo por pessoa)**

Com backend local rodando, `crm_dev` tendo pelo menos 3 campanhas com módulos (para simular a "trilha"), e uma landing page com `modo_desconto` ainda não setado via UI (a Task 3 cuida disso — para este teste, você pode fazer um `UPDATE landing_pages SET modo_desconto='por_pessoa' WHERE id=<id>` local só para ter o valor, já que o payload do curl abaixo já manda `modo_desconto` explicitamente e não depende da tabela):

```bash
curl -X POST http://localhost:3001/webhook/inscricao-externa \
  -H "Content-Type: application/json" \
  -d '{
    "cidade": "Taquara",
    "uf": "RS",
    "modo_desconto": "por_pessoa",
    "participantes": [
      { "nome": "Participante 1", "email": "p1@example.com", "telefone": "51988887777",
        "campanhas": [{"campanha_id": 1, "modulos_ids": []}, {"campanha_id": 2, "modulos_ids": []}] },
      { "nome": "Participante 2", "email": "p2@example.com", "telefone": "51988886666",
        "campanhas": [{"campanha_id": 2, "modulos_ids": []}] }
    ]
  }'
```

(Ajuste `campanha_id`/`modulos_ids` para ids reais do seu `crm_dev` local.) Esperado: `200 OK`. Confirmar via Postgres/`GET /oportunidades` que:
- A negociação da campanha 1 tem só o Participante 1, com `desconto_percentual: 10` (ele está em 2 campanhas).
- A negociação da campanha 2 tem os dois participantes: Participante 1 com `desconto_percentual: 10`, Participante 2 com `desconto_percentual: 0` (ele só está em 1 campanha).

Repetir com `"modo_desconto": "por_organizacao"` e confirmar que **ambos** os participantes aparecem com o mesmo `desconto_percentual` (união = 2 campanhas → 10% para os dois, em todas as negociações tocadas).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: webhook multi-campanha aceita participantes com campanhas proprias e desconto por pessoa/organizacao"
```

---

## Task 3: Backend — `POST`/`PUT /landing-pages` aceitam e persistem `modo_desconto`

**Files:**
- Modify: `server CRUD/server.js` (`POST /landing-pages` e `PUT /landing-pages/:id`)

**Interfaces:**
- Consumes: coluna `landing_pages.modo_desconto` (Task 1).
- Produces: `modo_desconto` aceito no corpo de `POST`/`PUT /landing-pages`, persistido; já retornado automaticamente por `GET /landing-pages/:id` e `GET /lp/:slug` (ambos fazem `SELECT lp.*`, sem mudança necessária nessas rotas).

- [ ] **Step 1: `POST /landing-pages`**

Trecho atual:

```js
app.post('/landing-pages', verificarToken, async (req, res) => {
  const { nome, slug, html_content, css_content, status, campanha_id, campanhas_ids } = req.body;
  const html = html_content || '';
  const css = css_content || '';
  const campanhasIdsVal = Array.isArray(campanhas_ids) && campanhas_ids.length > 1 ? JSON.stringify(campanhas_ids) : null;
  try {
    const result = await pool.query(
      `INSERT INTO landing_pages (nome, slug, html_content, css_content, html_rascunho, css_rascunho, status, campanha_id, campanhas_ids)
       VALUES ($1, $2, $3, $4, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, slug, html, css, status || 'rascunho', campanha_id || null, campanhasIdsVal]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ erro: 'Este SLUG já está sendo usado.' });
    res.status(500).json({ erro: 'Erro ao criar Landing Page' });
  }
});
```

Substituir por:

```js
app.post('/landing-pages', verificarToken, async (req, res) => {
  const { nome, slug, html_content, css_content, status, campanha_id, campanhas_ids, modo_desconto } = req.body;
  const html = html_content || '';
  const css = css_content || '';
  const campanhasIdsVal = Array.isArray(campanhas_ids) && campanhas_ids.length > 1 ? JSON.stringify(campanhas_ids) : null;
  const modoDescontoVal = modo_desconto === 'por_organizacao' ? 'por_organizacao' : 'por_pessoa';
  try {
    const result = await pool.query(
      `INSERT INTO landing_pages (nome, slug, html_content, css_content, html_rascunho, css_rascunho, status, campanha_id, campanhas_ids, modo_desconto)
       VALUES ($1, $2, $3, $4, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, slug, html, css, status || 'rascunho', campanha_id || null, campanhasIdsVal, modoDescontoVal]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ erro: 'Este SLUG já está sendo usado.' });
    res.status(500).json({ erro: 'Erro ao criar Landing Page' });
  }
});
```

- [ ] **Step 2: `PUT /landing-pages/:id`**

Trecho atual:

```js
app.put('/landing-pages/:id', verificarToken, async (req, res) => {
  const { nome, slug, html_content, css_content, campanha_id, campanhas_ids } = req.body;
  const campanhasIdsVal = Array.isArray(campanhas_ids) && campanhas_ids.length > 1 ? JSON.stringify(campanhas_ids) : null;
  try {
    const result = await pool.query(
      `UPDATE landing_pages
       SET nome = $1, slug = $2, html_rascunho = $3, css_rascunho = $4, campanha_id = $5,
           campanhas_ids = $6, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING id, nome, slug, status, campanha_id, campanhas_ids, atualizado_em,
             (html_rascunho IS NOT NULL AND html_rascunho IS DISTINCT FROM html_content) AS tem_rascunho_pendente`,
      [nome, slug, html_content || '', css_content || '', campanha_id || null, campanhasIdsVal, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ erro: 'Este SLUG já está sendo usado.' });
    res.status(500).json({ erro: 'Erro ao atualizar Landing Page' });
  }
});
```

Substituir por:

```js
app.put('/landing-pages/:id', verificarToken, async (req, res) => {
  const { nome, slug, html_content, css_content, campanha_id, campanhas_ids, modo_desconto } = req.body;
  const campanhasIdsVal = Array.isArray(campanhas_ids) && campanhas_ids.length > 1 ? JSON.stringify(campanhas_ids) : null;
  const modoDescontoVal = modo_desconto === 'por_organizacao' ? 'por_organizacao' : 'por_pessoa';
  try {
    const result = await pool.query(
      `UPDATE landing_pages
       SET nome = $1, slug = $2, html_rascunho = $3, css_rascunho = $4, campanha_id = $5,
           campanhas_ids = $6, modo_desconto = $8, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING id, nome, slug, status, campanha_id, campanhas_ids, modo_desconto, atualizado_em,
             (html_rascunho IS NOT NULL AND html_rascunho IS DISTINCT FROM html_content) AS tem_rascunho_pendente`,
      [nome, slug, html_content || '', css_content || '', campanha_id || null, campanhasIdsVal, req.params.id, modoDescontoVal]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ erro: 'Este SLUG já está sendo usado.' });
    res.status(500).json({ erro: 'Erro ao atualizar Landing Page' });
  }
});
```

- [ ] **Step 3: Verificar manualmente**

`GET /landing-pages/:id` já faz `SELECT lp.*` — confirmar que `modo_desconto` aparece na resposta sem mudar essa rota. Testar `PUT /landing-pages/:id` com `modo_desconto: "por_organizacao"` via curl autenticado, reler com `GET` e confirmar persistência.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: POST/PUT landing-pages aceitam e persistem modo_desconto"
```

---

## Task 4: Script da landing page — seleção de módulo por participante e novo payload

**Files:**
- Modify: `server CRUD/server.js` (dentro de `scriptFormulario`, rota `GET /lp/:slug`)

**Interfaces:**
- Consumes: `window.CAMPANHAS_IDS`, `window.MODO_MULTI` (já existentes); novo `window.MODO_DESCONTO`.
- Consumes: campos `nome_N`/`email_N`/`telefone_N`/`formacao_N`/`cargo_N` e `[data-participante="N"]` (produzidos pelo plano anterior, já em produção).
- Produces: quando `MODO_MULTI` é verdadeiro, cada checkbox de módulo ganha `data-participante-idx="N"`; o payload de `/webhook/inscricao-externa` passa a incluir `participantes`/`modo_desconto` no lugar de `inscricoes`/`desconto_percentual`/`desconto_motivo`.

- [ ] **Step 1: Expor `window.MODO_DESCONTO`**

Trecho atual:

```js
          window.CAMPANHA_ID_ATUAL = ${pagina.campanha_id || 'null'};
          window.CAMPANHAS_IDS = ${JSON.stringify(campanhasIdsArr)};
          window.MODO_MULTI = ${modoMultiLP};
          window.CURSO_NOME_ATUAL = "${pagina.curso_nome?.replace(/"/g, '\\"') || ''}";
          window.API_URL_BASE = "${process.env.API_URL || ''}" || window.location.origin;
```

Substituir por:

```js
          window.CAMPANHA_ID_ATUAL = ${pagina.campanha_id || 'null'};
          window.CAMPANHAS_IDS = ${JSON.stringify(campanhasIdsArr)};
          window.MODO_MULTI = ${modoMultiLP};
          window.MODO_DESCONTO = ${JSON.stringify(pagina.modo_desconto === 'por_organizacao' ? 'por_organizacao' : 'por_pessoa')};
          window.CURSO_NOME_ATUAL = "${pagina.curso_nome?.replace(/"/g, '\\"') || ''}";
          window.API_URL_BASE = "${process.env.API_URL || ''}" || window.location.origin;
```

- [ ] **Step 2: Reescrever `prepararFormulario` e substituir `calcularDesconto`**

Trecho atual (da declaração de `prepararFormulario` até o fim de `calcularDesconto`):

```js
          async function prepararFormulario() {
              var ids = window.CAMPANHAS_IDS || [];
              var container = document.querySelector('[id^="containerModulos"]');
              if (!container || !ids.length) return;
              try {
                  var resultados = await Promise.all(
                      ids.map(function(id) {
                          return fetch(window.API_URL_BASE + '/api/publico/campanha/id/' + id)
                              .then(function(r) { return r.ok ? r.json() : null; })
                              .catch(function() { return null; });
                      })
                  );
                  var multi = window.MODO_MULTI;
                  container.innerHTML = '';

                  // Coleta todos os módulos de todas as campanhas (modo multi = lista flat)
                  var todosModulos = [];
                  resultados.forEach(function(dados, idx) {
                      if (!dados || !dados.modulos || !dados.modulos.length) return;
                      dados.modulos.forEach(function(mod) {
                          todosModulos.push({ mod: mod, campanhaId: ids[idx], campanhaLabel: dados.curso ? dados.curso.nome : '' });
                      });
                  });

                  if (!todosModulos.length) {
                      container.innerHTML = '<p style="text-align:center;color:#cbd5e1;font-weight:bold;">Inscrição Padrão.</p>';
                      return;
                  }

                  todosModulos.forEach(function(item) {
                      var mod = item.mod;
                      var campanhaId = item.campanhaId;
                      var valorNum = Number(mod.valor) || 0;
                      var checked = multi ? '' : 'checked';
                      var disabled = (!multi && todosModulos.length === 1) ? 'disabled' : '';
                      container.innerHTML += '<label data-campanha-id="' + campanhaId + '" style="display:flex;align-items:center;gap:14px;padding:16px;border:1px solid rgba(148,163,184,0.18);border-radius:16px;margin-bottom:12px;background:rgba(15,23,42,0.9);cursor:pointer;">'
                              + '<input type="checkbox" name="modulo_id" value="' + mod.id + '" data-campanha-id="' + campanhaId + '" data-valor="' + valorNum + '" ' + checked + ' ' + disabled + ' style="margin:0;width:22px;height:22px;accent-color:#f5b21f;border-radius:6px;flex-shrink:0;">'
                              + '<div style="line-height:1.35;color:#f8fafc;font-weight:700;font-size:0.97rem;">' + mod.nome + '</div>'
                              + '</label>';
                  });

                  if (multi) {
                      container.innerHTML += '<div id="avisoDesconto" style="display:none;margin-top:4px;margin-bottom:4px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#4ade80;font-weight:600;font-size:0.9rem;"></div>';
                      container.addEventListener('change', calcularDesconto);
                  }
              } catch (e) {
                  console.warn('Erro ao carregar módulos da campanha:', e);
              }
          }
          function calcularDesconto() {
              var cbs = Array.from(document.querySelectorAll('input[name="modulo_id"]:checked'));
              var campanhas = new Set(cbs.map(function(c) { return c.dataset.campanhaId; }).filter(Boolean));
              var qtd = campanhas.size;
              var pct = qtd >= 3 ? 15 : qtd === 2 ? 10 : 0;
              var aviso = document.getElementById('avisoDesconto');
              if (!aviso) return;
              if (pct > 0) {
                  aviso.style.display = 'block';
                  aviso.textContent = '✓ Desconto de ' + pct + '% aplicado por se inscrever em ' + qtd + ' curso' + (qtd > 1 ? 's' : '') + ' do pacote!';
              } else {
                  aviso.style.display = 'none';
              }
          }
```

Substituir por:

```js
          async function prepararFormulario() {
              var ids = window.CAMPANHAS_IDS || [];
              var container = document.querySelector('[id^="containerModulos"]');
              if (!container || !ids.length) return;
              try {
                  var resultados = await Promise.all(
                      ids.map(function(id) {
                          return fetch(window.API_URL_BASE + '/api/publico/campanha/id/' + id)
                              .then(function(r) { return r.ok ? r.json() : null; })
                              .catch(function() { return null; });
                      })
                  );
                  var multi = window.MODO_MULTI;
                  container.innerHTML = '';

                  // Coleta todos os módulos de todas as campanhas (modo multi = lista flat)
                  var todosModulos = [];
                  resultados.forEach(function(dados, idx) {
                      if (!dados || !dados.modulos || !dados.modulos.length) return;
                      dados.modulos.forEach(function(mod) {
                          todosModulos.push({ mod: mod, campanhaId: ids[idx], campanhaLabel: dados.curso ? dados.curso.nome : '' });
                      });
                  });

                  if (!todosModulos.length) {
                      container.innerHTML = '<p style="text-align:center;color:#cbd5e1;font-weight:bold;">Inscrição Padrão.</p>';
                      return;
                  }

                  function renderModulosEm(destino, participanteIdx) {
                      todosModulos.forEach(function(item) {
                          var mod = item.mod;
                          var campanhaId = item.campanhaId;
                          var valorNum = Number(mod.valor) || 0;
                          var checked = multi ? '' : 'checked';
                          var disabled = (!multi && todosModulos.length === 1) ? 'disabled' : '';
                          var idxAttr = multi ? (' data-participante-idx="' + participanteIdx + '"') : '';
                          destino.innerHTML += '<label data-campanha-id="' + campanhaId + '" style="display:flex;align-items:center;gap:14px;padding:16px;border:1px solid rgba(148,163,184,0.18);border-radius:16px;margin-bottom:12px;background:rgba(15,23,42,0.9);cursor:pointer;">'
                                  + '<input type="checkbox" name="modulo_id" value="' + mod.id + '" data-campanha-id="' + campanhaId + '" data-valor="' + valorNum + '"' + idxAttr + ' ' + checked + ' ' + disabled + ' style="margin:0;width:22px;height:22px;accent-color:#f5b21f;border-radius:6px;flex-shrink:0;">'
                                  + '<div style="line-height:1.35;color:#f8fafc;font-weight:700;font-size:0.97rem;">' + mod.nome + '</div>'
                                  + '</label>';
                      });
                  }

                  renderModulosEm(container, 1);

                  if (multi) {
                      container.insertAdjacentHTML('beforeend', '<div id="avisoDesconto" style="display:none;margin-top:4px;margin-bottom:4px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#4ade80;font-weight:600;font-size:0.9rem;"></div>');

                      document.querySelectorAll('[data-participante]').forEach(function(bloco) {
                          var idx = parseInt(bloco.getAttribute('data-participante'), 10);
                          var destino = document.createElement('div');
                          destino.style.cssText = 'background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 16px; margin-top: 12px;';
                          bloco.appendChild(destino);
                          renderModulosEm(destino, idx);
                      });

                      document.addEventListener('change', function(ev) {
                          if (ev.target && ev.target.name === 'modulo_id') calcularDescontoMulti();
                      });
                      calcularDescontoMulti();
                  }
              } catch (e) {
                  console.warn('Erro ao carregar módulos da campanha:', e);
              }
          }
          function calcularDescontoMulti() {
              var aviso = document.getElementById('avisoDesconto');
              if (!aviso) return;
              var qtdSelecionada = (function() {
                  var sel = document.querySelector('select[name="qtdInscritos"]') || document.getElementById('qtdInscritos');
                  return sel ? (parseInt(sel.value, 10) || 1) : 1;
              })();
              if (window.MODO_DESCONTO === 'por_organizacao') {
                  var todasCampanhas = new Set();
                  document.querySelectorAll('input[name="modulo_id"]:checked').forEach(function(cb) {
                      if (cb.dataset.campanhaId) todasCampanhas.add(cb.dataset.campanhaId);
                  });
                  var qtd = todasCampanhas.size;
                  var pct = qtd >= 3 ? 15 : qtd === 2 ? 10 : 0;
                  if (pct > 0) {
                      aviso.style.display = 'block';
                      aviso.textContent = '✓ Desconto de ' + pct + '% pra prefeitura, por cobrir ' + qtd + ' cursos do pacote!';
                  } else {
                      aviso.style.display = 'none';
                  }
              } else {
                  var linhas = [];
                  for (var idx = 1; idx <= qtdSelecionada; idx++) {
                      var campanhasPessoa = new Set();
                      document.querySelectorAll('input[name="modulo_id"][data-participante-idx="' + idx + '"]:checked').forEach(function(cb) {
                          if (cb.dataset.campanhaId) campanhasPessoa.add(cb.dataset.campanhaId);
                      });
                      if (campanhasPessoa.size === 0) continue;
                      var pctPessoa = campanhasPessoa.size >= 3 ? 15 : campanhasPessoa.size === 2 ? 10 : 0;
                      if (pctPessoa > 0) {
                          linhas.push('Participante ' + idx + ': ' + pctPessoa + '% de desconto (' + campanhasPessoa.size + ' cursos)');
                      }
                  }
                  if (linhas.length) {
                      aviso.style.display = 'block';
                      aviso.innerHTML = '✓ ' + linhas.join('<br>✓ ');
                  } else {
                      aviso.style.display = 'none';
                  }
              }
          }
```

- [ ] **Step 3: Remover a trava de `configurarQuantidadeInscritos` que escondia tudo em `MODO_MULTI`**

Essa trava foi uma correção temporária de uma sessão anterior, feita **antes** deste recurso existir — agora que o modo multi-campanha suporta participantes de verdade, a função volta a se comportar normalmente em qualquer modo.

Trecho atual:

```js
          function configurarQuantidadeInscritos() {
              var qtdSelect = document.querySelector('select[name="qtdInscritos"]') || document.getElementById('qtdInscritos');
              // Modo multi-campanha: o backend só processa 1 inscrito por chamada nesse
              // modo (branch inscricoes[] de /webhook/inscricao-externa), então nunca deixa
              // o visitante escolher "3 inscrições" pra não perder 2 delas silenciosamente.
              if (window.MODO_MULTI) {
                  if (qtdSelect && qtdSelect.parentNode) {
                      qtdSelect.parentNode.style.display = 'none';
                  }
                  document.querySelectorAll('[data-participante]').forEach(function(bloco) {
                      bloco.style.display = 'none';
                      bloco.querySelectorAll('input, select').forEach(function(campo) {
                          campo.required = false;
                      });
                  });
                  return;
              }
              if (!qtdSelect) return;
              function aplicar() {
                  var qtd = parseInt(qtdSelect.value, 10) || 1;
                  document.querySelectorAll('[data-participante]').forEach(function(bloco) {
                      var idx = parseInt(bloco.getAttribute('data-participante'), 10);
                      var visivel = idx <= qtd;
                      bloco.style.display = visivel ? '' : 'none';
                      bloco.querySelectorAll('input, select').forEach(function(campo) {
                          campo.required = visivel;
                      });
                  });
              }
              qtdSelect.addEventListener('change', aplicar);
              aplicar();
          }
```

Substituir por:

```js
          function configurarQuantidadeInscritos() {
              var qtdSelect = document.querySelector('select[name="qtdInscritos"]') || document.getElementById('qtdInscritos');
              if (!qtdSelect) return;
              function aplicar() {
                  var qtd = parseInt(qtdSelect.value, 10) || 1;
                  document.querySelectorAll('[data-participante]').forEach(function(bloco) {
                      var idx = parseInt(bloco.getAttribute('data-participante'), 10);
                      var visivel = idx <= qtd;
                      bloco.style.display = visivel ? '' : 'none';
                      bloco.querySelectorAll('input, select').forEach(function(campo) {
                          if (campo.name && campo.name.indexOf('modulo_id') === 0) return;
                          campo.required = visivel;
                      });
                  });
              }
              qtdSelect.addEventListener('change', aplicar);
              aplicar();
          }
```

(A checagem `campo.name.indexOf('modulo_id') === 0` evita que `aplicar()` force `required=true` em checkboxes de módulo — eles são validados à parte, no Step 4 abaixo, porque "pelo menos 1 marcado" não é a mesma regra que o atributo HTML `required` expressa por checkbox individual.)

- [ ] **Step 4: Validação por participante e novo payload no submit**

Trecho atual (validação de módulos, antes de montar `dadosPessoa`):

```js
                  if (document.querySelectorAll('[id^="containerModulos"] input[name="modulo_id"]').length > 0 && mods.length === 0) {
                      if (fb) {
                          fb.innerHTML = "Por favor selecione pelo menos um módulo.";
                          fb.style.background = "#f8d7da";
                          fb.style.color = "#721c24";
                          fb.style.display = "block";
                      }
                      if (btn) { btn.disabled = false; btn.innerText = "ENVIAR INSCRIÇÃO"; }
                      return;
                  }
```

Substituir por:

```js
                  var qtdSelecionadaValidacao = (function() {
                      var sel = document.querySelector('select[name="qtdInscritos"]') || document.getElementById('qtdInscritos');
                      return sel ? (parseInt(sel.value, 10) || 1) : 1;
                  })();

                  if (window.MODO_MULTI) {
                      for (var vIdx = 1; vIdx <= qtdSelecionadaValidacao; vIdx++) {
                          var marcadosParticipante = document.querySelectorAll('input[name="modulo_id"][data-participante-idx="' + vIdx + '"]:checked');
                          if (marcadosParticipante.length === 0) {
                              if (fb) {
                                  fb.innerHTML = "Selecione pelo menos um curso para o participante " + vIdx + ".";
                                  fb.style.background = "#f8d7da";
                                  fb.style.color = "#721c24";
                                  fb.style.display = "block";
                              }
                              if (btn) { btn.disabled = false; btn.innerText = "ENVIAR INSCRIÇÃO"; }
                              return;
                          }
                      }
                  } else if (document.querySelectorAll('[id^="containerModulos"] input[name="modulo_id"]').length > 0 && mods.length === 0) {
                      if (fb) {
                          fb.innerHTML = "Por favor selecione pelo menos um módulo.";
                          fb.style.background = "#f8d7da";
                          fb.style.color = "#721c24";
                          fb.style.display = "block";
                      }
                      if (btn) { btn.disabled = false; btn.innerText = "ENVIAR INSCRIÇÃO"; }
                      return;
                  }
```

Trecho atual (montagem do payload multi-campanha):

```js
                  var payload;
                  if (window.MODO_MULTI && window.CAMPANHAS_IDS && window.CAMPANHAS_IDS.length > 1) {
                      var checksMarcados = Array.from(document.querySelectorAll('input[name="modulo_id"]:checked'));
                      var porCampanha = {};
                      checksMarcados.forEach(function(cb) {
                          var cid = cb.dataset.campanhaId;
                          if (cid) { if (!porCampanha[cid]) porCampanha[cid] = []; porCampanha[cid].push(parseInt(cb.value)); }
                      });
                      var qtdCamps = Object.keys(porCampanha).length;
                      var descontoPct = qtdCamps >= 3 ? 15 : qtdCamps === 2 ? 10 : 0;
                      var inscricoes = Object.entries(porCampanha).map(function(entry) {
                          return { campanha_id: parseInt(entry[0]), modulos_ids: entry[1], desconto_percentual: descontoPct };
                      });
                      payload = Object.assign({}, dadosPessoa, {
                          inscricoes: inscricoes,
                          desconto_percentual: descontoPct,
                          desconto_motivo: descontoPct > 0 ? 'Inscricao em ' + qtdCamps + ' cursos do pacote — desconto de ' + descontoPct + '%' : '',
                      });
                  } else {
                      payload = Object.assign({}, dadosPessoa, {
                          curso_id: window.CAMPANHA_ID_ATUAL,
                          curso_nome: window.CURSO_NOME_ATUAL,
                          modulos_ids: mods,
                      });
                  }
```

Substituir por:

```js
                  var payload;
                  if (window.MODO_MULTI && window.CAMPANHAS_IDS && window.CAMPANHAS_IDS.length > 1) {
                      var participantesEnvio = [];
                      for (var pIdx2 = 1; pIdx2 <= qtdSelecionadaEnvio; pIdx2++) {
                          var sufixo = pIdx2 === 1 ? '' : ('_' + pIdx2);
                          var marcados = Array.from(document.querySelectorAll('input[name="modulo_id"][data-participante-idx="' + pIdx2 + '"]:checked'));
                          var porCampanhaPessoa = {};
                          marcados.forEach(function(cb) {
                              var cid = cb.dataset.campanhaId;
                              if (cid) { if (!porCampanhaPessoa[cid]) porCampanhaPessoa[cid] = []; porCampanhaPessoa[cid].push(parseInt(cb.value)); }
                          });
                          participantesEnvio.push({
                              nome: pIdx2 === 1 ? dadosPessoa.nome : getVal('nome' + sufixo),
                              email: pIdx2 === 1 ? dadosPessoa.email : getVal('email' + sufixo),
                              telefone: pIdx2 === 1 ? (dadosPessoa.whatsapp || dadosPessoa.telefone) : getVal('telefone' + sufixo),
                              formacao: pIdx2 === 1 ? dadosPessoa.formacao : getVal('formacao' + sufixo),
                              cargo: pIdx2 === 1 ? dadosPessoa.cargo : getVal('cargo' + sufixo),
                              campanhas: Object.entries(porCampanhaPessoa).map(function(entry) {
                                  return { campanha_id: parseInt(entry[0]), modulos_ids: entry[1] };
                              }),
                          });
                      }
                      payload = Object.assign({}, dadosPessoa, {
                          participantes: participantesEnvio,
                          modo_desconto: window.MODO_DESCONTO,
                      });
                  } else {
                      payload = Object.assign({}, dadosPessoa, {
                          curso_id: window.CAMPANHA_ID_ATUAL,
                          curso_nome: window.CURSO_NOME_ATUAL,
                          modulos_ids: mods,
                      });
                  }
```

- [ ] **Step 5: Verificar manualmente**

Sem ferramenta de browser disponível: reaproveitar o padrão jsdom já usado nesta branch/sessão anterior — extrair o script real de uma LP multi-campanha publicada localmente (`curl http://localhost:3001/lp/<slug>`), montar um HTML de teste com os elementos que as Tasks 6/7 do plano anterior já geram (inclusive `data-participante="2"`) mais duas/três campanhas linkadas, carregar em jsdom, simular: selecionar quantidade=2, marcar módulos diferentes para participante 1 e 2 (de campanhas diferentes), disparar `submit`, e inspecionar o `payload` que seria enviado ao `fetch` — confirmar que `participantes` tem 2 itens, cada um só com as campanhas que aquele participante marcou, e que `modo_desconto` reflete `window.MODO_DESCONTO`. Depois, com o backend local rodando, repetir via `curl` direto no `/webhook/inscricao-externa` (Task 2, Step 4) para validar o lado do servidor de ponta a ponta.

- [ ] **Step 6: Commit**

```bash
git add server.js
git commit -m "feat: formulario multi-campanha permite modulo por participante e envia payload participantes[]"
```

---

## Task 5: Editor da landing page — seletor "Modo de desconto"

**Files:**
- Modify: `frontend-crm/src/pages/LandingPages.jsx`

**Interfaces:**
- Consumes: `landing_pages.modo_desconto` (Task 1), aceito por `POST`/`PUT /landing-pages` (Task 3).
- Produces: estado `modoDesconto`, enviado em `salvarPagina`.

- [ ] **Step 1: Novo estado**

Trecho atual (perto de `campanhasIds`/`campanhaId`, no topo do componente):

```js
  const [campanhasIds, setCampanhasIds] = useState([]);
  const [dropdownCampanhasAberto, setDropdownCampanhasAberto] = useState(false);
```

Substituir por:

```js
  const [campanhasIds, setCampanhasIds] = useState([]);
  const [dropdownCampanhasAberto, setDropdownCampanhasAberto] = useState(false);
  const [modoDesconto, setModoDesconto] = useState('por_pessoa');
```

- [ ] **Step 2: Resetar ao abrir página nova**

Trecho atual (`abrirModalNovo`):

```js
  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setSlug(''); setStatusLP('rascunho'); setCampanhaId(''); setCampanhasIds([]); setHtmlInicial(''); setCssInicial(''); setExtraHtmlHead(''); setExtraBodyScripts(''); setHtmlAttributes(''); setBodyAttributes(''); setImportErro(''); setMostrarModal(true);
  }
```

Substituir por:

```js
  function abrirModalNovo() {
    setEditandoId(null); setNome(''); setSlug(''); setStatusLP('rascunho'); setCampanhaId(''); setCampanhasIds([]); setModoDesconto('por_pessoa'); setHtmlInicial(''); setCssInicial(''); setExtraHtmlHead(''); setExtraBodyScripts(''); setHtmlAttributes(''); setBodyAttributes(''); setImportErro(''); setMostrarModal(true);
  }
```

- [ ] **Step 3: Resetar na importação de HTML do Lovable**

Localizar, dentro de `handleImportarHtmlLovable`, as linhas:

```js
        setCampanhaId('');
        setCampanhasIds([]);
```

Substituir por:

```js
        setCampanhaId('');
        setCampanhasIds([]);
        setModoDesconto('por_pessoa');
```

- [ ] **Step 4: Carregar ao editar página existente**

Trecho atual (dentro de `abrirModalEdicao`):

```js
      setCampanhaId(lpCompleta.campanha_id || '');
      const cIds = lpCompleta.campanhas_ids
        ? (typeof lpCompleta.campanhas_ids === 'string' ? JSON.parse(lpCompleta.campanhas_ids) : lpCompleta.campanhas_ids)
        : (lpCompleta.campanha_id ? [Number(lpCompleta.campanha_id)] : []);
      setCampanhasIds(Array.isArray(cIds) ? cIds.map(Number) : []);
```

Substituir por:

```js
      setCampanhaId(lpCompleta.campanha_id || '');
      const cIds = lpCompleta.campanhas_ids
        ? (typeof lpCompleta.campanhas_ids === 'string' ? JSON.parse(lpCompleta.campanhas_ids) : lpCompleta.campanhas_ids)
        : (lpCompleta.campanha_id ? [Number(lpCompleta.campanha_id)] : []);
      setCampanhasIds(Array.isArray(cIds) ? cIds.map(Number) : []);
      setModoDesconto(lpCompleta.modo_desconto === 'por_organizacao' ? 'por_organizacao' : 'por_pessoa');
```

- [ ] **Step 5: Enviar no save**

Trecho atual (`salvarPagina`):

```js
    const payload = {
      nome,
      slug: slugFormatado,
      campanha_id: campanhasIds.length > 0 ? (campanhasIds[0] || null) : (campanhaId || null),
      campanhas_ids: campanhasIds.length > 1 ? campanhasIds : null,
      html_content: htmlComExtras,
      css_content: cssGerado,
    };
```

Substituir por:

```js
    const payload = {
      nome,
      slug: slugFormatado,
      campanha_id: campanhasIds.length > 0 ? (campanhasIds[0] || null) : (campanhaId || null),
      campanhas_ids: campanhasIds.length > 1 ? campanhasIds : null,
      modo_desconto: modoDesconto,
      html_content: htmlComExtras,
      css_content: cssGerado,
    };
```

- [ ] **Step 6: Campo na UI**

Trecho atual (dentro do `FormGroupInline` de "Campanhas do Formulário", logo depois do bloco `{campanhasIds.length === 0 && (...)}`):

```js
                  {campanhasIds.length === 0 && (
                    <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 3 }}>Nenhuma campanha — formulário sem vínculo</small>
                  )}
                </FormGroupInline>
```

Substituir por:

```js
                  {campanhasIds.length === 0 && (
                    <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 3 }}>Nenhuma campanha — formulário sem vínculo</small>
                  )}
                </FormGroupInline>

                {campanhasIds.length > 1 && (
                  <FormGroupInline style={{ flex: '1 1 180px' }}>
                    <label>Modo de desconto do pacote</label>
                    <Select value={modoDesconto} onChange={(e) => setModoDesconto(e.target.value)}>
                      <option value="por_pessoa">Por pessoa (cada um com seu desconto)</option>
                      <option value="por_organizacao">Por organização (desconto único pro grupo)</option>
                    </Select>
                  </FormGroupInline>
                )}
```

(`Select` já é usado em outros pontos deste mesmo formulário — ex.: "Status Inicial" — reaproveitado aqui sem criar um novo styled-component. O campo só aparece quando há mais de 1 campanha vinculada, já que com 0 ou 1 campanha o modo de desconto não tem efeito nenhum.)

- [ ] **Step 7: Verificar manualmente**

Rodar o frontend local, criar/editar uma landing page com 2+ campanhas vinculadas, confirmar que o seletor "Modo de desconto" aparece, trocar o valor, salvar, reabrir a página e confirmar que o valor persistiu. Confirmar que o seletor **não** aparece com 0 ou 1 campanha vinculada.

- [ ] **Step 8: Commit**

```bash
git add src/pages/LandingPages.jsx
git commit -m "feat: editor de landing page ganha seletor de modo de desconto do pacote"
```

---

## Task 6: Funil — exibir desconto individual de cada inscrito

**Files:**
- Modify: `frontend-crm/src/pages/Funil.jsx`

**Interfaces:**
- Consumes: `ins.desconto_percentual` (já vem em `inscritos_json`, gravado pela Task 2 do backend).

- [ ] **Step 1: Mostrar o desconto ao lado do valor das turmas do inscrito**

Trecho atual (dentro do bloco "Dados de cada inscrito no curso", label "Turmas deste inscrito"):

```js
                        {modoPacoteInscricao === 'por_inscrito' && modulosCampanha.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#198754', display: 'block', marginBottom: 6 }}>
                              Turmas deste inscrito
                              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                                ({formatarMoeda(somarValorModulos(ins.modulos_ids, modulosCampanha))})
                              </span>
                            </label>
```

Substituir por:

```js
                        {modoPacoteInscricao === 'por_inscrito' && modulosCampanha.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#198754', display: 'block', marginBottom: 6 }}>
                              Turmas deste inscrito
                              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                                ({formatarMoeda(somarValorModulos(ins.modulos_ids, modulosCampanha))})
                              </span>
                              {Number(ins.desconto_percentual) > 0 && (
                                <span style={{ fontWeight: 600, color: '#fd7e14', marginLeft: 8 }}>
                                  · {Number(ins.desconto_percentual)}% de desconto (vindo da landing page)
                                </span>
                              )}
                            </label>
```

Este campo é só leitura nesta fase (preenchido pela landing page via `desconto_percentual` em `inscritos_json`) — não precisa de input editável nem de mudança em `atualizarInscrito`/`inscritoVazio`.

- [ ] **Step 2: Verificar manualmente**

Usando a negociação criada no teste da Task 2 (Step 4) — a que tem um participante com 10% e outro com 0% na mesma campanha — abrir essa negociação no Funil local, entrar no modo "por inscrito", e confirmar que o participante com desconto mostra "10% de desconto (vindo da landing page)" ao lado do valor das turmas dele, e o outro não mostra nada.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Funil.jsx
git commit -m "feat: Funil exibe desconto individual do inscrito vindo da landing page"
```

---

## Verificação final (ponta a ponta)

1. Criar/reaproveitar uma campanha "trilha" com 3-4 campanhas separadas, cada uma com módulos.
2. Criar uma landing page vinculando todas, modo de desconto "por pessoa".
3. Publicar, abrir a URL pública, selecionar quantidade = 3, cada participante marcando cursos diferentes (um cobrindo 2 campanhas, os outros 1 cada).
4. Enviar e conferir no Funil: as negociações corretas foram criadas/atualizadas, cada uma só com os participantes que escolheram aquela campanha, com o desconto individual certo.
5. Repetir com modo "por organização" e confirmar desconto uniforme baseado na união das campanhas do grupo.
6. Confirmar que uma landing page de campanha única continua funcionando exatamente como antes (sem seletor de modo de desconto, sem módulo por participante).
