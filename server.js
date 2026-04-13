const express = require('express');
const session = require('express-session');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// Paths
// =====================================================
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const RECIPIENTS_FILE = path.join(DATA_DIR, 'recipients.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// =====================================================
// Configuración (variables de entorno)
// =====================================================
const APP_PASSWORD = process.env.APP_PASSWORD || 'eventpro';
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// SMTP (email)
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

// Twilio (WhatsApp)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

// =====================================================
// Helpers de datos
// =====================================================
function ensureDirs() {
  [DATA_DIR, UPLOADS_DIR].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
  }
  if (!fs.existsSync(RECIPIENTS_FILE)) {
    fs.writeFileSync(
      RECIPIENTS_FILE,
      JSON.stringify({ recipients: [] }, null, 2)
    );
  }
}
ensureDirs();

function readEvents() {
  ensureDirs();
  try {
    const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    if (!Array.isArray(data.events)) data.events = [];
    return data;
  } catch (err) {
    console.error('Error leyendo eventos:', err);
    return { events: [] };
  }
}
function writeEvents(data) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
}

function readRecipients() {
  ensureDirs();
  try {
    const data = JSON.parse(fs.readFileSync(RECIPIENTS_FILE, 'utf-8'));
    if (!Array.isArray(data.recipients)) data.recipients = [];
    return data;
  } catch (err) {
    console.error('Error leyendo destinatarios:', err);
    return { recipients: [] };
  }
}
function writeRecipients(data) {
  fs.writeFileSync(RECIPIENTS_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// =====================================================
// Middleware
// =====================================================
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION,
      maxAge: 30 * 24 * 3600 * 1000 // 30 días
    }
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  return res.redirect('/login.html');
}

// =====================================================
// Rutas públicas (antes de requireAuth)
// =====================================================
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  req.session.authed = true;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => res.json({ ok: true }));
  } else {
    res.json({ ok: true });
  }
});

app.get('/api/me', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

// Archivos estáticos públicos de la página de login
app.get('/login.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
);
app.get('/login.js', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.js'))
);
app.get('/styles.css', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'styles.css'))
);

// =====================================================
// A partir de aquí todo requiere autenticación
// =====================================================
app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// =====================================================
// Validación de eventos
// =====================================================
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
    attachments: existing.attachments || [],
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: body.updatedBy
      ? String(body.updatedBy).trim()
      : existing.updatedBy || ''
  };
}

// =====================================================
// API de eventos
// =====================================================
app.get('/api/events', (req, res) => {
  res.json(readEvents().events);
});

app.get('/api/events/:id', (req, res) => {
  const event = readEvents().events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(event);
});

app.post('/api/events', async (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const data = readEvents();
  const event = sanitizeEvent(req.body);
  data.events.push(event);
  writeEvents(data);
  notifyEvent(event, 'created').catch((e) =>
    console.error('Notificación fallida:', e)
  );
  res.status(201).json(event);
});

app.put('/api/events/:id', async (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const data = readEvents();
  const idx = data.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Evento no encontrado' });

  const updated = sanitizeEvent(req.body, data.events[idx]);
  data.events[idx] = updated;
  writeEvents(data);
  notifyEvent(updated, 'updated').catch((e) =>
    console.error('Notificación fallida:', e)
  );
  res.json(updated);
});

app.delete('/api/events/:id', (req, res) => {
  const data = readEvents();
  const idx = data.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Evento no encontrado' });
  const removed = data.events.splice(idx, 1)[0];
  writeEvents(data);
  // Eliminar carpeta de adjuntos del evento
  try {
    const eventUploadsDir = path.join(UPLOADS_DIR, removed.id);
    if (fs.existsSync(eventUploadsDir)) {
      fs.rmSync(eventUploadsDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Error eliminando adjuntos:', err);
  }
  notifyEvent(removed, 'deleted').catch((e) =>
    console.error('Notificación fallida:', e)
  );
  res.json(removed);
});

// =====================================================
// API de adjuntos
// =====================================================
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_DIR, req.params.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Nombre seguro: timestamp + nombre original saneado
      const base = Buffer.from(file.originalname, 'latin1')
        .toString('utf8')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 100);
      cb(null, Date.now() + '-' + base);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

app.post(
  '/api/events/:id/attachments',
  upload.single('file'),
  (req, res) => {
    const data = readEvents();
    const event = data.events.find((e) => e.id === req.params.id);
    if (!event)
      return res.status(404).json({ error: 'Evento no encontrado' });
    if (!req.file) return res.status(400).json({ error: 'Falta el fichero' });

    event.attachments = event.attachments || [];
    event.attachments.push({
      filename: req.file.filename,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString(
        'utf8'
      ),
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.body.uploadedBy || ''
    });
    event.updatedAt = new Date().toISOString();
    writeEvents(data);
    res.json(event);
  }
);

app.delete('/api/events/:id/attachments/:filename', (req, res) => {
  const data = readEvents();
  const event = data.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const filename = req.params.filename;
  event.attachments = (event.attachments || []).filter(
    (a) => a.filename !== filename
  );
  event.updatedAt = new Date().toISOString();

  const filepath = path.join(UPLOADS_DIR, req.params.id, filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (err) {
    console.error('Error borrando adjunto:', err);
  }
  writeEvents(data);
  res.json(event);
});

// =====================================================
// API de destinatarios de notificaciones
// =====================================================
app.get('/api/recipients', (req, res) => {
  res.json(readRecipients().recipients);
});

app.post('/api/recipients', (req, res) => {
  const { name, email, phone, notifyEmail, notifyWhatsapp } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  const data = readRecipients();
  const recipient = {
    id: generateId(),
    name: String(name).trim(),
    email: email ? String(email).trim() : '',
    phone: phone ? String(phone).trim() : '',
    notifyEmail: notifyEmail !== false,
    notifyWhatsapp: notifyWhatsapp !== false,
    createdAt: new Date().toISOString()
  };
  data.recipients.push(recipient);
  writeRecipients(data);
  res.status(201).json(recipient);
});

app.put('/api/recipients/:id', (req, res) => {
  const data = readRecipients();
  const idx = data.recipients.findIndex((r) => r.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ error: 'Destinatario no encontrado' });
  const { name, email, phone, notifyEmail, notifyWhatsapp } = req.body || {};
  const existing = data.recipients[idx];
  data.recipients[idx] = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    email: email !== undefined ? String(email).trim() : existing.email,
    phone: phone !== undefined ? String(phone).trim() : existing.phone,
    notifyEmail:
      notifyEmail !== undefined ? !!notifyEmail : existing.notifyEmail,
    notifyWhatsapp:
      notifyWhatsapp !== undefined
        ? !!notifyWhatsapp
        : existing.notifyWhatsapp
  };
  writeRecipients(data);
  res.json(data.recipients[idx]);
});

app.delete('/api/recipients/:id', (req, res) => {
  const data = readRecipients();
  const idx = data.recipients.findIndex((r) => r.id === req.params.id);
  if (idx === -1)
    return res.status(404).json({ error: 'Destinatario no encontrado' });
  const removed = data.recipients.splice(idx, 1)[0];
  writeRecipients(data);
  res.json(removed);
});

// =====================================================
// Notificaciones (email + WhatsApp)
// =====================================================
const TYPE_LABELS = {
  concierto: 'Concierto',
  teatro: 'Obra de teatro',
  presentacion: 'Presentación',
  empresa: 'Evento empresa',
  tecnica: 'Técnica / Prueba',
  transporte: 'Transporte generador',
  montaje: 'Montaje / Desmontaje',
  ensayo: 'Ensayo',
  otro: 'Otro'
};

function buildEventMessage(event, action) {
  const verb =
    action === 'created'
      ? 'CREADO'
      : action === 'updated'
      ? 'ACTUALIZADO'
      : 'ELIMINADO';
  const typeLabel = TYPE_LABELS[event.type] || 'Evento';
  const lines = [
    `📅 Evento ${verb}: ${event.title}`,
    ``,
    `Tipo: ${typeLabel}`,
    `Fecha: ${event.date}${event.time ? ' a las ' + event.time : ''}${
      event.endTime ? ' - ' + event.endTime : ''
    }`,
    `Lugar: ${event.location || '—'}`,
    `Responsable: ${event.assignee || '—'}`
  ];
  if (event.description) {
    lines.push('', event.description);
  }
  lines.push('', `Ver calendario: ${BASE_URL}`);
  return lines.join('\n');
}

function buildEventHTML(event, action) {
  const verb =
    action === 'created'
      ? 'creado'
      : action === 'updated'
      ? 'actualizado'
      : 'eliminado';
  const typeLabel = TYPE_LABELS[event.type] || 'Evento';
  const escape = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 560px;">
      <div style="background: #6366f1; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">📅 Evento ${escape(verb)}</h2>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
        <h3 style="margin: 0 0 12px 0;">${escape(event.title)}</h3>
        <p><strong>Tipo:</strong> ${escape(typeLabel)}</p>
        <p><strong>Fecha:</strong> ${escape(event.date)}${
    event.time ? ' a las ' + escape(event.time) : ''
  }${event.endTime ? ' - ' + escape(event.endTime) : ''}</p>
        <p><strong>Lugar:</strong> ${escape(event.location || '—')}</p>
        <p><strong>Responsable:</strong> ${escape(event.assignee || '—')}</p>
        ${
          event.description
            ? `<p style="background: #f1f5f9; padding: 10px; border-radius: 4px;">${escape(
                event.description
              )}</p>`
            : ''
        }
        <p style="margin-top: 20px;">
          <a href="${BASE_URL}" style="background: #6366f1; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Ver calendario</a>
        </p>
      </div>
    </div>
  `;
}

async function sendEmailNotification(subject, text, html, recipients) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return;
  const emails = recipients
    .filter((r) => r.email && r.notifyEmail)
    .map((r) => r.email);
  if (emails.length === 0) return;

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: emails.join(','),
      subject,
      text,
      html
    });
    console.log(`📧 Email enviado a ${emails.length} destinatarios`);
  } catch (err) {
    console.error('Error enviando email:', err.message);
  }
}

async function sendWhatsAppNotification(message, recipients) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WHATSAPP_FROM) return;
  const phones = recipients
    .filter((r) => r.phone && r.notifyWhatsapp)
    .map((r) => r.phone);
  if (phones.length === 0) return;

  let twilio;
  try {
    twilio = require('twilio')(TWILIO_SID, TWILIO_TOKEN);
  } catch (err) {
    console.error('Twilio no inicializado:', err.message);
    return;
  }

  for (const phone of phones) {
    try {
      await twilio.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: phone.startsWith('whatsapp:') ? phone : 'whatsapp:' + phone,
        body: message
      });
      console.log(`💬 WhatsApp enviado a ${phone}`);
    } catch (err) {
      console.error(`Error enviando WhatsApp a ${phone}:`, err.message);
    }
  }
}

async function notifyEvent(event, action) {
  const { recipients } = readRecipients();
  if (recipients.length === 0) return;

  const subject = `📅 Evento ${
    action === 'created'
      ? 'creado'
      : action === 'updated'
      ? 'actualizado'
      : 'eliminado'
  }: ${event.title}`;
  const text = buildEventMessage(event, action);
  const html = buildEventHTML(event, action);

  await Promise.all([
    sendEmailNotification(subject, text, html, recipients),
    sendWhatsAppNotification(text, recipients)
  ]);
}

// =====================================================
// Estado de integraciones (para la UI)
// =====================================================
app.get('/api/integrations-status', (req, res) => {
  res.json({
    email: !!(SMTP_HOST && SMTP_USER && SMTP_PASS),
    whatsapp: !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_WHATSAPP_FROM)
  });
});

// =====================================================
// Manejador de errores de multer
// =====================================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Fichero demasiado grande (máx. 20 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
  next();
});

// =====================================================
// Fallback al index.html para rutas del SPA
// =====================================================
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎭 EventPro escuchando en http://localhost:${PORT}`);
  console.log(
    `   Email: ${SMTP_HOST ? '✓ configurado' : '✗ no configurado'}`
  );
  console.log(
    `   WhatsApp: ${TWILIO_SID ? '✓ configurado' : '✗ no configurado'}`
  );
});
