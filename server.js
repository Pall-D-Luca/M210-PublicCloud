const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  user:     process.env.DB_USER     || 'appuser',
  password: process.env.DB_PASSWORD || 'securepassword123',
  database: process.env.DB_NAME     || 'appdb',
  max: 3,          // max 3 Verbindungen
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
});

async function initDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS visits (
          id SERIAL PRIMARY KEY,
          visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      client.release();
      console.log('✅ DB bereit');
      return;
    } catch (err) {
      console.log(`⏳ Warte auf DB... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  process.exit(1);
}

app.use(express.static(path.join(__dirname, 'public')));

// Einziger API Endpoint
app.get('/api/ping', async (req, res) => {
  try {
    await pool.query('INSERT INTO visits DEFAULT VALUES');
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM visits');
    res.json({ visits: rows[0].count, status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error' });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Port ${PORT}`));
});