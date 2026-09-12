# CRM — Frontend (React + Vite)

Interface do CRM. Consome a API do backend, que vive em outro repositório:
`leinadgp/server-CRUD`, pasta `Desktop/server CRUD`.

**O frontend não fala com o banco de dados.** Todo acesso a dados passa pela API. Se algo
precisa de tabela ou coluna nova, a mudança é no backend — veja o `CLAUDE.md` de lá.

---

## Regra central: desenvolver local, publicar por push

**Nunca desenvolver ou testar apontando para a API de produção.** Todo trabalho acontece
contra o backend local.

```
1. Desenvolve e testa local (frontend + backend + banco local)
2. Daniel aprova
3. Push para a main no GitHub
4. Deploy automático na Vercel
```

Push na `main` **já publica sozinho**. Por isso nada entra na `main` sem aprovação explícita.

---

## Ambiente local

Backend rodando em `http://localhost:3001` (repositório do backend, `npm run dev`), que por
sua vez usa o banco `crm_dev` em `localhost:5433`.

O `.env` (fora do git) mantém o padrão de comentar as URLs em vez de apagá-las:

```bash
# VITE_API_URL=https://api.danieltech-automa.shop   # producao
VITE_API_URL=http://localhost:3001                  # local (ativo)
```

Para trabalhar, o backend local precisa estar no ar — senão as telas quebram por falha de
rede, não por bug do frontend.

---

## Ordem de publicação importa

Quando a mudança envolve os dois repositórios, **backend primeiro, frontend depois.**

Os dois deploys são independentes: publicar o frontend antes faz a tela chamar um endpoint que
ainda não existe em produção, e o usuário vê erro em algo que "funcionava na sua máquina".

---

## Atenção

- **CORS é controlado pelo backend** (`server.js:44`). Uma origem nova — domínio novo, preview
  da Vercel — precisa ser liberada lá, senão o navegador bloqueia a chamada.
- **O domínio `api.danieltech-automa.shop` vai expirar** e não será renovado. Quando trocar,
  o `VITE_API_URL` na Vercel é **um** dos 4 lugares a atualizar; os outros três estão listados
  no `CLAUDE.md` do backend.
