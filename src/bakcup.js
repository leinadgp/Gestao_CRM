require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET = process.env.JWT_SECRET || 'chave_padrao';

// ==========================================
// ROTA DE LOGIN
// ==========================================
app.post('/login', async (req, res) => {
  try {
    const { login, senha } = req.body; 
    
    const result = await pool.query('SELECT * FROM usuarios WHERE login = $1 AND senha = $2', [login, senha]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    const usuario = result.rows[0];
    
    const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, SECRET, { expiresIn: '2h' });
    
    res.json({ mensagem: 'Login bem-sucedido!', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor ao fazer login' });
  }
});

// ==========================================
// MIDDLEWARE DE PROTEÇÃO (JWT)
// ==========================================
function verificarToken(req, res, next) {
  const tokenHeader = req.headers['authorization'];
  
  if (!tokenHeader) {
    return res.status(403).json({ erro: 'Acesso negado. Token não fornecido.' });
  }

  const token = tokenHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    req.usuarioId = decoded.id; 
    next(); 
  });
}

// ==========================================
// ROTAS DE EMPRESAS
// ==========================================
app.post('/empresas', verificarToken, async (req, res) => {
  try {
    const { nome, estado, cidade, telefones } = req.body;
    const nova = await pool.query(
      'INSERT INTO empresas (nome, estado, cidade, telefones) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, estado, cidade, telefones]
    );
    res.status(201).json(nova.rows[0]);
  } catch (error) { 
    if (error.code === '23505') {
      return res.status(400).json({ erro: 'Já existe uma empresa ou prefeitura cadastrada com este nome neste estado.' });
    }
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar empresa' }); 
  }
});

app.get('/empresas', verificarToken, async (req, res) => {
  try {
    const todas = await pool.query('SELECT * FROM empresas ORDER BY nome ASC');
    res.json(todas.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ erro: 'Erro ao buscar empresas' });
  }
});

app.put('/empresas/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, estado, cidade, telefones } = req.body;
    const atualizada = await pool.query(
      'UPDATE empresas SET nome = $1, estado = $2, cidade = $3, telefones = $4 WHERE id = $5 RETURNING *',
      [nome, estado, cidade, telefones, id]
    );
    res.json(atualizada.rows[0]);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar empresa' }); 
  }
});

app.delete('/empresas/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM empresas WHERE id = $1', [id]);
    res.json({ mensagem: 'Empresa deletada com sucesso' });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar empresa. Verifique se há contatos vinculados.' }); 
  }
});

// ==========================================
// ROTAS DE CONTATOS
// ==========================================
app.post('/contatos', verificarToken, async (req, res) => {
  try {
    const { nome, emails, telefones, cargo, empresa_id } = req.body;
    const idDaEmpresa = empresa_id ? empresa_id : null;
    const novo = await pool.query(
      'INSERT INTO contatos (nome, emails, telefones, cargo, empresa_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, emails, telefones, cargo, idDaEmpresa]
    );
    res.status(201).json(novo.rows[0]);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar contato' }); 
  }
});

app.get('/contatos', verificarToken, async (req, res) => {
  try {
    const query = `
      SELECT c.*, e.nome AS empresa_nome 
      FROM contatos c
      LEFT JOIN empresas e ON c.empresa_id = e.id
      ORDER BY c.nome ASC
    `;
    const todos = await pool.query(query);
    res.json(todos.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ erro: 'Erro ao buscar contatos' });
  }
});

app.put('/contatos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, emails, telefones, cargo, empresa_id } = req.body;
    const idDaEmpresa = empresa_id ? empresa_id : null;
    const atualizado = await pool.query(
      'UPDATE contatos SET nome = $1, emails = $2, telefones = $3, cargo = $4, empresa_id = $5 WHERE id = $6 RETURNING *',
      [nome, emails, telefones, cargo, idDaEmpresa, id]
    );
    res.json(atualizado.rows[0]);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar contato' }); 
  }
});

app.delete('/contatos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contatos WHERE id = $1', [id]);
    res.json({ mensagem: 'Contato deletado com sucesso' });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar contato' }); 
  }
});

// ==========================================
// ROTAS DO FUNIL (ETAPAS E OPORTUNIDADES)
// ==========================================

// Buscar as colunas do Kanban
app.get('/etapas', verificarToken, async (req, res) => {
  try {
    const etapas = await pool.query('SELECT * FROM etapas ORDER BY ordem ASC');
    res.json(etapas.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar etapas do funil' });
  }
});

// Buscar os cartões com os nomes da Empresa e Contato
app.get('/oportunidades', verificarToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*, 
        e.nome AS empresa_nome, 
        c.nome AS contato_nome 
      FROM oportunidades o
      LEFT JOIN empresas e ON o.empresa_id = e.id
      LEFT JOIN contatos c ON o.contato_id = c.id
      ORDER BY o.criado_em DESC
    `;
    const oportunidades = await pool.query(query);
    res.json(oportunidades.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar oportunidades' });
  }
});

// Criar um novo cartão no Funil
app.post('/oportunidades', verificarToken, async (req, res) => {
  try {
    const { titulo, valor, contato_id, empresa_id, etapa_id, observacoes } = req.body;
    const novo = await pool.query(
      'INSERT INTO oportunidades (titulo, valor, contato_id, empresa_id, etapa_id, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [titulo, valor || 0, contato_id || null, empresa_id || null, etapa_id, observacoes || '']
    );
    res.status(201).json(novo.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar oportunidade' });
  }
});

// Atualizar um cartão
app.put('/oportunidades/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, valor, contato_id, empresa_id, etapa_id, status, observacoes } = req.body;
    const atualizado = await pool.query(
      'UPDATE oportunidades SET titulo = $1, valor = $2, contato_id = $3, empresa_id = $4, etapa_id = $5, status = $6, observacoes = $7, atualizado_em = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [titulo, valor || 0, contato_id || null, empresa_id || null, etapa_id, status || 'aberto', observacoes || '', id]
    );
    res.json(atualizado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar oportunidade' });
  }
});

app.delete('/oportunidades/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM oportunidades WHERE id = $1', [id]);
    res.json({ mensagem: 'Oportunidade deletada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao deletar oportunidade' });
  }
});

// ==========================================
// ROTA SECRETA: IMPORTAR MUNICÍPIOS (VERSÃO BLINDADA)
// ==========================================
app.get('/importar-prefeituras/:uf', async (req, res) => {
  try {
    const uf = req.params.uf.toUpperCase();
    console.log(`Iniciando busca para a UF: ${uf}`);
    
    // Faz a chamada limpa usando o fetch nativo do Node
    const resposta = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${uf}`);
    
    // Se a Brasil API disser "Não", nós capturamos o motivo exato
    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error("A Brasil API recusou:", resposta.status, erroTexto);
      return res.status(resposta.status).json({ 
        erro: 'A API do governo recusou a conexão', 
        status: resposta.status,
        detalhes: erroTexto 
      });
    }

    const municipios = await resposta.json();

    if (!municipios || municipios.length === 0) {
      return res.status(404).json({ erro: 'Nenhum município encontrado na Brasil API para a UF: ' + uf });
    }

    let cadastradas = 0;
    let ignoradasOuErro = 0;

    for (const mun of municipios) {
      // Deixa a primeira letra de cada palavra maiúscula (ex: NOVO HAMBURGO -> Novo Hamburgo)
      const nomeFormatado = mun.nome.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
      const nomePrefeitura = `Prefeitura de ${nomeFormatado}`;
      
      try {
        const resultado = await pool.query(
          `INSERT INTO empresas (nome, estado, cidade) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (nome, estado) DO NOTHING RETURNING id`,
          [nomePrefeitura, uf, nomeFormatado]
        );
        
        // Se retornou um ID, é porque inseriu agora. Se não retornou, o ON CONFLICT ignorou
        if (resultado.rowCount > 0) {
          cadastradas++;
        } else {
          ignoradasOuErro++;
        }
      } catch (err) {
        console.error(`Erro ao inserir no Banco (${nomePrefeitura}):`, err.message);
        ignoradasOuErro++;
      }
    }

    // Retorna um relatório completo na sua tela
    res.json({ 
      mensagem: `Sucesso! O estado ${uf} foi processado.`, 
      encontradas_na_api: municipios.length,
      inseridas_agora: cadastradas,
      ja_existiam_ou_erro: ignoradasOuErro
    });

  } catch (error) {
    // Se o servidor cair ou a internet do Render falhar, isso aparece na tela
    console.error('ERRO FATAL NA ROTA:', error);
    res.status(500).json({ 
      erro: 'Falha interna no seu servidor Node.js', 
      detalhes_tecnicos: error.message 
    });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
