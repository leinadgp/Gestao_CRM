# Formulário de inscrição da landing page — forma de pagamento, múltiplos participantes e responsividade

**Data:** 2026-09-21
**Status:** aprovado para virar plano de implementação
**Repositórios envolvidos:** `frontend-crm` (editor da landing page) e `server CRUD` (runtime público + API)

## Contexto

O card/bloco de formulário de inscrição usado nas landing pages (bloco GrapesJS "Form.
Inscrição" e a variante usada na importação de HTML do Lovable) hoje coleta uma única
pessoa por submissão e não tem campo de forma de pagamento. Além disso, o layout usa
`grid-template-columns` fixo em `style` inline, sem media query, então quebra em telas de
celular e precisa ser ajustado manualmente toda vez que o bloco é inserido numa página nova.

Esta mudança adiciona três coisas ao mesmo formulário:

1. Campo obrigatório **"Forma de pagamento"** (Empenho ou Depósito bancário).
2. Seletor de **quantidade de inscrições (1 a 5)**, que revela campos para participantes
   adicionais (nome, e-mail, telefone, formação, cargo) quando maior que 1.
3. Layout **responsivo** embutido no próprio bloco, sem depender de ajuste manual.

## Fora de escopo

- Módulo/turma do curso continua sendo escolhido **uma vez para o grupo todo** — não há
  seleção de módulo por participante nesta mudança.
- UF, Município e "Como você nos conheceu" continuam preenchidos **uma vez só**, para a
  inscrição/grupo — não por participante.
- Não há limite configurável de participantes: o teto é fixo em 5.
- Não estamos criando uma tabela nova de "inscrições" nem mudando o modelo de dados de
  `oportunidades`/`inscritos_json` além da coluna nova descrita abaixo — a infraestrutura de
  múltiplos participantes (`qtd_inscritos`, `inscritos_json`, merge por `email|nome`) já
  existe no backend e é reaproveitada como está.

## Arquitetura atual (relevante para a mudança)

O fluxo atravessa dois repositórios:

- **`frontend-crm/src/pages/LandingPages.jsx`** é o editor GrapesJS onde o admin monta a
  página. Os blocos ali (`rd-form`, linha ~557, e `getMarkupFormularioCRM()`, linha ~62) são
  só **HTML estático com estilos inline** — não têm lógica de submissão nem de interatividade
  própria.
- **`server CRUD/server.js`**, na rota `GET /lp/:slug`, é quem serve a página publicada e
  **injeta o `<script>` real** que roda no navegador de quem se inscreve (variável
  `scriptFormulario`, ~linhas 4682-4968): preenchimento de UF/cidade, carregamento dos
  módulos da campanha (`containerModulos`), validação do captcha e o `fetch` que faz o POST
  para `/webhook/inscricao-externa`.
- O endpoint público **`POST /webhook/inscricao-externa`** (`server.js:3049`) já sabe
  processar um array `inscritos` e um `qtd_inscritos` no payload (função
  `normalizarInscritosJson`, `server.js:670`), gravando em `oportunidades.inscritos_json`
  (jsonb) e `oportunidades.qtd_inscritos` (int) — isso já é usado pelo editor interno de
  inscritos do CRM (`InscritosOportunidadeEditor.jsx`). O formulário público hoje só monta
  uma pessoa (`dadosPessoa`) e nunca envia esse array.
- Não existe migration versionada neste backend: todo DDL é `ALTER TABLE ... ADD COLUMN IF
  NOT EXISTS` escrito direto no topo do `server.js`, rodando a cada boot (padrão documentado
  no `CLAUDE.md` do backend).

## Desenho da mudança

### 1. Campo "Forma de pagamento"

- Select obrigatório, mesmo padrão visual dos demais campos do formulário (mesmo estilo de
  borda/fundo/label usado em "Origem").
- Opções: `Empenho` e `Depósito bancário`.
- Vive em nível de **inscrição/negociação** (um valor por submissão, não por participante) —
  é um dado sobre como o grupo todo vai pagar, não sobre cada pessoa.
- Posição no formulário: junto aos demais campos "da submissão" (ex.: perto de "Como você
  nos conheceu"), antes do captcha.

**Backend:**

- Nova coluna `oportunidades.forma_pagamento VARCHAR(30)`, adicionada via `ALTER TABLE ...
  ADD COLUMN IF NOT EXISTS` em `server.js`, próximo aos outros blocos de migração de
  `oportunidades` (padrão de estilo já usado nas linhas 327-332 / 440-444).
- `POST /webhook/inscricao-externa` passa a ler `forma_pagamento` de `req.body` e gravar
  tanto na criação quanto na atualização da oportunidade (nos dois modos — multi-campanha e
  legado, e em ambos os caminhos de "criar nova" / "mesclar com aberta existente").
- **Regra de conflito:** se a mesma prefeitura/órgão reenviar o formulário com uma oportunidade
  já aberta e uma forma de pagamento diferente da anterior, **a mais recente sobrescreve**
  (mesmo comportamento já adotado para os outros campos "atuais" da oportunidade nesse
  endpoint). Não há histórico de mudanças desse campo.

### 2. Quantidade de inscrições (1 a 5)

- `<select id="qtdInscritos">` no topo do formulário, opções 1 a 5, padrão 1.
- Mecanismo: **blocos estáticos ocultos**, não clonagem dinâmica via JS. O HTML do bloco já
  contém, desde o início, 4 blocos extras de participante (participante 2 a 5), cada um com
  os campos Nome/E-mail/Telefone/Formação/Cargo, todos com `display:none` e `data-participante="2"`
  (…até `5`). O campo `id`/`name` de cada input inclui o índice (ex.: `nome_2`, `email_2`) para
  não colidir com os do participante 1.
- Ao mudar o select de quantidade, o script injetado (`scriptFormulario`) mostra os blocos de
  1 até o número escolhido e esconde o resto.
- Blocos ocultos não são `required` — a obrigatoriedade dos campos de um participante só é
  ativada quando o bloco fica visível (o script alterna o atributo `required` junto com o
  `display`).
- UF/Município, "Como nos conheceu", módulos do curso e "Forma de pagamento" continuam
  preenchidos uma única vez, fora dos blocos de participante.
- No submit, o script monta `inscritos: [{ nome, email, telefone, formacao, cargo }, ...]`
  com um item por participante visível (incluindo o participante 1, para manter o array
  consistente) e envia `qtd_inscritos` junto — reaproveitando o formato que
  `normalizarInscritosJson` já espera no backend. `forma_pagamento` vai como campo único do
  payload, fora do array.

**Onde mexe (resumo por arquivo):**

| Arquivo | Mudança |
|---|---|
| `frontend-crm/src/pages/LandingPages.jsx`, bloco `rd-form` (~linha 557) | Adicionar select de forma de pagamento, select de quantidade e os 4 blocos ocultos de participante ao HTML do bloco GrapesJS |
| `frontend-crm/src/pages/LandingPages.jsx`, `getMarkupFormularioCRM()` (~linha 62) | Replicar exatamente a mesma estrutura de campos (é a cópia usada na importação de HTML do Lovable) |
| `server CRUD/server.js`, `scriptFormulario` (~linhas 4682-4968) | Lógica de mostrar/esconder blocos de participante e alternar `required`; montar `inscritos`/`qtd_inscritos`/`forma_pagamento` no payload enviado a `/webhook/inscricao-externa` |
| `server CRUD/server.js`, migração de colunas (perto de ~linha 440) | `ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30)` |
| `server CRUD/server.js`, rota `POST /webhook/inscricao-externa` (~linha 3049) | Ler `forma_pagamento` do body e gravar nos caminhos de criação e atualização de oportunidade |
| `frontend-crm/src/pages/Funil.jsx` (modal de negociação) | Exibir/editar "Forma de pagamento" da oportunidade, para o time comercial ver e poder corrigir |
| `frontend-crm/src/pages/Dashboard.jsx`, `DetalheResumoGrid` (~linha 922-958) | Exibir "Forma de pagamento" no modal de detalhe da inscrição |

Não é necessário alterar `InscritosOportunidadeEditor.jsx` nem o shape de
`inscritos_json` além do que já existe — "forma de pagamento" não é um campo por
participante.

### 3. Responsividade

- Causa raiz: os grids do formulário usam `style="grid-template-columns: repeat(2,
  minmax(0,1fr))"` **inline**, que não aceita media query — por isso quebra em telas de
  celular sem ajuste manual.
- Solução: o próprio HTML do bloco passa a incluir um `<style>` escopado por uma classe
  própria (ex.: `.lp-form-grid-2col`), com uma media query (`@media (max-width: 640px)`) que
  muda a grade para 1 coluna e empilha os elementos de rodapé (botão de download, etc.).
- Por estar dentro do markup do próprio bloco (não em CSS global da página), essa regra
  viaja junto com o bloco onde quer que ele seja inserido — GrapesJS, importação de HTML do
  Lovable, ou publicação — resolvendo o problema de precisar ajustar manualmente toda vez.
- Os blocos de participante adicionais (item 2) seguem a mesma classe/grade, então já nascem
  responsivos.

## Testagem

Depois de implementado, validar localmente (backend local + LP de teste):

1. Inserir o bloco atualizado numa landing page de teste e publicar/pré-visualizar,
   conferindo visualmente em larguras desktop, tablet e celular (sem ajuste manual).
2. Preencher e enviar com quantidade = 1 (fluxo atual, garantir que não quebrou).
3. Preencher e enviar com quantidade = 5, conferindo que os 5 participantes chegam
   corretamente em `oportunidades.inscritos_json` e `qtd_inscritos` no banco local, e que
   aparecem certos no Dashboard e no Funil.
4. Conferir que `forma_pagamento` chega e aparece no modal de detalhe do Dashboard e no
   modal de edição do Funil, para os dois valores (Empenho / Depósito bancário).
5. Reenviar o mesmo formulário para uma oportunidade já aberta com forma de pagamento
   diferente e confirmar que o valor mais recente sobrescreve o anterior.
6. Testar importação de HTML do Lovable com o placeholder `CRM_FORM_INJECT_ZONE`, garantindo
   que `getMarkupFormularioCRM()` também gera os novos campos corretamente.

## Riscos e decisões em aberto

- **Sobrescrever forma de pagamento em reenvio**: assumimos que a submissão mais recente
  vence, replicando o comportamento existente de outros campos do endpoint. Se isso não for
  desejável (ex.: preferir manter a primeira informada), é uma troca pequena antes de
  implementar.
- **Teto fixo de 5 participantes**: se no futuro for necessário mais, o padrão de blocos
  estáticos ocultos exigiria adicionar mais blocos manualmente (não escala indefinidamente).
  Aceitável para o volume atual de inscrições em grupo.
