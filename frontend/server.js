const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || '';

// Inject BACKEND_URL into index.html dynamically
app.get('/', (req, res) => {
  const fs = require('fs');
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace(
    '<script src="game.js"></script>',
    `<script>window.BACKEND_URL = "${BACKEND_URL}";</script>\n  <script src="game.js"></script>`
  );
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', () => console.log(`Frontend: http://0.0.0.0:${PORT}`));
