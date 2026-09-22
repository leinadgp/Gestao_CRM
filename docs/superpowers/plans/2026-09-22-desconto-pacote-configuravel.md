# Desconto por Pacote Configurável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar configurável no painel o percentual de desconto por quantidade de campanhas escolhidas num pacote multi-campanha, substituindo a regra fixa (0/10%/15%) hoje duplicada no código.

**Architecture:** Nova tabela global `faixas_desconto_pacote` (quantidade mínima de campanhas → percentual) no backend, com uma rota pública de leitura (consumida tanto pelo script da landing page quanto pelo painel) e rotas autenticadas de CRUD. Uma função utilitária substitui o `if/else` fixo nos dois lugares onde ele hoje existe (webhook público e script client-side da LP). O painel ganha uma nova aba em Configurações, seguindo o padrão já usado pela aba "Setores/Cargos".

**Tech Stack:** Node/Express + `pg` sem ORM (server CRUD), React + Vite + styled-components (frontend-crm), JavaScript puro injetado como string (script client-side da LP publicada).

**Spec:** `docs/superpowers/specs/2026-09-22-desconto-pacote-configuravel-design.md`

## Global Constraints

- Regra **global**: uma tabela só, vale para toda landing page multi-campanha da empresa — sem configuração por página.
- Lista **dinâmica** de faixas — sem limite fixo de níveis, adicionar/editar/remover livremente pelo painel.
- `GET /faixas-desconto`: rota **pública**, sem `verificarToken` (precisa ser lida pelo navegador de um visitante anônimo).
- `POST`/`PUT`/`DELETE /faixas-desconto`: rotas **autenticadas**.
- Percentual aplicado = o da **maior faixa cuja `qtd_minima_campanhas` seja ≤** à quantidade de campanhas escolhidas (pela pessoa, no modo "por pessoa", ou pelo grupo, no modo "por organização" — isso não muda, só de onde vem o percentual). Sem faixa aplicável, ou tabela vazia: 0%.
- Seed inicial (só inserido se a tabela estiver vazia, pra não sobrescrever configuração já feita): `{2, 10}`, `{3, 15}`, `{4, 20}`.
- Este backend não tem migrations versionadas: DDL é `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, idempotente, no topo do `server.js`.
- Sem framework de teste automatizado para rotas Express, para o script client-side injetado, nem para os componentes React deste projeto — verificação é manual (curl, leitura direta no Postgres, harness ad-hoc tipo jsdom quando fizer sentido).

---

## Task 1: Migração — tabela `faixas_desconto_pacote` e seed inicial

**Files:**
- Modify: `server CRUD/server.js` (bloco de migrações)

**Interfaces:**
- Produces: tabela `faixas_desconto_pacote (id SERIAL PRIMARY KEY, qtd_minima_campanhas INTEGER NOT NULL UNIQUE, percentual NUMERIC(5,2) NOT NULL, criado_em TIMESTAMPTZ, atualizado_em TIMESTAMPTZ)`, com 3 linhas seed se a tabela estiver vazia.

- [ ] **Step 1: Adicionar o bloco de migração**

Local: junto aos outros blocos de migração no topo do `server.js` (perto do bloco de `landing_pages modo_desconto`, adicionado no plano anterior — busque por `Aviso migração landing_pages modo_desconto`). Inserir logo abaixo:

```js
// CREATE TABLE + seed no mesmo pool.query (multi-statement): garante que o INSERT só
// roda depois que a tabela existir, mesmo que pool.query use conexões diferentes do
// pool em cada chamada separada — duas chamadas .catch() independentes correriam risco
// de o INSERT executar numa conexão antes do CREATE TABLE terminar noutra.
pool.query(`
  CREATE TABLE IF NOT EXISTS faixas_desconto_pacote (
    id SERIAL PRIMARY KEY,
    qtd_minima_campanhas INTEGER NOT NULL UNIQUE,
    percentual NUMERIC(5,2) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO faixas_desconto_pacote (qtd_minima_campanhas, percentual)
  SELECT * FROM (VALUES (2, 10), (3, 15), (4, 20)) AS seed(qtd, pct)
  WHERE NOT EXISTS (SELECT 1 FROM faixas_desconto_pacote);
`).catch((err) => console.warn('Aviso migração faixas_desconto_pacote:', err.message));
```

- [ ] **Step 2: Verificar manualmente**

Reiniciar o backend local e confirmar que **não** aparece o aviso `Aviso migração faixas_desconto_pacote:`. Se tiver acesso ao Postgres local, `SELECT * FROM faixas_desconto_pacote ORDER BY qtd_minima_campanhas;` deve retornar as 3 linhas seed (2→10, 3→15, 4→20). Reiniciar o backend de novo e confirmar que a tabela **não** duplica nem reseta as linhas (idempotência do seed).

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: adiciona tabela faixas_desconto_pacote com seed inicial"
```

---

## Task 2: Rotas `/faixas-desconto` (CRUD) e função `resolverDescontoPacote`

**Files:**
- Modify: `server CRUD/server.js`

**Interfaces:**
- Consumes: tabela `faixas_desconto_pacote` (Task 1).
- Produces: `GET /faixas-desconto` (pública), `POST`/`PUT /faixas-desconto/:id`/`DELETE /faixas-desconto/:id` (autenticadas); função `resolverDescontoPacote(qtdCampanhas, faixas)` — recebe um número e uma lista de objetos `{qtd_minima_campanhas, percentual}` (como vem do banco), devolve o percentual numérico aplicável (0 se nenhuma faixa se aplicar). Consumida pela Task 3.

- [ ] **Step 1: Adicionar a função utilitária**

Local: perto de outras funções utilitárias do arquivo (ex.: logo acima ou abaixo de `normalizarInscritosJson` — busque por `function normalizarInscritosJson`). Adicionar:

```js
// Pega a maior faixa cuja qtd_minima_campanhas seja <= qtdCampanhas. Sem faixa
// aplicável (tabela vazia, ou nenhuma faixa com qtd_minima_campanhas <= qtdCampanhas),
// devolve 0. Não assume que `faixas` já vem ordenado.
function resolverDescontoPacote(qtdCampanhas, faixas) {
  let melhor = null;
  for (const faixa of (faixas || [])) {
    const minima = Number(faixa.qtd_minima_campanhas);
    if (qtdCampanhas >= minima && (!melhor || minima > melhor.qtd_minima_campanhas)) {
      melhor = { qtd_minima_campanhas: minima, percentual: Number(faixa.percentual) };
    }
  }
  return melhor ? melhor.percentual : 0;
}
```

- [ ] **Step 2: Adicionar as 4 rotas**

Local: logo antes de `app.get('/cargos', verificarToken, async (req, res) => {` (busque esse texto exato). Inserir antes dele:

```js
app.get('/faixas-desconto', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, qtd_minima_campanhas, percentual FROM faixas_desconto_pacote ORDER BY qtd_minima_campanhas ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar faixas de desconto:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar faixas de desconto.' });
  }
});

app.post('/faixas-desconto', verificarToken, async (req, res) => {
  const qtd = Number(req.body.qtd_minima_campanhas);
  const pct = Number(req.body.percentual);
  if (!Number.isInteger(qtd) || qtd < 1) {
    return res.status(400).json({ erro: 'Quantidade mínima de campanhas precisa ser um número inteiro maior que zero.' });
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ erro: 'Percentual precisa ser um número entre 0 e 100.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO faixas_desconto_pacote (qtd_minima_campanhas, percentual) VALUES ($1, $2) RETURNING id, qtd_minima_campanhas, percentual',
      [qtd, pct]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ erro: 'Já existe uma faixa configurada para essa quantidade de campanhas.' });
    console.error('Erro ao criar faixa de desconto:', error);
    res.status(500).json({ erro: 'Erro interno ao criar faixa de desconto.' });
  }
});

app.put('/faixas-desconto/:id', verificarToken, async (req, res) => {
  const qtd = Number(req.body.qtd_minima_campanhas);
  const pct = Number(req.body.percentual);
  if (!Number.isInteger(qtd) || qtd < 1) {
    return res.status(400).json({ erro: 'Quantidade mínima de campanhas precisa ser um número inteiro maior que zero.' });
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ erro: 'Percentual precisa ser um número entre 0 e 100.' });
  }
  try {
    const result = await pool.query(
      'UPDATE faixas_desconto_pacote SET qtd_minima_campanhas = $1, percentual = $2, atualizado_em = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, qtd_minima_campanhas, percentual',
      [qtd, pct, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Faixa não encontrada.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ erro: 'Já existe uma faixa configurada para essa quantidade de campanhas.' });
    console.error('Erro ao editar faixa de desconto:', error);
    res.status(500).json({ erro: 'Erro interno ao editar faixa de desconto.' });
  }
});

app.delete('/faixas-desconto/:id', verificarToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM faixas_desconto_pacote WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir faixa de desconto:', error);
    res.status(500).json({ erro: 'Erro interno ao excluir faixa de desconto.' });
  }
});

```

- [ ] **Step 3: Verificar manualmente**

Com o backend local rodando:

```bash
curl http://localhost:3001/faixas-desconto
```

Esperado: array JSON com as 3 faixas seed, ordenadas por `qtd_minima_campanhas`. Depois, autenticado (com um token válido):

```bash
curl -X POST http://localhost:3001/faixas-desconto \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"qtd_minima_campanhas": 5, "percentual": 25}'
```

Esperado: `201` com a faixa criada. Repetir o `GET` público e confirmar que a nova faixa aparece, ordenada corretamente. Testar `PUT`/`DELETE` na faixa recém-criada e confirmar persistência. Testar `POST` com `qtd_minima_campanhas: 2` (duplicado) e confirmar `409` com a mensagem de faixa já existente.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: adiciona rotas CRUD de faixas de desconto e funcao resolverDescontoPacote"
```

---

## Task 3: Webhook usa `resolverDescontoPacote` em vez da regra fixa

**Files:**
- Modify: `server CRUD/server.js` (branch multi-campanha de `POST /webhook/inscricao-externa`)

**Interfaces:**
- Consumes: `resolverDescontoPacote(qtdCampanhas, faixas)` (Task 2).

- [ ] **Step 1: Buscar as faixas uma vez por requisição**

Trecho atual (dentro do branch multi-campanha, logo após buscar o nome da empresa — busque por `const empresaNome = empNomeRes.rows[0]?.nome`):

```js
      const empNomeRes = await client.query('SELECT nome FROM empresas WHERE id = $1', [empresaId]);
      const empresaNome = empNomeRes.rows[0]?.nome || `Prefeitura de ${cidadeFinal}`;

      // Resolve/cria um contato por participante — cada um pode ser uma pessoa diferente
```

Substituir por (adiciona a busca das faixas entre as duas partes, sem tocar no resto):

```js
      const empNomeRes = await client.query('SELECT nome FROM empresas WHERE id = $1', [empresaId]);
      const empresaNome = empNomeRes.rows[0]?.nome || `Prefeitura de ${cidadeFinal}`;

      const faixasDescontoRes = await client.query(
        'SELECT qtd_minima_campanhas, percentual FROM faixas_desconto_pacote ORDER BY qtd_minima_campanhas ASC'
      );
      const faixasDesconto = faixasDescontoRes.rows;

      // Resolve/cria um contato por participante — cada um pode ser uma pessoa diferente
```

- [ ] **Step 2: Usar a função no cálculo "por organização"**

Trecho atual:

```js
      let descontoOrganizacaoPct = 0;
      if (modoDescontoReq === 'por_organizacao') {
        const campanhasUniao = new Set();
        participantesValidos.forEach((p) => p.campanhas.forEach((c) => campanhasUniao.add(Number(c.campanha_id))));
        const qtd = campanhasUniao.size;
        descontoOrganizacaoPct = qtd >= 3 ? 15 : qtd === 2 ? 10 : 0;
      }
```

Substituir por:

```js
      let descontoOrganizacaoPct = 0;
      if (modoDescontoReq === 'por_organizacao') {
        const campanhasUniao = new Set();
        participantesValidos.forEach((p) => p.campanhas.forEach((c) => campanhasUniao.add(Number(c.campanha_id))));
        const qtd = campanhasUniao.size;
        descontoOrganizacaoPct = resolverDescontoPacote(qtd, faixasDesconto);
      }
```

- [ ] **Step 3: Usar a função no cálculo "por pessoa"**

Trecho atual:

```js
        let descontoPessoaPct = 0;
        if (modoDescontoReq === 'por_pessoa') {
          const qtdPessoa = new Set(p.campanhas.map((c) => Number(c.campanha_id))).size;
          descontoPessoaPct = qtdPessoa >= 3 ? 15 : qtdPessoa === 2 ? 10 : 0;
        }
```

Substituir por:

```js
        let descontoPessoaPct = 0;
        if (modoDescontoReq === 'por_pessoa') {
          const qtdPessoa = new Set(p.campanhas.map((c) => Number(c.campanha_id))).size;
          descontoPessoaPct = resolverDescontoPacote(qtdPessoa, faixasDesconto);
        }
```

- [ ] **Step 4: Verificar manualmente**

Repetir o teste de "por organização"/"por pessoa" do plano anterior (curl com `participantes[]`, ver o plano `2026-09-22-desconto-multi-campanha-por-participante.md` se precisar relembrar o formato exato do payload), mas agora com 4 campanhas distintas — confirmar que o desconto aplicado é 20% (a faixa seed nova), não mais travado em 15%. Depois, editar a faixa de 4 campanhas no banco (`UPDATE faixas_desconto_pacote SET percentual = 22 WHERE qtd_minima_campanhas = 4;`) e repetir o mesmo curl — confirmar que a nova inscrição já usa 22%, sem precisar reiniciar o backend (a busca é por requisição, não cacheada).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: webhook multi-campanha usa faixas de desconto configuraveis em vez de regra fixa"
```

---

## Task 4: Script da landing page usa faixas configuráveis no aviso de desconto

**Files:**
- Modify: `server CRUD/server.js` (dentro de `scriptFormulario`, rota `GET /lp/:slug`)

**Interfaces:**
- Consumes: `GET /faixas-desconto` (Task 2, rota pública).
- Produces: `window.FAIXAS_DESCONTO` populado antes da primeira chamada a `calcularDescontoMulti()`.

- [ ] **Step 1: Buscar as faixas quando a página é multi-campanha**

Trecho atual (dentro de `prepararFormulario`, no bloco `if (multi) { ... }` — busque por `container.insertAdjacentHTML('afterend', '<div id="avisoDesconto"` para achar o ponto exato, que já existe do plano anterior):

```js
                  if (multi) {
                      container.insertAdjacentHTML('afterend', '<div id="avisoDesconto" style="display:none;margin-top:4px;margin-bottom:4px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#4ade80;font-weight:600;font-size:0.9rem;"></div>');

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
```

Substituir por (adiciona a busca das faixas antes de registrar o listener e chamar `calcularDescontoMulti()` pela primeira vez):

```js
                  if (multi) {
                      container.insertAdjacentHTML('afterend', '<div id="avisoDesconto" style="display:none;margin-top:4px;margin-bottom:4px;padding:14px 16px;border-radius:12px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#4ade80;font-weight:600;font-size:0.9rem;"></div>');

                      document.querySelectorAll('[data-participante]').forEach(function(bloco) {
                          var idx = parseInt(bloco.getAttribute('data-participante'), 10);
                          var destino = document.createElement('div');
                          destino.style.cssText = 'background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 16px; margin-top: 12px;';
                          bloco.appendChild(destino);
                          renderModulosEm(destino, idx);
                      });

                      try {
                          var rFaixas = await fetch(window.API_URL_BASE + '/faixas-desconto');
                          window.FAIXAS_DESCONTO = rFaixas.ok ? await rFaixas.json() : [];
                      } catch (e) {
                          window.FAIXAS_DESCONTO = [];
                      }

                      document.addEventListener('change', function(ev) {
                          if (ev.target && ev.target.name === 'modulo_id') calcularDescontoMulti();
                      });
                      calcularDescontoMulti();
                  }
```

(`prepararFormulario` já é uma função `async` e já usa `await` mais acima no mesmo bloco — esse novo `await fetch` está no mesmo escopo assíncrono, não precisa de nenhuma mudança na assinatura da função.)

- [ ] **Step 2: Adicionar a função de resolução no cliente e usá-la em `calcularDescontoMulti`**

Trecho atual (logo antes de `function calcularDescontoMulti() {` — busque esse texto exato):

```js
          function calcularDescontoMulti() {
```

Substituir por (adiciona a função auxiliar antes, mantendo a linha original como está):

```js
          function resolverDescontoPacoteCliente(qtd, faixas) {
              var melhor = null;
              (faixas || []).forEach(function(f) {
                  var minima = parseInt(f.qtd_minima_campanhas, 10);
                  if (qtd >= minima && (!melhor || minima > melhor.minima)) {
                      melhor = { minima: minima, percentual: Number(f.percentual) };
                  }
              });
              return melhor ? melhor.percentual : 0;
          }
          function calcularDescontoMulti() {
```

Trecho atual (dentro de `calcularDescontoMulti`, ramo "por organização"):

```js
                  var qtd = todasCampanhas.size;
                  var pct = qtd >= 3 ? 15 : qtd === 2 ? 10 : 0;
```

Substituir por:

```js
                  var qtd = todasCampanhas.size;
                  var pct = resolverDescontoPacoteCliente(qtd, window.FAIXAS_DESCONTO);
```

Trecho atual (dentro de `calcularDescontoMulti`, ramo "por pessoa"):

```js
                      var pctPessoa = campanhasPessoa.size >= 3 ? 15 : campanhasPessoa.size === 2 ? 10 : 0;
```

Substituir por:

```js
                      var pctPessoa = resolverDescontoPacoteCliente(campanhasPessoa.size, window.FAIXAS_DESCONTO);
```

- [ ] **Step 3: Verificar manualmente**

Sem ferramenta de browser disponível: reaproveitar o padrão jsdom já usado nos planos anteriores desta mesma branch de trabalho — extrair o script real de uma LP multi-campanha publicada localmente (`curl http://localhost:3001/lp/<slug>`), carregar em jsdom com um `fetch` mockado que responde ao `GET /faixas-desconto` com uma lista de teste incluindo a faixa de 4 campanhas (25%, por exemplo, diferente do seed, pra provar que não está mais hardcoded), simular a seleção de módulos cobrindo 4 campanhas, e confirmar que o texto do aviso mostra o percentual da lista mockada, não 15% fixo. Depois, com o backend local rodando de verdade (Task 1-3 já aplicadas), publicar uma LP multi-campanha de teste e conferir via `curl http://localhost:3001/lp/<slug>` que o script exportado contém a chamada a `/faixas-desconto` e a função `resolverDescontoPacoteCliente`.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: script da LP busca faixas de desconto configuraveis em vez de regra fixa"
```

---

## Task 5: Painel — aba "Desconto por Pacote" em Configurações

**Files:**
- Modify: `frontend-crm/src/pages/Configuracoes.jsx`

**Interfaces:**
- Consumes: `GET /faixas-desconto` (pública), `POST`/`PUT`/`DELETE /faixas-desconto/:id` (autenticadas) — Task 2.

- [ ] **Step 1: Novo estado**

Trecho atual (perto dos estados de `cargosLista`/`carregandoCargos` — busque por `const [cargosLista, setCargosLista] = useState([]);`):

```js
  const [cargosLista, setCargosLista] = useState([]);
  const [carregandoCargos, setCarregandoCargos] = useState(false);
```

Substituir por (mantém as linhas originais e adiciona logo abaixo):

```js
  const [cargosLista, setCargosLista] = useState([]);
  const [carregandoCargos, setCarregandoCargos] = useState(false);
  const [faixasDesconto, setFaixasDesconto] = useState([]);
  const [carregandoFaixas, setCarregandoFaixas] = useState(false);
  const [novaQtdMinima, setNovaQtdMinima] = useState('');
  const [novoPercentualFaixa, setNovoPercentualFaixa] = useState('');
  const [salvandoFaixa, setSalvandoFaixa] = useState(false);
  const [faixaEditandoId, setFaixaEditandoId] = useState(null);
  const [qtdMinimaEditando, setQtdMinimaEditando] = useState('');
  const [percentualEditando, setPercentualEditando] = useState('');
  const [processandoFaixa, setProcessandoFaixa] = useState(false);
```

- [ ] **Step 2: Função de carregar e handlers**

Trecho atual (logo após `carregarCargos`, antes de `useEffect(() => { if (abaAtiva === 'perfil')` — busque por esse `useEffect` exato):

```js
  useEffect(() => {
    if (abaAtiva === 'perfil') carregarMeuPerfil();
    if (abaAtiva === 'equipe') carregarEquipe();
    if (abaAtiva === 'setores') carregarCargos();
  }, [abaAtiva, carregarMeuPerfil, carregarEquipe, carregarCargos]);
```

Substituir por (adiciona `carregarFaixasDesconto` antes do `useEffect`, e adiciona a chamada dela dentro dele):

```js
  const carregarFaixasDesconto = useCallback(async () => {
    setCarregandoFaixas(true);
    try {
      const res = await axios.get(`${API_URL}/faixas-desconto`);
      setFaixasDesconto(res.data);
    } catch (error) {
      console.error('Erro ao carregar faixas de desconto', error);
    } finally {
      setCarregandoFaixas(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (abaAtiva === 'perfil') carregarMeuPerfil();
    if (abaAtiva === 'equipe') carregarEquipe();
    if (abaAtiva === 'setores') carregarCargos();
    if (abaAtiva === 'desconto') carregarFaixasDesconto();
  }, [abaAtiva, carregarMeuPerfil, carregarEquipe, carregarCargos, carregarFaixasDesconto]);
```

Adicionar, em qualquer ponto do componente antes do `return` (ex.: logo depois do bloco acima), os handlers de criar/editar/excluir:

```js
  async function handleCriarFaixa(e) {
    e.preventDefault();
    const qtd = parseInt(novaQtdMinima, 10);
    const pct = parseFloat(novoPercentualFaixa);
    if (!Number.isInteger(qtd) || qtd < 1 || !Number.isFinite(pct)) return;
    setSalvandoFaixa(true);
    try {
      await axios.post(`${API_URL}/faixas-desconto`, { qtd_minima_campanhas: qtd, percentual: pct }, getHeaders());
      setNovaQtdMinima('');
      setNovoPercentualFaixa('');
      carregarFaixasDesconto();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao criar faixa de desconto.');
    } finally {
      setSalvandoFaixa(false);
    }
  }

  function iniciarEdicaoFaixa(faixa) {
    setFaixaEditandoId(faixa.id);
    setQtdMinimaEditando(String(faixa.qtd_minima_campanhas));
    setPercentualEditando(String(faixa.percentual));
  }

  async function salvarEdicaoFaixa(faixa) {
    const qtd = parseInt(qtdMinimaEditando, 10);
    const pct = parseFloat(percentualEditando);
    if (!Number.isInteger(qtd) || qtd < 1 || !Number.isFinite(pct)) {
      setFaixaEditandoId(null);
      return;
    }
    setProcessandoFaixa(true);
    try {
      await axios.put(`${API_URL}/faixas-desconto/${faixa.id}`, { qtd_minima_campanhas: qtd, percentual: pct }, getHeaders());
      setFaixaEditandoId(null);
      carregarFaixasDesconto();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao editar faixa de desconto.');
    } finally {
      setProcessandoFaixa(false);
    }
  }

  async function excluirFaixa(faixa) {
    if (!window.confirm(`Remover a faixa de ${faixa.qtd_minima_campanhas}+ campanhas?`)) return;
    setProcessandoFaixa(true);
    try {
      await axios.delete(`${API_URL}/faixas-desconto/${faixa.id}`, getHeaders());
      carregarFaixasDesconto();
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao excluir faixa de desconto.');
    } finally {
      setProcessandoFaixa(false);
    }
  }
```

- [ ] **Step 3: Botão da aba**

Trecho atual (busque por `<TabButton $active={abaAtiva === 'setores'} onClick={() => setAbaAtiva('setores')}>`, e leia as ~3 linhas seguintes para achar o fechamento `</TabButton>`):

```js
                <TabButton $active={abaAtiva === 'setores'} onClick={() => setAbaAtiva('setores')}>
                  <i className="fa-solid fa-sitemap"></i> Setores / Cargos
                </TabButton>
```

Substituir por (mantém o botão original e adiciona o novo logo depois, dentro do mesmo bloco condicional de admin — confira que esse trecho já está dentro de uma checagem `perfilUsuario === 'admin' &&` olhando as linhas acima; se estiver, o novo botão já herda essa condição):

```js
                <TabButton $active={abaAtiva === 'setores'} onClick={() => setAbaAtiva('setores')}>
                  <i className="fa-solid fa-sitemap"></i> Setores / Cargos
                </TabButton>
                <TabButton $active={abaAtiva === 'desconto'} onClick={() => setAbaAtiva('desconto')}>
                  <i className="fa-solid fa-percent"></i> Desconto por Pacote
                </TabButton>
```

- [ ] **Step 4: Conteúdo da aba**

Trecho atual (busque por `{abaAtiva === 'setores' && perfilUsuario === 'admin' && (` e o `)}` que fecha esse bloco — é o Panel inteiro da aba Setores/Cargos, já lido antes; não precisa reproduzir aqui, só localizar o `)}` de fechamento correspondente a esse Panel).

Logo **depois** do `)}` que fecha o bloco `{abaAtiva === 'setores' && perfilUsuario === 'admin' && ( ... )}`, adicionar:

```jsx

        {abaAtiva === 'desconto' && perfilUsuario === 'admin' && (
          <Panel>
            <PanelHeader>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2c3e50' }}><i className="fa-solid fa-percent text-blue"></i> Desconto por Pacote</h3>
            </PanelHeader>
            <p style={{ padding: '0 20px', color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>
              Desconto automático quando um visitante (ou grupo) de uma landing page com várias campanhas escolhe mais de uma. Vale pra empresa toda.
            </p>
            <form onSubmit={handleCriarFaixa} style={{ display: 'flex', gap: 10, padding: '0 20px 16px', flexWrap: 'wrap' }}>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="A partir de quantas campanhas"
                value={novaQtdMinima}
                onChange={(e) => setNovaQtdMinima(e.target.value)}
                style={{ width: 220 }}
              />
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="% de desconto"
                value={novoPercentualFaixa}
                onChange={(e) => setNovoPercentualFaixa(e.target.value)}
                style={{ width: 160 }}
              />
              <PrimaryButton type="submit" disabled={salvandoFaixa || !novaQtdMinima || !novoPercentualFaixa}>
                <i className="fa-solid fa-plus"></i> Adicionar
              </PrimaryButton>
            </form>
            <TabelaResponsiva>
              <Table>
                <thead>
                  <tr>
                    <th>A partir de quantas campanhas</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Desconto</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregandoFaixas ? (
                    <tr><td colSpan="3" className="text-center text-muted"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</td></tr>
                  ) : faixasDesconto.length === 0 ? (
                    <tr><td colSpan="3" className="text-center text-muted">Nenhuma faixa cadastrada — desconto por pacote fica em 0%.</td></tr>
                  ) : (
                    faixasDesconto.map((faixa) => (
                      <tr key={faixa.id}>
                        <td data-label="A partir de quantas campanhas">
                          {faixaEditandoId === faixa.id ? (
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              autoFocus
                              value={qtdMinimaEditando}
                              onChange={(e) => setQtdMinimaEditando(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicaoFaixa(faixa); if (e.key === 'Escape') setFaixaEditandoId(null); }}
                            />
                          ) : (
                            <strong>{faixa.qtd_minima_campanhas}+ campanhas</strong>
                          )}
                        </td>
                        <td data-label="Desconto" style={{ textAlign: 'center' }}>
                          {faixaEditandoId === faixa.id ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={percentualEditando}
                              onChange={(e) => setPercentualEditando(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicaoFaixa(faixa); if (e.key === 'Escape') setFaixaEditandoId(null); }}
                            />
                          ) : (
                            <Badge className="badge-admin">{Number(faixa.percentual)}%</Badge>
                          )}
                        </td>
                        <td data-label="Ações" style={{ textAlign: 'center' }} className="actions-cell">
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            {faixaEditandoId === faixa.id ? (
                              <>
                                <ActionButton $isAtivo onClick={() => salvarEdicaoFaixa(faixa)} disabled={processandoFaixa} title="Salvar" style={{ color: '#28a745' }}>
                                  <i className="fa-solid fa-check" />
                                </ActionButton>
                                <ActionButton $isAtivo onClick={() => setFaixaEditandoId(null)} title="Cancelar" style={{ color: '#64748b' }}>
                                  <i className="fa-solid fa-xmark" />
                                </ActionButton>
                              </>
                            ) : (
                              <>
                                <ActionButton $isAtivo onClick={() => iniciarEdicaoFaixa(faixa)} title="Editar" style={{ color: '#007bff' }}>
                                  <i className="fa-solid fa-pen" />
                                </ActionButton>
                                <ActionButton $isAtivo onClick={() => excluirFaixa(faixa)} title="Excluir" style={{ color: '#dc3545' }} disabled={processandoFaixa}>
                                  <i className="fa-solid fa-trash-can" />
                                </ActionButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TabelaResponsiva>
          </Panel>
        )}
```

- [ ] **Step 5: Verificar manualmente**

Rodar o frontend local, entrar em Configurações → aba "Desconto por Pacote" (só visível para `perfil === 'admin'`, confira que o usuário de teste é admin). Confirmar que as faixas seed (2→10%, 3→15%, 4→20%, assumindo Tasks 1-3 já aplicadas) aparecem ordenadas. Adicionar uma faixa nova (ex.: 5 → 25%), editar uma existente, excluir uma — confirmar que a lista recarrega corretamente após cada ação e que os erros de validação (ex.: quantidade duplicada) aparecem via `alert`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Configuracoes.jsx
git commit -m "feat: adiciona aba Desconto por Pacote em Configuracoes"
```

---

## Verificação final (ponta a ponta)

1. No painel, cadastrar/confirmar a faixa de 4 campanhas em 20%.
2. Numa landing page multi-campanha de teste, selecionar 4 campanhas (testar os dois modos, "por pessoa" e "por organização") e confirmar que o aviso no formulário mostra 20%, e que a inscrição gravada reflete esse percentual.
3. Editar essa faixa no painel para 22% e confirmar, numa nova inscrição, que o valor novo é usado — sem reiniciar o backend.
4. Excluir a faixa de 2 campanhas e confirmar que uma inscrição com exatamente 2 campanhas passa a não ter desconto (0%, já que não sobra faixa aplicável abaixo de 3).
5. Confirmar que uma landing page de campanha única continua sem nenhuma chamada a `/faixas-desconto` e sem desconto algum — comportamento inalterado.
