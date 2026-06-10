const form = document.getElementById('form');
const list = document.getElementById('list');

async function load() {
  const notes = await fetch('/api/notes').then(r => r.json());
  list.innerHTML = notes.length
    ? notes.map(n => `
        <li>
          <h3>${escape(n.title)}</h3>
          <p>${escape(n.content)}</p>
          <div class="meta">
            <span>${new Date(n.created_at).toLocaleString('de-CH')}</span>
            <button class="del" onclick="del(${n.id})">Löschen</button>
          </div>
        </li>`).join('')
    : '<li style="color:#999;border:none">Keine Notizen vorhanden.</li>';
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const title   = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });
  form.reset();
  load();
});

async function del(id) {
  await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  load();
}

function escape(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

load();
