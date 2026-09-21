# Formulário de Inscrição da Landing Page — Forma de Pagamento, Múltiplos Participantes e Responsividade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo "Forma de pagamento" (Empenho/Depósito bancário) e suporte a 1-5 participantes por inscrição ao formulário público das landing pages, e tornar o layout desse formulário responsivo sem exigir ajuste manual.

**Architecture:** O fluxo atravessa dois repositórios. No backend (`server CRUD/server.js`), a rota pública `POST /webhook/inscricao-externa` grava em `oportunidades` (coluna nova `forma_pagamento`, e reaproveita `inscritos_json`/`qtd_inscritos` que já existem); a rota `GET /lp/:slug` injeta, a cada requisição, um `<script>` (`scriptFormulario`) que roda no navegador de quem se inscreve e é o único lugar com lógica de submissão. No frontend (`frontend-crm/src/pages/LandingPages.jsx`), dois pontos "vivos" de markup do formulário (bloco GrapesJS `rd-form` e a função `getMarkupFormularioCRM()`) precisam ganhar os novos campos e um `<style>` com media query embutido no próprio bloco. `Funil.jsx` e `Dashboard.jsx` (CRM interno) passam a exibir/editar `forma_pagamento`.

**Tech Stack:** React + Vite + styled-components (frontend-crm), Node/Express + `pg` sem ORM (server CRUD), Postgres (`crm_dev` local, porta 5433), GrapesJS (editor da landing page), JavaScript puro injetado como string no HTML publicado (sem framework).

**Spec:** `docs/superpowers/specs/2026-09-21-formulario-inscricao-lp-design.md`

## Global Constraints

- Teto fixo de 5 participantes por inscrição (sem campo livre, sem configuração).
- Módulo/turma do curso continua escolhido uma única vez para o grupo todo — nunca por participante.
- UF, Município e "Como você nos conheceu" continuam preenchidos uma única vez, para o grupo todo — nunca por participante.
- "Forma de pagamento" é um campo por inscrição/negociação (1 valor por submissão), obrigatório, com opções fixas `Empenho` e `Depósito bancário`.
- Reenvio do formulário para uma oportunidade já aberta: a forma de pagamento mais recente sobrescreve a anterior (mesmo padrão já usado no endpoint para `origem_lead`).
- Não criar tabela nova nem mudar o shape de `inscritos_json` (`nome, email, telefone, formacao, cargo, contato_id, modulos_ids`) além do que já existe.
- Este backend não tem migrations versionadas: todo DDL é `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, escrito direto no topo do `server.js`, idempotente, rodando a cada boot.
- Não há framework de teste para rotas Express nem para os blocos GrapesJS (strings de HTML) neste projeto — só existem testes automatizados (`vitest`) para utilitários de lógica pura em `frontend-crm/src/utils/*.test.js`. Este plano segue o padrão existente: verificação manual (curl / UI local) para tudo que não é lógica pura, sem inventar testes automatizados que o projeto não usa para este tipo de código.
- Ordem de publicação real (fora do escopo deste plano, mas vale lembrar): backend primeiro, frontend depois — só se aplica quando for de fato publicar em produção.

---

## Task 1: Migração — coluna `oportunidades.forma_pagamento`

**Files:**
- Modify: `server CRUD/server.js:440-445` (bloco de migrações de `oportunidades`)

**Interfaces:**
- Produces: coluna `oportunidades.forma_pagamento VARCHAR(30)` (nullable), disponível para todas as tasks seguintes.

- [ ] **Step 1: Adicionar o bloco de migração**

Local exato: logo após o bloco existente de `ultima_interacao` (linhas 443-445):

```js
pool.query(`
  ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ
`).catch((err) => console.warn('Aviso migração ultima_interacao:', err.message));
```

Inserir logo abaixo, novo bloco:

```js
pool.query(`
  ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30)
`).catch((err) => console.warn('Aviso migração forma_pagamento:', err.message));
```

- [ ] **Step 2: Verificar manualmente**

Reiniciar o backend local (`npm run dev` em `server CRUD`, porta 3001) e conferir no log que **não** aparece o aviso `Aviso migração forma_pagamento:` (se aparecer, leia a mensagem de erro nela — indica que a coluna não pôde ser criada). Se tiver acesso ao Postgres local (`crm_dev`, porta 5433), confirmar com:

```sql
\d oportunidades
```

e verificar que `forma_pagamento` aparece na lista de colunas como `character varying(30)`.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: adiciona coluna forma_pagamento em oportunidades"
```

---

## Task 2: `POST /webhook/inscricao-externa` grava `forma_pagamento`

**Files:**
- Modify: `server CRUD/server.js:3057-3061` (destructure do payload)
- Modify: `server CRUD/server.js:3116-3130` (modo multi-campanha: UPDATE e INSERT)
- Modify: `server CRUD/server.js:3259-3285` (modo legado: UPDATE e INSERT)

**Interfaces:**
- Consumes: coluna `oportunidades.forma_pagamento` (Task 1).
- Produces: campo `forma_pagamento` no corpo aceito por `POST /webhook/inscricao-externa`, persistido em `oportunidades` nos dois modos (multi-campanha e legado), tanto na criação quanto na atualização de uma oportunidade existente.

- [ ] **Step 1: Ler `forma_pagamento` do corpo da requisição**

Trecho atual (`server.js:3057-3061`):

```js
  const {
    nome, email, whatsapp, telefone, curso_id, modulos_ids, setor, cargo, formacao,
    cidade, municipio, uf, curso_nome, inscritos, qtd_inscritos, origem,
    inscricoes, desconto_percentual, desconto_motivo, tipo_orgao,
  } = req.body;
```

Substituir por:

```js
  const {
    nome, email, whatsapp, telefone, curso_id, modulos_ids, setor, cargo, formacao,
    cidade, municipio, uf, curso_nome, inscritos, qtd_inscritos, origem,
    inscricoes, desconto_percentual, desconto_motivo, tipo_orgao, forma_pagamento,
  } = req.body;
```

- [ ] **Step 2: Gravar no modo multi-campanha (UPDATE de oportunidade existente)**

Trecho atual (`server.js:3116-3120`):

```js
          await client.query(
            `UPDATE oportunidades SET status='inscricao', etapa_id=$1, modulos_ids=$2, qtd_inscritos=$3,
             inscritos_json=$4, valor=$5, atualizado_em=CURRENT_TIMESTAMP, origem_lead=COALESCE($7,origem_lead) WHERE id=$6`,
            [inscritoId, JSON.stringify(modulosIds), merged.length, JSON.stringify(merged), valorFinal, oportunidadeId, origem || null]
          );
```

Substituir por:

```js
          await client.query(
            `UPDATE oportunidades SET status='inscricao', etapa_id=$1, modulos_ids=$2, qtd_inscritos=$3,
             inscritos_json=$4, valor=$5, atualizado_em=CURRENT_TIMESTAMP, origem_lead=COALESCE($7,origem_lead),
             forma_pagamento=COALESCE($8, forma_pagamento) WHERE id=$6`,
            [inscritoId, JSON.stringify(modulosIds), merged.length, JSON.stringify(merged), valorFinal, oportunidadeId, origem || null, forma_pagamento || null]
          );
```

- [ ] **Step 3: Gravar no modo multi-campanha (INSERT de oportunidade nova)**

Trecho atual (`server.js:3125-3130`):

```js
          const novaOp = await client.query(
            `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, campanha_id, status, origem_venda, modulos_ids, qtd_inscritos, inscritos_json, origem_lead)
             VALUES ($1,$2,$3,$4,$5,$6,'inscricao','landing_page',$7,$8,$9,$10) RETURNING id`,
            [`Inscrição Web - ${empresaNome}`, valorFinal, contatoId, empresaId, inscritoId, cursoId,
             JSON.stringify(modulosIds), inscritosNovos.length, JSON.stringify(inscritosNovos), origem || null]
          );
```

Substituir por:

```js
          const novaOp = await client.query(
            `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, campanha_id, status, origem_venda, modulos_ids, qtd_inscritos, inscritos_json, origem_lead, forma_pagamento)
             VALUES ($1,$2,$3,$4,$5,$6,'inscricao','landing_page',$7,$8,$9,$10,$11) RETURNING id`,
            [`Inscrição Web - ${empresaNome}`, valorFinal, contatoId, empresaId, inscritoId, cursoId,
             JSON.stringify(modulosIds), inscritosNovos.length, JSON.stringify(inscritosNovos), origem || null, forma_pagamento || null]
          );
```

- [ ] **Step 4: Gravar no modo legado (UPDATE de oportunidade existente)**

Trecho atual (`server.js:3259-3264`):

```js
      await client.query(
        `UPDATE oportunidades SET status = 'inscricao', etapa_id = $1, modulos_ids = $2,
         qtd_inscritos = $3, inscritos_json = $4, atualizado_em = CURRENT_TIMESTAMP,
         origem_lead = COALESCE($6, origem_lead) WHERE id = $5`,
        [inscritoId, JSON.stringify(modulos_ids || []), qtdFinal, JSON.stringify(merged), oportunidadeId, origem || null]
      );
```

Substituir por:

```js
      await client.query(
        `UPDATE oportunidades SET status = 'inscricao', etapa_id = $1, modulos_ids = $2,
         qtd_inscritos = $3, inscritos_json = $4, atualizado_em = CURRENT_TIMESTAMP,
         origem_lead = COALESCE($6, origem_lead), forma_pagamento = COALESCE($7, forma_pagamento) WHERE id = $5`,
        [inscritoId, JSON.stringify(modulos_ids || []), qtdFinal, JSON.stringify(merged), oportunidadeId, origem || null, forma_pagamento || null]
      );
```

- [ ] **Step 5: Gravar no modo legado (INSERT de oportunidade nova)**

Trecho atual (`server.js:3270-3285`):

```js
      const novaOp = await client.query(
        `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, campanha_id, status, origem_venda, modulos_ids, qtd_inscritos, inscritos_json, origem_lead)
         VALUES ($1, $2, $3, $4, $5, $6, 'inscricao', 'landing_page', $7, $8, $9, $10) RETURNING id`,
        [
          `Inscrição Web - ${empresaNome}`,
          valorTotal,
          contatoId,
          empresaId,
          inscritoId,
          curso_id,
          JSON.stringify(modulos_ids || []),
          qtdFinal,
          JSON.stringify(inscritosNovos),
          origem || null,
        ]
      );
```

Substituir por:

```js
      const novaOp = await client.query(
        `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, campanha_id, status, origem_venda, modulos_ids, qtd_inscritos, inscritos_json, origem_lead, forma_pagamento)
         VALUES ($1, $2, $3, $4, $5, $6, 'inscricao', 'landing_page', $7, $8, $9, $10, $11) RETURNING id`,
        [
          `Inscrição Web - ${empresaNome}`,
          valorTotal,
          contatoId,
          empresaId,
          inscritoId,
          curso_id,
          JSON.stringify(modulos_ids || []),
          qtdFinal,
          JSON.stringify(inscritosNovos),
          origem || null,
          forma_pagamento || null,
        ]
      );
```

- [ ] **Step 6: Verificar manualmente (curl, modo legado)**

Com o backend local rodando e pelo menos uma campanha/módulo cadastrado (`curso_id` válido), rodar:

```bash
curl -X POST http://localhost:3001/webhook/inscricao-externa \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Plano",
    "email": "teste.plano@example.com",
    "whatsapp": "51999999999",
    "cidade": "Taquara",
    "uf": "RS",
    "curso_id": 1,
    "modulos_ids": [],
    "origem": "Instagram",
    "forma_pagamento": "Empenho"
  }'
```

Esperado: resposta `200` com `{ "mensagem": "...", "oportunidade_id": <id>, "empresa_id": <id> }`. Depois, abrir o Funil no CRM local, localizar a negociação criada (prefeitura "Taquara") e, via `GET /oportunidades` (já usado pela tela), confirmar no objeto retornado que `forma_pagamento` está `"Empenho"` (pode conferir pela aba de rede do navegador, já que a Task 8 ainda não expõe isso na UI).

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "feat: grava forma_pagamento no webhook publico de inscricao"
```

---

## Task 3: `POST /oportunidades` e `PUT /oportunidades/:id` (edição manual no Funil) gravam `forma_pagamento`

**Files:**
- Modify: `server CRUD/server.js:2154-2205` (`POST /oportunidades`)
- Modify: `server CRUD/server.js:2333-2373` (`PUT /oportunidades/:id`)

**Interfaces:**
- Consumes: coluna `oportunidades.forma_pagamento` (Task 1).
- Produces: `forma_pagamento` aceito e persistido também quando uma negociação é criada/editada manualmente pelo time comercial no Funil (não só via landing page).

- [ ] **Step 1: `POST /oportunidades` — destructure e INSERT**

Trecho atual (`server.js:2155-2158`):

```js
  const {
    titulo, valor, contato_id, empresa_id, etapa_id, observacoes, campanha_id, status,
    vendedor_id, modulos_ids, desconto, contatos_ids, qtd_inscritos, inscritos_json,
  } = req.body;
```

Substituir por:

```js
  const {
    titulo, valor, contato_id, empresa_id, etapa_id, observacoes, campanha_id, status,
    vendedor_id, modulos_ids, desconto, contatos_ids, qtd_inscritos, inscritos_json, forma_pagamento,
  } = req.body;
```

Trecho atual (`server.js:2197-2205`):

```js
    const novo = await client.query(
      `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, observacoes, campanha_id, status, vendedor_id, origem_venda, modulos_ids, desconto, qtd_inscritos, inscritos_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'vendedor', $10, $11, $12, $13) RETURNING *`,
      [
        titulo, valor || 0, contatoPrincipal, empresa_id || null, etapa_id, observacoes || '',
        campanha_id || null, status || 'aberto', vendedor_id || req.usuarioId,
        JSON.stringify(modulos_ids || []), desconto || 0, qtdInscritos, JSON.stringify(inscritosNorm),
      ]
    );
```

Substituir por:

```js
    const novo = await client.query(
      `INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, observacoes, campanha_id, status, vendedor_id, origem_venda, modulos_ids, desconto, qtd_inscritos, inscritos_json, forma_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'vendedor', $10, $11, $12, $13, $14) RETURNING *`,
      [
        titulo, valor || 0, contatoPrincipal, empresa_id || null, etapa_id, observacoes || '',
        campanha_id || null, status || 'aberto', vendedor_id || req.usuarioId,
        JSON.stringify(modulos_ids || []), desconto || 0, qtdInscritos, JSON.stringify(inscritosNorm), forma_pagamento || null,
      ]
    );
```

- [ ] **Step 2: `PUT /oportunidades/:id` — destructure e UPDATE**

Trecho atual (`server.js:2335-2338`):

```js
  const {
    titulo, valor, contato_id, empresa_id, etapa_id, status, observacoes, campanha_id,
    vendedor_id, modulos_ids, desconto, contatos_ids, qtd_inscritos, inscritos_json, motivo_perda,
  } = req.body;
```

Substituir por:

```js
  const {
    titulo, valor, contato_id, empresa_id, etapa_id, status, observacoes, campanha_id,
    vendedor_id, modulos_ids, desconto, contatos_ids, qtd_inscritos, inscritos_json, motivo_perda, forma_pagamento,
  } = req.body;
```

Trecho atual (`server.js:2365-2373`):

```js
    const result = await client.query(
      `UPDATE oportunidades SET titulo=$1, valor=$2, contato_id=$3, empresa_id=$4, etapa_id=$5, status=$6, observacoes=$7, campanha_id=$8, vendedor_id=$9, modulos_ids=$10, desconto=$11, qtd_inscritos=$12, inscritos_json=$13, motivo_perda=$14, atualizado_em=CURRENT_TIMESTAMP WHERE id=$15 RETURNING *`,
      [
        titulo, valor || 0, contatoPrincipal, empresa_id || null, etapa_id, status || 'aberto',
        observacoes || '', campanha_id || null, vendedor_id || null, JSON.stringify(modulos_ids || []),
        desconto || 0, qtdInscritos, JSON.stringify(inscritosNorm),
        (status === 'perdido' ? (motivo_perda || null) : null), id,
      ]
    );
```

Substituir por:

```js
    const result = await client.query(
      `UPDATE oportunidades SET titulo=$1, valor=$2, contato_id=$3, empresa_id=$4, etapa_id=$5, status=$6, observacoes=$7, campanha_id=$8, vendedor_id=$9, modulos_ids=$10, desconto=$11, qtd_inscritos=$12, inscritos_json=$13, motivo_perda=$14, forma_pagamento=$15, atualizado_em=CURRENT_TIMESTAMP WHERE id=$16 RETURNING *`,
      [
        titulo, valor || 0, contatoPrincipal, empresa_id || null, etapa_id, status || 'aberto',
        observacoes || '', campanha_id || null, vendedor_id || null, JSON.stringify(modulos_ids || []),
        desconto || 0, qtdInscritos, JSON.stringify(inscritosNorm),
        (status === 'perdido' ? (motivo_perda || null) : null), forma_pagamento || null, id,
      ]
    );
```

- [ ] **Step 3: Verificar manualmente**

`GET /oportunidades` já faz `SELECT o.*, ...` (`server.js:2112`), então `forma_pagamento` passa a vir automaticamente em toda listagem assim que a coluna existir (Task 1) — não precisa de mudança nessa rota. Confirmar rodando o backend local, autenticando (token de um usuário de teste) e chamando:

```bash
curl -X POST http://localhost:3001/oportunidades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "titulo": "Teste forma_pagamento manual",
    "empresa_id": <id de empresa existente>,
    "contatos_ids": [<id de contato existente>],
    "etapa_id": <id de etapa existente>,
    "forma_pagamento": "Depósito bancário"
  }'
```

Esperado: objeto retornado (`RETURNING *`) contém `"forma_pagamento": "Depósito bancário"`.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: aceita forma_pagamento na criacao/edicao manual de oportunidades"
```

---

## Task 4: `GET /dashboard/inscritos` expõe `forma_pagamento`

**Files:**
- Modify: `server CRUD/server.js:2485-2498`

**Interfaces:**
- Consumes: coluna `oportunidades.forma_pagamento` (Task 1).
- Produces: campo `forma_pagamento` em cada linha retornada por `GET /dashboard/inscritos`, consumido pela Task 9 (Dashboard.jsx).

- [ ] **Step 1: Adicionar a coluna ao SELECT**

Trecho atual (`server.js:2485-2498`):

```js
    const query = `
      SELECT o.id AS oportunidade_id, o.titulo AS oportunidade_titulo, o.qtd_inscritos, o.inscritos_json,
        c.nome AS contato_nome, c.emails_json, c.telefones_json,
        e.nome AS empresa_nome, camp.nome AS curso_nome, camp.id AS campanha_id,
        o.atualizado_em AS data_inscricao, o.modulos_ids, o.origem_venda, o.origem_lead,
        u.nome AS vendedor_nome
      FROM oportunidades o
      LEFT JOIN contatos c ON o.contato_id = c.id
      LEFT JOIN campanhas camp ON o.campanha_id = camp.id
      LEFT JOIN empresas e ON o.empresa_id = e.id
      LEFT JOIN usuarios u ON o.vendedor_id = u.id_usuario
      WHERE o.status IN ('inscricao', 'ganho')
      ORDER BY o.atualizado_em DESC
    `;
```

Substituir por:

```js
    const query = `
      SELECT o.id AS oportunidade_id, o.titulo AS oportunidade_titulo, o.qtd_inscritos, o.inscritos_json,
        c.nome AS contato_nome, c.emails_json, c.telefones_json,
        e.nome AS empresa_nome, camp.nome AS curso_nome, camp.id AS campanha_id,
        o.atualizado_em AS data_inscricao, o.modulos_ids, o.origem_venda, o.origem_lead, o.forma_pagamento,
        u.nome AS vendedor_nome
      FROM oportunidades o
      LEFT JOIN contatos c ON o.contato_id = c.id
      LEFT JOIN campanhas camp ON o.campanha_id = camp.id
      LEFT JOIN empresas e ON o.empresa_id = e.id
      LEFT JOIN usuarios u ON o.vendedor_id = u.id_usuario
      WHERE o.status IN ('inscricao', 'ganho')
      ORDER BY o.atualizado_em DESC
    `;
```

- [ ] **Step 2: Verificar manualmente**

Com o backend local rodando e usando a oportunidade criada na Task 2 (Step 6, com `forma_pagamento: "Empenho"`), chamar autenticado:

```bash
curl http://localhost:3001/dashboard/inscritos -H "Authorization: Bearer <token>"
```

Esperado: a linha correspondente traz `"forma_pagamento": "Empenho"`.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: expoe forma_pagamento em GET /dashboard/inscritos"
```

---

## Task 5: Script injetado na landing page — quantidade de participantes e forma de pagamento no payload

**Files:**
- Modify: `server CRUD/server.js:4858-4861` (chamadas de inicialização)
- Modify: `server CRUD/server.js:4897-4934` (handler de submit)

**Interfaces:**
- Consumes: campos HTML `#qtdInscritos`, `#forma_pagamento` e blocos `[data-participante="2"]` até `[data-participante="5"]` com inputs `nome_N`/`email_N`/`telefone_N`/`formacao_N`/`cargo_N` (produzidos pelas Tasks 6 e 7).
- Produces: no modo legado (single campanha), o payload de `/webhook/inscricao-externa` passa a incluir `inscritos: [...]`, `qtd_inscritos` e `forma_pagamento`, consumidos pela Task 2.

- [ ] **Step 1: Adicionar a função que mostra/esconde os blocos de participante**

Local: logo depois da função `inicializarSelectsLocalizacao` (fecha em `server.js:4857`) e antes das chamadas de inicialização (`server.js:4858`).

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
                          campo.required = visivel;
                      });
                  });
              }
              qtdSelect.addEventListener('change', aplicar);
              aplicar();
          }
```

- [ ] **Step 2: Chamar a nova função na inicialização**

Trecho atual (`server.js:4858-4861`):

```js
          prepararFormulario();
          habilitarAutocompleteFormulario();
          injetarCampoOrigem();
          inicializarSelectsLocalizacao();
```

Substituir por:

```js
          prepararFormulario();
          habilitarAutocompleteFormulario();
          injetarCampoOrigem();
          inicializarSelectsLocalizacao();
          configurarQuantidadeInscritos();
```

- [ ] **Step 3: Montar `inscritos`/`qtd_inscritos`/`forma_pagamento` antes de montar o payload**

Trecho atual (`server.js:4897-4910`):

```js
                  var dadosPessoa = {
                      nome: getVal('nome'),
                      email: getVal('email'),
                      whatsapp: getVal('whatsapp'),
                      telefone: getVal('telefone'),
                      cidade: cidadeValue,
                      uf: ufValue,
                      setor: getVal('setor'),
                      cargo: getVal('cargo'),
                      formacao: getVal('formacao'),
                      origem: getVal('origem'),
                      tipo_orgao: getVal('tipo_orgao'),
                  };
                  var payload;
```

Substituir por:

```js
                  var dadosPessoa = {
                      nome: getVal('nome'),
                      email: getVal('email'),
                      whatsapp: getVal('whatsapp'),
                      telefone: getVal('telefone'),
                      cidade: cidadeValue,
                      uf: ufValue,
                      setor: getVal('setor'),
                      cargo: getVal('cargo'),
                      formacao: getVal('formacao'),
                      origem: getVal('origem'),
                      tipo_orgao: getVal('tipo_orgao'),
                  };

                  var qtdSelecionadaEnvio = (function() {
                      var sel = document.querySelector('select[name="qtdInscritos"]') || document.getElementById('qtdInscritos');
                      return sel ? (parseInt(sel.value, 10) || 1) : 1;
                  })();
                  var inscritosGrupo = [{
                      nome: dadosPessoa.nome,
                      email: dadosPessoa.email,
                      telefone: dadosPessoa.whatsapp || dadosPessoa.telefone,
                      formacao: dadosPessoa.formacao,
                      cargo: dadosPessoa.cargo,
                  }];
                  for (var pIdx = 2; pIdx <= qtdSelecionadaEnvio; pIdx++) {
                      inscritosGrupo.push({
                          nome: getVal('nome_' + pIdx),
                          email: getVal('email_' + pIdx),
                          telefone: getVal('telefone_' + pIdx),
                          formacao: getVal('formacao_' + pIdx),
                          cargo: getVal('cargo_' + pIdx),
                      });
                  }
                  dadosPessoa.inscritos = inscritosGrupo;
                  dadosPessoa.qtd_inscritos = qtdSelecionadaEnvio;
                  dadosPessoa.forma_pagamento = getVal('forma_pagamento');

                  var payload;
```

Isso funciona porque, logo abaixo, os dois ramos (`window.MODO_MULTI` e o modo legado) fazem `Object.assign({}, dadosPessoa, {...})` — como `inscritos`, `qtd_inscritos` e `forma_pagamento` já estão dentro de `dadosPessoa`, eles são propagados para o `payload` final nos dois casos sem precisar tocar nos dois blocos de montagem separadamente.

**Limitação conhecida, fora do escopo deste plano:** no modo `window.MODO_MULTI` (landing page vinculada a mais de uma campanha ao mesmo tempo, pacote com desconto), a rota `/webhook/inscricao-externa` (branch de `inscricoes[]`, `server.js:3066-3160`) ignora hoje qualquer `inscritos` recebido e sempre cria 1 participante por campanha do pacote. Ou seja: numa landing multi-campanha, o seletor de quantidade vai aparecer e o participante extra será enviado, mas o backend vai descartá-lo silenciosamente nesse modo específico. Se a Gestão A+ usar esse tipo de landing page (pacote de cursos) para inscrições em grupo, isso precisa de uma task própria depois (replicar `normalizarInscritosJson(inscritos)` dentro do loop de `inscricoes`) — não incluída aqui porque a spec aprovada não cobriu o modo multi-campanha.

- [ ] **Step 4: Verificar manualmente**

Repetir o `curl` do Task 2/Step 6, mas simulando o que o script montaria com 2 participantes:

```bash
curl -X POST http://localhost:3001/webhook/inscricao-externa \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Participante 1",
    "email": "p1@example.com",
    "whatsapp": "51988887777",
    "cidade": "Taquara",
    "uf": "RS",
    "curso_id": 1,
    "modulos_ids": [],
    "origem": "Facebook",
    "forma_pagamento": "Depósito bancário",
    "qtd_inscritos": 2,
    "inscritos": [
      { "nome": "Participante 1", "email": "p1@example.com", "telefone": "51988887777" },
      { "nome": "Participante 2", "email": "p2@example.com", "telefone": "51988886666" }
    ]
  }'
```

Esperado: `200 OK`. Confirmar via `GET /dashboard/inscritos` (Task 4) que a oportunidade correspondente tem `qtd_inscritos: 2` e `inscritos_json` com os 2 participantes.

Depois, com o backend local rodando, publicar (ou pré-visualizar) uma landing page de teste já com os campos das Tasks 6/7, selecionar "2" no seletor de quantidade, confirmar que os campos do 2º participante aparecem e ficam obrigatórios, preencher e enviar de verdade pelo navegador — conferir no Network que o `POST /webhook/inscricao-externa` sai com `inscritos` de 2 itens e `forma_pagamento` preenchido.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: formulario publico da LP envia forma_pagamento e multiplos participantes"
```

---

## Task 6: Bloco GrapesJS `rd-form` — novos campos e responsividade

**Files:**
- Modify: `frontend-crm/src/pages/LandingPages.jsx:557-673` (conteúdo do bloco `rd-form`)

**Interfaces:**
- Produces: HTML do bloco arrastável "Form. Inscrição" com `#qtdInscritos`, `#forma_pagamento`, blocos `[data-participante="2..5"]` e um `<style>` responsivo embutido — consumido em runtime pela Task 5.

- [ ] **Step 1: Substituir o conteúdo do bloco**

Localizar em `LandingPages.jsx` o bloco `editor.BlockManager.add('rd-form', { ... content: \`...\` })` (linhas 557-673) e substituir inteiramente a string do campo `content` por:

```js
        content: `
          <style>
            .lpfrm-field-half { flex: 1 1 calc(50% - 10px); min-width: 250px; }
            .lpfrm-field-full { flex: 1 1 100%; }
            .lpfrm-section-inscricao { padding: 80px 20px; }
            .lpfrm-download-link { min-width: 260px; }
            @media (max-width: 640px) {
              .lpfrm-field-half { flex: 1 1 100%; min-width: 0; }
              .lpfrm-section-inscricao { padding: 40px 16px; }
              .lpfrm-download-link { min-width: 0; width: 100%; }
            }
          </style>
          <section id="inscricao" class="lpfrm-section-inscricao" style="background-color: #ffffff; font-family: Arial, sans-serif;">
            <div style="max-width: 1100px; margin: 0 auto;">
                
                <div style="text-align: center; margin-bottom: 40px;">
                    <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; color: #F59E0B; margin-bottom: 10px;">Investimento e Inscrição</p>
                    <h2 style="font-size: 32px; font-weight: bold; color: #0B192C; margin: 0;">Garanta sua Vaga</h2>
                </div>

                <div style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #0B192C, #1E293B); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h3 style="font-size: 24px; font-weight: bold; color: #F59E0B; margin: 0;">Preencha seus dados</h3>
                        <p style="color: #cbd5e1; font-size: 15px; margin-top: 5px;">Seus dados serão enviados diretamente para nosso sistema seguro.</p>
                    </div>
                    
                    <form id="formInscricaoCRM" style="display: flex; flex-wrap: wrap; gap: 20px;">

                        <div class="lpfrm-field-full">
                            <label for="qtdInscritos" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Quantidade de inscrições*</label>
                            <select id="qtdInscritos" name="qtdInscritos" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(15,25,48,0.95); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                              <option value="1" style="background:#0f1930;color:#fff;">1 inscrição</option>
                              <option value="2" style="background:#0f1930;color:#fff;">2 inscrições</option>
                              <option value="3" style="background:#0f1930;color:#fff;">3 inscrições</option>
                              <option value="4" style="background:#0f1930;color:#fff;">4 inscrições</option>
                              <option value="5" style="background:#0f1930;color:#fff;">5 inscrições</option>
                            </select>
                        </div>
                        
                        <div class="lpfrm-field-full">
                            <label for="nome" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Nome Completo*</label>
                            <input type="text" id="nome" name="nome" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Seu nome completo">
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="email" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Email*</label>
                            <input type="email" id="email" name="email" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="seu@email.com">
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="whatsapp" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Telefone*</label>
                            <input type="tel" id="whatsapp" name="whatsapp" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="(00) 00000-0000">
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="formacao" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Formação*</label>
                            <input type="text" id="formacao" name="formacao" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Sua formação acadêmica">
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="cargo" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Cargo*</label>
                            <input type="text" id="cargo" name="cargo" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Seu cargo atual">
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="uf" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Estado*</label>
                            <select id="uf" name="uf" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(15,25,48,0.95); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                              <option value="" style="background:#0f1930;color:#fff;">Selecione o estado...</option>
                            </select>
                        </div>

                        <div class="lpfrm-field-half">
                            <label for="cidade" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Município*</label>
                            <select id="cidade" name="cidade" required disabled style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(15,25,48,0.95); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                              <option value="" style="background:#0f1930;color:#fff;">Primeiro selecione o estado...</option>
                            </select>
                        </div>

                        <div class="lpfrm-field-full" data-participante="2" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 20px; margin-top: 4px;">
                            <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:14px;">Participante 2</p>
                            <div style="display:flex; flex-wrap:wrap; gap:20px;">
                                <div class="lpfrm-field-full"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Nome Completo*</label><input type="text" id="nome_2" name="nome_2" placeholder="Nome completo do participante 2" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Email*</label><input type="email" id="email_2" name="email_2" placeholder="email@participante2.com" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Telefone*</label><input type="tel" id="telefone_2" name="telefone_2" placeholder="(00) 00000-0000" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Formação*</label><input type="text" id="formacao_2" name="formacao_2" placeholder="Formação acadêmica" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Cargo*</label><input type="text" id="cargo_2" name="cargo_2" placeholder="Cargo atual" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                            </div>
                        </div>

                        <div class="lpfrm-field-full" data-participante="3" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 20px; margin-top: 4px;">
                            <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:14px;">Participante 3</p>
                            <div style="display:flex; flex-wrap:wrap; gap:20px;">
                                <div class="lpfrm-field-full"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Nome Completo*</label><input type="text" id="nome_3" name="nome_3" placeholder="Nome completo do participante 3" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Email*</label><input type="email" id="email_3" name="email_3" placeholder="email@participante3.com" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Telefone*</label><input type="tel" id="telefone_3" name="telefone_3" placeholder="(00) 00000-0000" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Formação*</label><input type="text" id="formacao_3" name="formacao_3" placeholder="Formação acadêmica" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Cargo*</label><input type="text" id="cargo_3" name="cargo_3" placeholder="Cargo atual" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                            </div>
                        </div>

                        <div class="lpfrm-field-full" data-participante="4" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 20px; margin-top: 4px;">
                            <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:14px;">Participante 4</p>
                            <div style="display:flex; flex-wrap:wrap; gap:20px;">
                                <div class="lpfrm-field-full"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Nome Completo*</label><input type="text" id="nome_4" name="nome_4" placeholder="Nome completo do participante 4" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Email*</label><input type="email" id="email_4" name="email_4" placeholder="email@participante4.com" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Telefone*</label><input type="tel" id="telefone_4" name="telefone_4" placeholder="(00) 00000-0000" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Formação*</label><input type="text" id="formacao_4" name="formacao_4" placeholder="Formação acadêmica" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Cargo*</label><input type="text" id="cargo_4" name="cargo_4" placeholder="Cargo atual" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                            </div>
                        </div>

                        <div class="lpfrm-field-full" data-participante="5" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 20px; margin-top: 4px;">
                            <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:14px;">Participante 5</p>
                            <div style="display:flex; flex-wrap:wrap; gap:20px;">
                                <div class="lpfrm-field-full"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Nome Completo*</label><input type="text" id="nome_5" name="nome_5" placeholder="Nome completo do participante 5" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Email*</label><input type="email" id="email_5" name="email_5" placeholder="email@participante5.com" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Telefone*</label><input type="tel" id="telefone_5" name="telefone_5" placeholder="(00) 00000-0000" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Formação*</label><input type="text" id="formacao_5" name="formacao_5" placeholder="Formação acadêmica" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                                <div class="lpfrm-field-half"><label style="display:block; font-size:14px; font-weight:500; color:#f8fafc; margin-bottom:5px;">Cargo*</label><input type="text" id="cargo_5" name="cargo_5" placeholder="Cargo atual" style="width:100%; border-radius:6px; border:1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding:12px 16px; font-size:14px; color:#ffffff; outline:none;"></div>
                            </div>
                        </div>

                        <div class="lpfrm-field-full">
                            <label style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 8px;">Escolha o curso de seu interesse*</label>
                            
                            <div id="containerModulos" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 16px;">
                                <div style="color: #F59E0B; font-size: 14px; font-style: italic; text-align: center;">
                                  (Os módulos definidos na campanha aparecerão automaticamente aqui quando a página for publicada)
                                </div>
                            </div>
                        </div>

                        <div class="lpfrm-field-full">
                            <label for="origem" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Como você nos conheceu?*</label>
                            <select id="origem" name="origem" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                                <option value="" style="background:#0f1930; color:#fff;">Selecione...</option>
                                <option value="Instagram" style="background:#0f1930; color:#fff;">Instagram</option>
                                <option value="Facebook" style="background:#0f1930; color:#fff;">Facebook</option>
                                <option value="Indicação" style="background:#0f1930; color:#fff;">Indicação</option>
                                <option value="Ligação" style="background:#0f1930; color:#fff;">Ligação</option>
                                <option value="Whatsapp" style="background:#0f1930; color:#fff;">Whatsapp</option>
                                <option value="E-mail" style="background:#0f1930; color:#fff;">E-mail</option>
                                <option value="LinkedIn" style="background:#0f1930; color:#fff;">LinkedIn</option>
                                <option value="Outros" style="background:#0f1930; color:#fff;">Outros</option>
                            </select>
                        </div>

                        <div class="lpfrm-field-full">
                            <label for="forma_pagamento" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">Forma de pagamento*</label>
                            <select id="forma_pagamento" name="forma_pagamento" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;">
                                <option value="" style="background:#0f1930; color:#fff;">Selecione...</option>
                                <option value="Empenho" style="background:#0f1930; color:#fff;">Empenho</option>
                                <option value="Depósito bancário" style="background:#0f1930; color:#fff;">Depósito bancário</option>
                            </select>
                        </div>

                        <div class="lpfrm-field-full">
                            <label for="captchaCalc" style="display: block; font-size: 14px; font-weight: 500; color: #f8fafc; margin-bottom: 5px;">4 + 3 = ? *</label>
                            <input type="number" id="captchaCalc" name="captchaCalc" required style="width: 100%; border-radius: 6px; border: 1px solid rgba(248,250,252,0.2); background: rgba(248,250,252,0.05); padding: 12px 16px; font-size: 14px; color: #ffffff; outline: none;" placeholder="Soma matemática">
                        </div>

                        <div class="lpfrm-field-full" style="text-align: center; margin-top: 10px;">
                            <button type="submit" id="btnSubmit" style="width: 100%; background: linear-gradient(to right, #FCD34D, #F59E0B); color: #0B192C; padding: 16px 32px; font-size: 16px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.4);">
                                Enviar meus dados
                            </button>
                            <div id="feedback" style="display:none; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px; font-weight: bold;"></div>
                            <p style="margin-top: 16px; font-size: 12px; color: rgba(248,250,252,0.6);">Seus dados estão protegidos conosco.</p>
                              <div style="margin-top: 24px; border-radius: 30px; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); padding: 15px 28px; text-align: center; box-shadow: 0 25px 50px -25px rgba(0,0,0,0.35);">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B192C;">Consulte o conteúdo programático do curso.</p>
              <a href="https://drive.google.com/file/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" class="lpfrm-download-link" style="display:inline-flex; align-items:center; justify-content:center; gap:10px; margin-top: 18px; padding: 16px 24px; border-radius: 14px; background: #0B192C; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; box-shadow: 0 15px 30px rgba(0,0,0,0.18);">
                <span style="display: inline-flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <path d="M12 16.5V3" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 10.5L12 16.5L18 10.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 20.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  BAIXAR FOLDER DO CURSO (PDF)
                </span>
              </a>
            </div>
                            </div>

                    </form>
                </div>
            </div>
          </section>
        `,
```

Nota importante sobre CSS: os wrappers de campo agora usam `class="lpfrm-field-half"` / `class="lpfrm-field-full"` **em vez de** `style="flex: 1 1 calc(50% - 10px); min-width: 250px;"` / `style="flex: 1 1 100%;"`. Isso é proposital — estilo inline tem especificidade maior que qualquer regra de classe, então a media query só funciona se essas propriedades **saírem** do `style` inline e forem controladas só pela classe.

- [ ] **Step 2: Verificar manualmente**

Rodar o frontend local (`npm run dev`), abrir o editor de uma landing page de teste, arrastar o bloco "Form. Inscrição" para o canvas. Confirmar visualmente:
- O seletor "Quantidade de inscrições" aparece no topo, com 1 selecionado por padrão, e os blocos de participante 2-5 ficam escondidos.
- O campo "Forma de pagamento" aparece entre "Como você nos conheceu?" e "4 + 3 = ?".
- Abrir o painel "Ver/editar HTML e CSS" (botão de código do GrapesJS) e confirmar que a tag `<style>` com a media query aparece no HTML exportado (ou, se o GrapesJS mover o conteúdo para o CSS separado do editor, que as regras `.lpfrm-field-half`/`.lpfrm-section-inscricao`/`.lpfrm-download-link` aparecem no CSS exportado).
- Publicar a página e abrir a URL pública (`/lp/:slug`) no navegador, usando as ferramentas de desenvolvedor para simular uma largura de tela ≤ 640px — confirmar que os campos empilham em 1 coluna sem precisar de ajuste manual.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LandingPages.jsx
git commit -m "feat: bloco de formulario da LP ganha forma de pagamento, quantidade de inscritos e layout responsivo"
```

---

## Task 7: `getMarkupFormularioCRM()` — mesmos campos e responsividade

**Files:**
- Modify: `frontend-crm/src/pages/LandingPages.jsx:62-158` (função `getMarkupFormularioCRM`)

**Interfaces:**
- Produces: mesmo conjunto de campos da Task 6 (`#qtdInscritos`, `#forma_pagamento`, blocos `[data-participante]`) na cópia do markup usada quando uma página é importada do Lovable com o placeholder `CRM_FORM_INJECT_ZONE`.

- [ ] **Step 1: Substituir o corpo da função**

Localizar `const getMarkupFormularioCRM = () => \`...\`;` (linhas 62-158) e substituir inteiramente pelo template abaixo:

```js
  const getMarkupFormularioCRM = () => `
    <style>
      .lpfrm-row2 { display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .lpfrm-section-inscricao { padding: 80px 20px; }
      @media (max-width: 640px) {
        .lpfrm-row2 { grid-template-columns: 1fr; }
        .lpfrm-section-inscricao { padding: 40px 16px; }
      }
    </style>
    <section id="inscricao" class="lpfrm-section-inscricao" style="background: #0B192C; border-radius: 24px; color: #f8fafc; font-family: Arial, sans-serif;">
      <div style="max-width: 1100px; margin: 0 auto;">
        <div style="margin-bottom: 40px; text-align: center;">
          <p style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #F59E0B; margin: 0 0 10px;">Capacitação aplicada</p>
          <h2 style="font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin: 0; color: #ffffff;">Garanta sua vaga na turma</h2>
          <p style="margin: 16px auto 0; max-width: 720px; color: #cbd5e1; font-size: 1rem; line-height: 1.8;">Preencha seus dados abaixo e receba a inscrição diretamente no CRM.</p>
        </div>

        <div style="background: rgba(15, 25, 48, 0.92); border: 1px solid rgba(245, 158, 11, 0.18); border-radius: 24px; padding: 36px; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.45);">
          <form id="formInscricaoCRM" style="display: grid; gap: 18px;" autocomplete="on">
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Quantidade de inscrições*</label>
              <select id="qtdInscritos" name="qtdInscritos" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(15,25,48,0.95); color: #f8fafc; padding: 14px 16px; outline:none; font-size:0.9rem;">
                <option value="1" style="background:#0f1930;color:#fff;">1 inscrição</option>
                <option value="2" style="background:#0f1930;color:#fff;">2 inscrições</option>
                <option value="3" style="background:#0f1930;color:#fff;">3 inscrições</option>
                <option value="4" style="background:#0f1930;color:#fff;">4 inscrições</option>
                <option value="5" style="background:#0f1930;color:#fff;">5 inscrições</option>
              </select>
            </div>
            <div class="lpfrm-row2">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label>
                <input type="text" id="nome" name="nome" autocomplete="name" required placeholder="Seu nome completo" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label>
                <input type="tel" id="telefone" name="telefone" autocomplete="tel" required placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>
            <div class="lpfrm-row2">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label>
                <input type="text" id="formacao" name="formacao" autocomplete="organization-title" required placeholder="Sua formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label>
                <input type="text" id="cargo" name="cargo" autocomplete="job-title" required placeholder="Seu cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>
            <div class="lpfrm-row2">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Estado*</label>
                <select id="uf" name="uf" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(15,25,48,0.95); color: #f8fafc; padding: 14px 16px; outline:none; font-size:0.9rem;">
                  <option value="" style="background:#0f1930;color:#fff;">Selecione o estado...</option>
                </select>
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Município*</label>
                <select id="cidade" name="cidade" required disabled style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(15,25,48,0.95); color: #f8fafc; padding: 14px 16px; outline:none; font-size:0.9rem;">
                  <option value="" style="background:#0f1930;color:#fff;">Primeiro selecione o estado...</option>
                </select>
              </div>
            </div>
            <div class="lpfrm-row2">
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label>
                <input type="email" id="email" name="email" autocomplete="email" required placeholder="seu@email.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
              <div>
                <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">WhatsApp*</label>
                <input type="tel" id="whatsapp" name="whatsapp" autocomplete="tel" required placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
              </div>
            </div>

            <div data-participante="2" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 18px; margin-top: 4px;">
              <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:0.9rem;">Participante 2</p>
              <div style="display:grid; gap:18px;">
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label><input type="text" id="nome_2" name="nome_2" placeholder="Nome completo do participante 2" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label><input type="email" id="email_2" name="email_2" placeholder="email@participante2.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label><input type="tel" id="telefone_2" name="telefone_2" placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label><input type="text" id="formacao_2" name="formacao_2" placeholder="Formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label><input type="text" id="cargo_2" name="cargo_2" placeholder="Cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
              </div>
            </div>

            <div data-participante="3" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 18px; margin-top: 4px;">
              <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:0.9rem;">Participante 3</p>
              <div style="display:grid; gap:18px;">
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label><input type="text" id="nome_3" name="nome_3" placeholder="Nome completo do participante 3" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label><input type="email" id="email_3" name="email_3" placeholder="email@participante3.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label><input type="tel" id="telefone_3" name="telefone_3" placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label><input type="text" id="formacao_3" name="formacao_3" placeholder="Formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label><input type="text" id="cargo_3" name="cargo_3" placeholder="Cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
              </div>
            </div>

            <div data-participante="4" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 18px; margin-top: 4px;">
              <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:0.9rem;">Participante 4</p>
              <div style="display:grid; gap:18px;">
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label><input type="text" id="nome_4" name="nome_4" placeholder="Nome completo do participante 4" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label><input type="email" id="email_4" name="email_4" placeholder="email@participante4.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label><input type="tel" id="telefone_4" name="telefone_4" placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label><input type="text" id="formacao_4" name="formacao_4" placeholder="Formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label><input type="text" id="cargo_4" name="cargo_4" placeholder="Cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
              </div>
            </div>

            <div data-participante="5" style="display:none; border-top: 1px dashed rgba(245,158,11,0.35); padding-top: 18px; margin-top: 4px;">
              <p style="margin:0 0 14px; color:#F59E0B; font-weight:700; font-size:0.9rem;">Participante 5</p>
              <div style="display:grid; gap:18px;">
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Nome completo*</label><input type="text" id="nome_5" name="nome_5" placeholder="Nome completo do participante 5" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Email*</label><input type="email" id="email_5" name="email_5" placeholder="email@participante5.com" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Telefone*</label><input type="tel" id="telefone_5" name="telefone_5" placeholder="(00) 00000-0000" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Formação*</label><input type="text" id="formacao_5" name="formacao_5" placeholder="Formação acadêmica" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
                <div><label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Cargo*</label><input type="text" id="cargo_5" name="cargo_5" placeholder="Cargo atual" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" /></div>
              </div>
            </div>

            <div id="containerModulos" style="border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(248,250,252,0.12); padding: 18px; color: #f8fafc;">
              <p style="margin: 0; font-size: 0.95rem; color: #f8fafc; opacity: 0.9;">(Os módulos definidos na campanha aparecerão automaticamente aqui quando a página estiver publicada)</p>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Como você nos conheceu?*</label>
              <select id="origem" name="origem" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;">
                <option value="" style="background:#0f1930; color:#f8fafc;">Selecione...</option>
                <option value="Instagram" style="background:#0f1930; color:#f8fafc;">Instagram</option>
                <option value="Facebook" style="background:#0f1930; color:#f8fafc;">Facebook</option>
                <option value="Indicação" style="background:#0f1930; color:#f8fafc;">Indicação</option>
                <option value="Ligação" style="background:#0f1930; color:#f8fafc;">Ligação</option>
                <option value="Whatsapp" style="background:#0f1930; color:#f8fafc;">Whatsapp</option>
                <option value="E-mail" style="background:#0f1930; color:#f8fafc;">E-mail</option>
                <option value="LinkedIn" style="background:#0f1930; color:#f8fafc;">LinkedIn</option>
                <option value="Outros" style="background:#0f1930; color:#f8fafc;">Outros</option>
              </select>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">Forma de pagamento*</label>
              <select id="forma_pagamento" name="forma_pagamento" required style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;">
                <option value="" style="background:#0f1930; color:#f8fafc;">Selecione...</option>
                <option value="Empenho" style="background:#0f1930; color:#f8fafc;">Empenho</option>
                <option value="Depósito bancário" style="background:#0f1930; color:#f8fafc;">Depósito bancário</option>
              </select>
            </div>
            <div>
              <label style="display:block; margin-bottom: 8px; color:#f8fafc; font-size: 0.9rem;">4 + 3 = ? *</label>
              <input type="number" id="captchaCalc" name="captchaCalc" required placeholder="Soma matemática" style="width:100%; border-radius: 12px; border: 1px solid rgba(248,250,252,0.12); background: rgba(248,250,252,0.04); color: #f8fafc; padding: 14px 16px; outline:none;" />
            </div>
            <button type="submit" id="btnSubmit" style="width:100%; padding: 16px 20px; border-radius: 14px; border: none; font-weight: 700; font-size: 1rem; color: #0B192C; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); cursor:pointer;">Enviar meus dados</button>
            <div id="feedback" style="display:none; padding: 14px 16px; border-radius: 12px; text-align:center; font-weight:700;"></div>
            <p style="margin: 0; font-size: 0.82rem; color: rgba(248,250,252,0.72); text-align:center;">Seus dados estão protegidos conosco.</p>
            <div style="margin-top: 24px; border-radius: 30px; background: linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%); padding: 15px 28px; text-align: center; box-shadow: 0 25px 50px -25px rgba(0,0,0,0.35);">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0B192C;">Consulte o conteúdo programático do curso.</p>
              <a href="https://drive.google.com/file/d/1y6HPl8eV1tm0kckkYCoKnexFIOJOoeqi/view?usp=drive_link" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; justify-content:center; gap:10px; margin-top: 18px; padding: 16px 24px; min-width: 260px; border-radius: 14px; background: #0B192C; color: #ffffff; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 0.9rem; box-shadow: 0 15px 30px rgba(0,0,0,0.18);">
                <span style="display: inline-flex; align-items: center; gap: 10px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
                    <path d="M12 16.5V3" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 10.5L12 16.5L18 10.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 20.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  BAIXAR FOLDER DO CURSO (PDF)
                </span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
```

- [ ] **Step 2: Verificar manualmente**

Numa página de teste, usar o fluxo de importação de HTML do Lovable com um documento contendo `<div id="CRM_FORM_INJECT_ZONE"></div>` (o mesmo fluxo já usado hoje — `handleImportarHtmlLovable`), confirmar que o formulário importado já vem com quantidade de inscrições, participantes 2-5 escondidos e forma de pagamento. Repetir a checagem de responsividade da Task 6 (Step 2) para esta variante.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LandingPages.jsx
git commit -m "feat: getMarkupFormularioCRM ganha os mesmos campos e responsividade do bloco rd-form"
```

---

## Task 8: `Funil.jsx` — exibir e editar "Forma de pagamento"

**Files:**
- Modify: `frontend-crm/src/pages/Funil.jsx:140-141` (novo estado)
- Modify: `frontend-crm/src/pages/Funil.jsx:1201-1204` (carregar ao abrir o modal de edição)
- Modify: `frontend-crm/src/pages/Funil.jsx:1329-1345` (enviar ao salvar)
- Modify: `frontend-crm/src/pages/Funil.jsx:2502-2517` (campo na UI)

**Interfaces:**
- Consumes: `op.forma_pagamento` (já vem em `GET /oportunidades`, Task 3).
- Produces: `dados.forma_pagamento` enviado em `POST/PUT /oportunidades` (Task 3).

- [ ] **Step 1: Novo estado**

Trecho atual (`Funil.jsx:140-141`):

```js
  const [desconto, setDesconto] = useState(0);
  const [descontoReais, setDescontoReais] = useState(0);
```

Substituir por:

```js
  const [desconto, setDesconto] = useState(0);
  const [descontoReais, setDescontoReais] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('');
```

- [ ] **Step 2: Carregar ao abrir uma negociação existente**

Trecho atual (`Funil.jsx:1201-1204`):

```js
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto'); setMotivoPerda(op.motivo_perda || ''); setVendedorId(op.vendedor_id || '');
    setVendedorOriginal(op.vendedor_id || '');
    setDesconto(op.desconto || 0);
```

Substituir por:

```js
    setEtapaId(op.etapa_id); setObservacoes(op.observacoes || '');
    setStatusOp(op.status || 'aberto'); setMotivoPerda(op.motivo_perda || ''); setVendedorId(op.vendedor_id || '');
    setVendedorOriginal(op.vendedor_id || '');
    setDesconto(op.desconto || 0);
    setFormaPagamento(op.forma_pagamento || '');
```

Também é preciso resetar esse estado nos outros dois lugares que zeram o formulário: ao abrir o modal para **criar** uma negociação nova, e ao **fechar** o modal.

Trecho atual (`Funil.jsx:1125-1133`, função `abrirModalNovo`):

```js
    setEditandoId(null); setTitulo(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId(etapas.length > 0 ? etapas[0].id : '');
    setVendedorId(meuUsuarioId || ''); setVendedorOriginal(meuUsuarioId || '');
    setDesconto(0); setDescontoReais(0);
```

Substituir por:

```js
    setEditandoId(null); setTitulo(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId(etapas.length > 0 ? etapas[0].id : '');
    setVendedorId(meuUsuarioId || ''); setVendedorOriginal(meuUsuarioId || '');
    setDesconto(0); setDescontoReais(0); setFormaPagamento('');
```

Trecho atual (`Funil.jsx:1146-1156`, função `fecharModalPrincipal`):

```js
  function fecharModalPrincipal(recarregar = true) {
    liberarTravaOportunidade();
    setMostrarModal(false);
    setEditandoId(null);
    setTitulo(''); setValor(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId('');
    setVendedorId(''); setVendedorOriginal('');
    setDesconto(0); setDescontoReais(0);
    setModulosSelecionados([]);
```

Substituir por:

```js
  function fecharModalPrincipal(recarregar = true) {
    liberarTravaOportunidade();
    setMostrarModal(false);
    setEditandoId(null);
    setTitulo(''); setValor(''); setEmpresaId(''); setEmpresaTelefones(''); setEmpresaHorario(''); setContatoId(''); setObservacoes('');
    setContatosVinculadosIds([]); setQtdInscritos(0); setInscritos([]);
    setModoPacoteInscricao('igual');
    setStatusOp('aberto'); setMotivoPerda(''); setEtapaId('');
    setVendedorId(''); setVendedorOriginal('');
    setDesconto(0); setDescontoReais(0); setFormaPagamento('');
    setModulosSelecionados([]);
```

- [ ] **Step 3: Enviar ao salvar**

Trecho atual (`Funil.jsx:1329-1345`):

```js
    const dados = {
      titulo: tituloFinal,
      valor: valorEnviar,
      empresa_id: empresaId || null,
      contato_id: contatoId || contatosVinculadosIds[0] || null,
      contatos_ids: contatosVinculadosIds,
      qtd_inscritos: qtdInscritos,
      inscritos_json: inscritosSalvar,
      etapa_id: etapaId,
      observacoes,
      campanha_id: filtroCampanha,
      status: statusOp,
      motivo_perda: statusOp === 'perdido' ? motivoPerda : null,
      vendedor_id: vendedorId || null,
      modulos_ids: modulosGravacao,
      desconto: modulosSelecionados.length > 0 ? Number(desconto) : 0,
    };
```

Substituir por:

```js
    const dados = {
      titulo: tituloFinal,
      valor: valorEnviar,
      empresa_id: empresaId || null,
      contato_id: contatoId || contatosVinculadosIds[0] || null,
      contatos_ids: contatosVinculadosIds,
      qtd_inscritos: qtdInscritos,
      inscritos_json: inscritosSalvar,
      etapa_id: etapaId,
      observacoes,
      campanha_id: filtroCampanha,
      status: statusOp,
      motivo_perda: statusOp === 'perdido' ? motivoPerda : null,
      vendedor_id: vendedorId || null,
      modulos_ids: modulosGravacao,
      desconto: modulosSelecionados.length > 0 ? Number(desconto) : 0,
      forma_pagamento: formaPagamento || null,
    };
```

- [ ] **Step 4: Campo na UI**

Trecho atual (`Funil.jsx:2502-2517`):

```jsx
                <FormGrid $columns="1fr">
                  <FormGroup>
                    <label><i className="fa-solid fa-user-tie text-purple"></i> Vendedor Responsável</label>
                    <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                      <option value="">-- Sem dono definido --</option>
                      {equipe
                        .filter(user => user.ativo !== false || String(user.id) === String(vendedorOriginal))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nome} {user.ativo === false ? '(Inativo)' : `(${user.perfil})`}
                          </option>
                        ))
                      }
                    </Select>
                  </FormGroup>

                  <NotasOportunidade key={editandoId || 'nova'} oportunidadeId={editandoId} />
```

Substituir por:

```jsx
                <FormGrid $columns="1fr">
                  <FormGroup>
                    <label><i className="fa-solid fa-user-tie text-purple"></i> Vendedor Responsável</label>
                    <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                      <option value="">-- Sem dono definido --</option>
                      {equipe
                        .filter(user => user.ativo !== false || String(user.id) === String(vendedorOriginal))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nome} {user.ativo === false ? '(Inativo)' : `(${user.perfil})`}
                          </option>
                        ))
                      }
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <label><i className="fa-solid fa-money-check-dollar text-purple"></i> Forma de Pagamento</label>
                    <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                      <option value="">-- Não informado --</option>
                      <option value="Empenho">Empenho</option>
                      <option value="Depósito bancário">Depósito bancário</option>
                    </Select>
                  </FormGroup>

                  <NotasOportunidade key={editandoId || 'nova'} oportunidadeId={editandoId} />
```

- [ ] **Step 5: Verificar manualmente**

Rodar o frontend local, abrir o Funil, editar a oportunidade criada na Task 2 (Step 6) — confirmar que "Forma de Pagamento" aparece pré-selecionado com "Empenho". Trocar para "Depósito bancário", salvar, reabrir a mesma negociação e confirmar que persistiu. Criar uma negociação nova manualmente, deixar "Forma de Pagamento" como "-- Não informado --", salvar, e confirmar que não quebra (campo fica `null`).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Funil.jsx
git commit -m "feat: exibe e permite editar forma de pagamento no Funil"
```

---

## Task 9: `Dashboard.jsx` — exibir "Forma de pagamento" no detalhe da inscrição

**Files:**
- Modify: `frontend-crm/src/pages/Dashboard.jsx:950-953`

**Interfaces:**
- Consumes: `inscritoDetalhe.forma_pagamento` (já vem em `GET /dashboard/inscritos`, Task 4).

- [ ] **Step 1: Adicionar o item no grid de resumo**

Trecho atual (`Dashboard.jsx:950-957`):

```jsx
                  <DetalheItem>
                    <label>Quantidade de inscritos</label>
                    <div><strong>{qtd}</strong></div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Canal de aquisição</label>
                    <div>{inscritoDetalhe.origem_lead || '—'}</div>
                  </DetalheItem>
                </DetalheResumoGrid>
```

Substituir por:

```jsx
                  <DetalheItem>
                    <label>Quantidade de inscritos</label>
                    <div><strong>{qtd}</strong></div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Forma de pagamento</label>
                    <div>{inscritoDetalhe.forma_pagamento || '—'}</div>
                  </DetalheItem>
                  <DetalheItem>
                    <label>Canal de aquisição</label>
                    <div>{inscritoDetalhe.origem_lead || '—'}</div>
                  </DetalheItem>
                </DetalheResumoGrid>
```

- [ ] **Step 2: Verificar manualmente**

Rodar o frontend local, abrir o Dashboard → aba de Inscrições, clicar na inscrição criada na Task 2/8 (forma de pagamento "Depósito bancário" após o teste da Task 8) e confirmar que o card "Forma de pagamento" aparece no resumo com o valor correto. Verificar também uma inscrição antiga (criada antes desta mudança, sem `forma_pagamento`) e confirmar que mostra "—" sem quebrar.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: exibe forma de pagamento no detalhe de inscricao do Dashboard"
```

---

## Verificação final (ponta a ponta)

Depois de todas as tasks:

1. Com backend local (`server CRUD`, porta 3001, banco `crm_dev` local) e frontend local (`frontend-crm`) rodando, abrir uma landing page de teste publicada.
2. Preencher o formulário com quantidade = 3, forma de pagamento = "Empenho", preenchendo os 3 blocos de participante.
3. Simular largura de celular (DevTools) antes de enviar — confirmar layout em 1 coluna, sem qualquer ajuste manual.
4. Enviar e confirmar a mensagem de sucesso na própria página.
5. No CRM (Funil e Dashboard), localizar a negociação criada e confirmar: 3 inscritos com os dados corretos, forma de pagamento "Empenho" visível e editável.
6. Reenviar o mesmo formulário (mesmo município/empresa) com forma de pagamento = "Depósito bancário" e confirmar que a negociação existente é atualizada (não duplicada) e a forma de pagamento passa a ser "Depósito bancário".
