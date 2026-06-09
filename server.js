const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// PostgreSQL Verbindung
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  user:     process.env.DB_USER     || 'appuser',
  password: process.env.DB_PASSWORD || 'securepassword123',
  database: process.env.DB_NAME     || 'appdb',
});

// Tabelle beim Start erstellen
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id         SERIAL PRIMARY KEY,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id         SERIAL PRIMARY KEY,
        text       TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Datenbank initialisiert');
  } catch (err) {
    console.error('❌ DB Init Fehler:', err.message);
  } finally {
    client.release();
  }
}

// Statische Dateien (public/)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// GET /api/visits — Besuch speichern & Anzahl zurückgeben
app.get('/api/visits', async (req, res) => {
  try {
    await pool.query('INSERT INTO visits (visited_at) VALUES (NOW())');
    const result = await pool.query('SELECT COUNT(*) AS count FROM visits');
    res.json({ visits: result.rows[0].count });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/messages — Alle Nachrichten laden
app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/messages — Neue Nachricht speichern
app.post('/api/messages', async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text darf nicht leer sein' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO messages (text) VALUES ($1) RETURNING *',
      [text.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/messages/:id — Nachricht löschen
app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /health — Health Check für OpenShift
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
  });
});