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

O `.env` mantém o padrão de comentar as URLs em vez de apagá-las:

```bash
# VITE_API_URL=https://api.gestao.srv.br            # producao (definitivo)
VITE_API_URL=http://localhost:3001                  # local (ativo)
```

> **Atenção:** este `.env` **está versionado** neste repositório, que é público
> (`github.com/leinadgp/Gestao_CRM`). Nunca colocar segredo nele. O valor que vale em
> produção é o `VITE_API_URL` configurado na Vercel, não este arquivo.

Para trabalhar, o backend local precisa estar no ar — senão as telas quebram por falha de
rede, não por bug do frontend.

---

## Ordem de publicação importa

Quando a mudança envolve os dois repositórios, **backend primeiro, frontend depois.**

Os dois deploys são independentes: publicar o frontend antes faz a tela chamar um endpoint que
ainda não existe em produção, e o usuário vê erro em algo que "funcionava na sua máquina".

---

## Atenção

- **CORS é controlado pelo backend**, pela variável `CORS_DOMINIOS_CURINGA` no EasyPanel — não
  por código. Uma origem nova — domínio novo, preview da Vercel — precisa ser liberada lá,
  senão o navegador bloqueia a chamada.
- **Domínio definitivo da API: `https://api.gestao.srv.br`.** O antigo
  (`api.danieltech-automa.shop`) expira e não será renovado; segue aceito só como rede de
  segurança. O `.easypanel.host` é grátis e não expira, mas depende do painel.
- Trocar de domínio exige **4 lugares**: EasyPanel, as variáveis do backend, `VITE_API_URL` na
  Vercel e os nós do n8n. A lista completa está no `CLAUDE.md` do backend.
