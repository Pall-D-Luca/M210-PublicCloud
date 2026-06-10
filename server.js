const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'appdb',
  user:     process.env.DB_USER     || 'appuser',
  password: process.env.DB_PASSWORD || 'apppassword',
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id         SERIAL PRIMARY KEY,
      title      VARCHAR(200) NOT NULL,
      content    TEXT         NOT NULL,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/notes', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim())
    return res.status(400).json({ error: 'Titel und Inhalt erforderlich' });
  const { rows } = await pool.query(
    'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
    [title.trim(), content.trim()]
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/notes/:id', async (req, res) => {
  await pool.query('DELETE FROM notes WHERE id = $1', [parseInt(req.params.id)]);
  res.json({ success: true });
});

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch (e) { res.status(500).json({ status: 'error' }); }
});

initDB().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Server: http://0.0.0.0:${PORT}`)));
