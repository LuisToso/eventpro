const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'events.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Asegura que exista el fichero de datos
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.events)) parsed.events = [];
    return parsed;
  } catch (err) {
    console.error('Error leyendo datos:', err);
    return { events: [] };
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function validateEvent(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push('Cuerpo inválido');
    return errors;
  }
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('El título es obligatorio');
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    errors.push('La fecha debe tener formato YYYY-MM-DD');
  }
  if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) {
    errors.push('La hora debe tener formato HH:MM');
  }
  return errors;
}

function sanitizeEvent(body, existing = {}) {
  return {
    id: existing.id || generateId(),
    title: String(body.title || '').trim(),
    date: body.date,
    time: body.time ? String(body.time).trim() : '',
    endTime: body.endTime ? String(body.endTime).trim() : '',
    location: body.location ? String(body.location).trim() : '',
    type: body.type ? String(body.type).trim() : 'otro',
    description: body.description ? String(body.description).trim() : '',
    assignee: body.assignee ? String(body.assignee).trim() : '',
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: body.updatedBy ? String(body.updatedBy).trim() : (existing.updatedBy || '')
  };
}

// Endpoints
app.get('/api/events', (req, res) => {
  const data = readData();
  res.json(data.events);
});

app.get('/api/events/:id', (req, res) => {
  const data = readData();
  const event = data.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const data = readData();
  const event = sanitizeEvent(req.body);
  data.events.push(event);
  writeData(data);
  res.status(201).json(event);
});

app.put('/api/events/:id', (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const data = readData();
  const idx = data.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Evento no encontrado' });

  data.events[idx] = sanitizeEvent(req.body, data.events[idx]);
  writeData(data);
  res.json(data.events[idx]);
});

app.delete('/api/events/:id', (req, res) => {
  const data = readData();
  const idx = data.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Evento no encontrado' });
  const removed = data.events.splice(idx, 1)[0];
  writeData(data);
  res.json(removed);
});

// Fallback a index.html para rutas no API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EventPro escuchando en http://localhost:${PORT}`);
});
