// ============ Configuración ============
const EVENT_TYPES = [
  { value: 'concierto', label: 'Concierto', color: 'var(--type-concierto)' },
  { value: 'teatro', label: 'Obra de teatro', color: 'var(--type-teatro)' },
  { value: 'presentacion', label: 'Presentación', color: 'var(--type-presentacion)' },
  { value: 'empresa', label: 'Evento empresa', color: 'var(--type-empresa)' },
  { value: 'tecnica', label: 'Técnica / Prueba', color: 'var(--type-tecnica)' },
  { value: 'transporte', label: 'Transporte generador', color: 'var(--type-transporte)' },
  { value: 'montaje', label: 'Montaje / Desmontaje', color: 'var(--type-montaje)' },
  { value: 'ensayo', label: 'Ensayo', color: 'var(--type-ensayo)' },
  { value: 'otro', label: 'Otro', color: 'var(--type-otro)' }
];

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ============ Estado ============
const state = {
  events: [],
  recipients: [],
  integrations: { email: false, whatsapp: false },
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  filterType: '',
  userName: localStorage.getItem('eventpro_user') || ''
};

// ============ DOM refs ============
const $ = (id) => document.getElementById(id);

// ============ Utils ============
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getTypeConfig(value) {
  return EVENT_TYPES.find((t) => t.value === value) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function showToast(message, variant = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${variant}`;
  toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.hidden = true; }, 2800);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============ API ============
async function api(path, options = {}) {
  const opts = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  };
  const res = await fetch(path, opts);
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('No autenticado');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.errors ? err.errors.join(', ') : (err.error || 'Error'));
  }
  return res.json();
}

async function apiUpload(path, formData) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    body: formData
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('No autenticado');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Error subiendo fichero');
  }
  return res.json();
}

async function loadEvents() {
  try {
    state.events = await api('/api/events');
    renderAll();
  } catch (err) {
    showToast('No se pudieron cargar los eventos: ' + err.message, 'error');
  }
}

async function loadIntegrations() {
  try {
    state.integrations = await api('/api/integrations-status');
  } catch (err) {
    console.error(err);
  }
}

async function loadRecipients() {
  try {
    state.recipients = await api('/api/recipients');
  } catch (err) {
    showToast('Error cargando destinatarios: ' + err.message, 'error');
  }
}

// ============ Render calendario ============
function renderWeekdays() {
  $('weekdays').innerHTML = WEEKDAYS.map((w) => `<div class="weekday">${w}</div>`).join('');
}

function renderLegend() {
  $('typeLegend').innerHTML = EVENT_TYPES.map(
    (t) =>
      `<span class="legend-chip"><span class="legend-dot" style="background:${t.color}"></span>${t.label}</span>`
  ).join('');
}

function renderTypeOptions() {
  const filterSel = $('filterType');
  const formSel = $('fType');
  filterSel.innerHTML =
    '<option value="">Todos los tipos</option>' +
    EVENT_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join('');
  formSel.innerHTML = EVENT_TYPES.map(
    (t) => `<option value="${t.value}">${t.label}</option>`
  ).join('');
}

function renderCalendar() {
  const monthStart = new Date(state.currentYear, state.currentMonth, 1);
  const monthEnd = new Date(state.currentYear, state.currentMonth + 1, 0);
  let startWeekday = (monthStart.getDay() + 6) % 7;

  $('monthLabel').textContent = `${MONTHS[state.currentMonth]} ${state.currentYear}`;

  const grid = $('calendarGrid');
  grid.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - i - 1);
    grid.appendChild(createDayCell(d, true, today));
  }
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const d = new Date(state.currentYear, state.currentMonth, day);
    grid.appendChild(createDayCell(d, false, today));
  }
  const remainder = grid.children.length % 7;
  if (remainder !== 0) {
    const extras = 7 - remainder;
    for (let i = 1; i <= extras; i++) {
      const d = new Date(state.currentYear, state.currentMonth + 1, i);
      grid.appendChild(createDayCell(d, true, today));
    }
  }
}

function createDayCell(date, otherMonth, today) {
  const cell = document.createElement('div');
  cell.className = 'day' + (otherMonth ? ' other-month' : '');
  const iso = formatDateISO(date);
  cell.dataset.date = iso;
  if (date.getTime() === today.getTime()) cell.classList.add('today');

  const num = document.createElement('span');
  num.className = 'day-number';
  num.textContent = date.getDate();
  cell.appendChild(num);

  const dayEvents = state.events
    .filter((e) => e.date === iso)
    .filter((e) => !state.filterType || e.type === state.filterType)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  const maxVisible = 3;
  dayEvents.slice(0, maxVisible).forEach((ev) => {
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    const type = getTypeConfig(ev.type);
    chip.style.background = type.color;
    const label = (ev.time ? ev.time + ' ' : '') + ev.title;
    chip.title = label;
    chip.textContent = label;
    if (ev.attachments && ev.attachments.length) {
      const clip = document.createElement('span');
      clip.className = 'chip-paperclip';
      clip.textContent = '📎';
      chip.appendChild(clip);
    }
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail(ev);
    });
    cell.appendChild(chip);
  });

  if (dayEvents.length > maxVisible) {
    const more = document.createElement('div');
    more.className = 'event-more';
    more.textContent = `+${dayEvents.length - maxVisible} más`;
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail(dayEvents[maxVisible]);
    });
    cell.appendChild(more);
  }

  cell.addEventListener('click', () => openForm(null, iso));
  return cell;
}

function renderUpcoming() {
  const list = $('upcomingList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = state.events
    .filter((e) => parseDate(e.date) >= today)
    .filter((e) => !state.filterType || e.type === state.filterType)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 6);

  if (upcoming.length === 0) {
    list.innerHTML =
      '<li style="color:var(--text-dim);padding:1rem;text-align:center;">No hay eventos próximos. Haz clic en un día para crear uno.</li>';
    return;
  }

  list.innerHTML = '';
  upcoming.forEach((ev) => {
    const type = getTypeConfig(ev.type);
    const d = parseDate(ev.date);
    const li = document.createElement('li');
    li.className = 'upcoming-item';
    li.innerHTML = `
      <div class="upcoming-date">
        <span class="day-num">${d.getDate()}</span>
        <span class="month-short">${MONTHS_SHORT[d.getMonth()]}</span>
      </div>
      <div class="upcoming-content">
        <div class="title"></div>
        <div class="meta"></div>
      </div>
      <span class="upcoming-badge"></span>
    `;
    li.querySelector('.title').textContent = ev.title;
    const metaParts = [];
    if (ev.time) metaParts.push('🕒 ' + ev.time + (ev.endTime ? ' - ' + ev.endTime : ''));
    if (ev.location) metaParts.push('📍 ' + ev.location);
    if (ev.attachments && ev.attachments.length)
      metaParts.push(`📎 ${ev.attachments.length}`);
    li.querySelector('.meta').textContent = metaParts.join(' · ') || '—';
    const badge = li.querySelector('.upcoming-badge');
    badge.textContent = type.label;
    badge.style.background = type.color;
    li.addEventListener('click', () => openDetail(ev));
    list.appendChild(li);
  });
}

function renderAll() {
  renderCalendar();
  renderUpcoming();
}

// ============ Modal evento ============
let currentEvent = null;

function openModal() { $('modal').hidden = false; }
function closeModal() {
  $('modal').hidden = true;
  currentEvent = null;
  $('formError').hidden = true;
}

function openDetail(event) {
  currentEvent = event;
  $('detailView').hidden = false;
  $('formView').hidden = true;
  $('modalTitle').textContent = 'Detalle del evento';

  const type = getTypeConfig(event.type);
  const typeEl = $('detailType');
  typeEl.textContent = type.label;
  typeEl.style.background = type.color;

  $('detailTitle').textContent = event.title;
  const d = parseDate(event.date);
  $('detailDate').textContent = d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  $('detailTime').textContent = event.time
    ? event.time + (event.endTime ? ' — ' + event.endTime : '')
    : '—';
  $('detailLocation').textContent = event.location || '—';
  $('detailAssignee').textContent = event.assignee || '—';
  $('detailDescription').textContent = event.description || '—';

  renderAttachments(event);

  const updated = event.updatedAt ? new Date(event.updatedAt).toLocaleString('es-ES') : '';
  $('detailMeta').textContent = `Última actualización: ${updated}${event.updatedBy ? ' por ' + event.updatedBy : ''}`;

  openModal();
}

function renderAttachments(event) {
  const list = $('detailAttachments');
  const attachments = event.attachments || [];
  if (attachments.length === 0) {
    list.innerHTML =
      '<li style="color:var(--text-dim);font-size:0.8rem;">Sin adjuntos</li>';
    return;
  }
  list.innerHTML = '';
  attachments.forEach((att) => {
    const li = document.createElement('li');
    li.className = 'attachment-item';
    const icon = getFileIcon(att.mimetype, att.originalName);
    li.innerHTML = `
      <span class="icon">${icon}</span>
      <a href="/uploads/${encodeURIComponent(event.id)}/${encodeURIComponent(att.filename)}"
         target="_blank" rel="noopener"
         download="${escapeHtml(att.originalName)}"></a>
      <span class="size"></span>
      <button type="button" class="btn-remove" title="Eliminar adjunto">✕</button>
    `;
    li.querySelector('a').textContent = att.originalName;
    li.querySelector('.size').textContent = humanSize(att.size);
    li.querySelector('.btn-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAttachment(event.id, att.filename);
    });
    list.appendChild(li);
  });
}

function getFileIcon(mimetype = '', name = '') {
  const m = (mimetype || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (m.startsWith('image/')) return '🖼️';
  if (m === 'application/pdf' || ext === 'pdf') return '📄';
  if (m.includes('word') || ['doc', 'docx'].includes(ext)) return '📝';
  if (m.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (m.startsWith('audio/')) return '🎵';
  if (m.startsWith('video/')) return '🎬';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  return '📎';
}

async function uploadAttachment(file) {
  if (!currentEvent) return;
  if (!currentEvent.id) {
    showToast('Guarda primero el evento para añadir adjuntos', 'error');
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadedBy', state.userName || '');

  try {
    const updated = await apiUpload(`/api/events/${currentEvent.id}/attachments`, formData);
    currentEvent = updated;
    const idx = state.events.findIndex((e) => e.id === updated.id);
    if (idx !== -1) state.events[idx] = updated;
    renderAttachments(updated);
    renderAll();
    showToast('Fichero subido');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteAttachment(eventId, filename) {
  if (!confirm('¿Eliminar este adjunto?')) return;
  try {
    const updated = await api(
      `/api/events/${eventId}/attachments/${encodeURIComponent(filename)}`,
      { method: 'DELETE' }
    );
    currentEvent = updated;
    const idx = state.events.findIndex((e) => e.id === updated.id);
    if (idx !== -1) state.events[idx] = updated;
    renderAttachments(updated);
    renderAll();
    showToast('Adjunto eliminado');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function openForm(event, defaultDate) {
  currentEvent = event;
  $('detailView').hidden = true;
  $('formView').hidden = false;
  $('formError').hidden = true;
  $('modalTitle').textContent = event ? 'Editar evento' : 'Nuevo evento';

  $('eventId').value = event ? event.id : '';
  $('fTitle').value = event ? event.title : '';
  $('fDate').value = event ? event.date : (defaultDate || formatDateISO(new Date()));
  $('fType').value = event ? event.type : 'otro';
  $('fTime').value = event ? (event.time || '') : '';
  $('fEndTime').value = event ? (event.endTime || '') : '';
  $('fLocation').value = event ? (event.location || '') : '';
  $('fAssignee').value = event ? (event.assignee || '') : (state.userName || '');
  $('fDescription').value = event ? (event.description || '') : '';

  openModal();
  setTimeout(() => $('fTitle').focus(), 50);
}

async function saveEvent(e) {
  e.preventDefault();
  const id = $('eventId').value;
  const payload = {
    title: $('fTitle').value.trim(),
    date: $('fDate').value,
    type: $('fType').value,
    time: $('fTime').value,
    endTime: $('fEndTime').value,
    location: $('fLocation').value.trim(),
    assignee: $('fAssignee').value.trim(),
    description: $('fDescription').value.trim(),
    updatedBy: state.userName || ''
  };
  if (!payload.title) return formError('El título es obligatorio');
  if (!payload.date) return formError('La fecha es obligatoria');

  try {
    let saved;
    if (id) {
      saved = await api(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const idx = state.events.findIndex((ev) => ev.id === id);
      if (idx !== -1) state.events[idx] = saved;
      showToast('Evento actualizado');
    } else {
      saved = await api('/api/events', { method: 'POST', body: JSON.stringify(payload) });
      state.events.push(saved);
      showToast('Evento creado');
    }
    closeModal();
    renderAll();
  } catch (err) {
    formError(err.message);
  }
}

function formError(message) {
  $('formError').textContent = message;
  $('formError').hidden = false;
}

async function deleteEvent() {
  if (!currentEvent) return;
  if (!confirm(`¿Eliminar "${currentEvent.title}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`/api/events/${currentEvent.id}`, { method: 'DELETE' });
    state.events = state.events.filter((e) => e.id !== currentEvent.id);
    showToast('Evento eliminado');
    closeModal();
    renderAll();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

// ============ Modal destinatarios ============
async function openRecipientsModal() {
  $('recipientError').hidden = true;
  $('recipientForm').reset();
  $('rNotifyEmail').checked = true;
  $('rNotifyWhatsapp').checked = true;
  await Promise.all([loadIntegrations(), loadRecipients()]);
  renderIntegrationsStatus();
  renderRecipientsList();
  $('recipientsModal').hidden = false;
}

function closeRecipientsModal() {
  $('recipientsModal').hidden = true;
}

function renderIntegrationsStatus() {
  const el = $('integrationsStatus');
  const emailCls = state.integrations.email ? 'on' : 'off';
  const whCls = state.integrations.whatsapp ? 'on' : 'off';
  const emailTxt = state.integrations.email
    ? '✓ Email activo'
    : '✗ Email no configurado';
  const whTxt = state.integrations.whatsapp
    ? '✓ WhatsApp activo'
    : '✗ WhatsApp no configurado';
  el.innerHTML = `
    <span class="integration-chip ${emailCls}">${emailTxt}</span>
    <span class="integration-chip ${whCls}">${whTxt}</span>
  `;
}

function renderRecipientsList() {
  const list = $('recipientsList');
  if (state.recipients.length === 0) {
    list.innerHTML =
      '<li style="color:var(--text-dim);text-align:center;padding:1rem;">No hay destinatarios aún. Añade al menos uno para que reciba las notificaciones.</li>';
    return;
  }
  list.innerHTML = '';
  state.recipients.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'recipient-item';
    li.innerHTML = `
      <div class="info">
        <div class="name"></div>
        <div class="contacts"></div>
      </div>
      <button type="button" class="btn-remove" title="Eliminar">✕</button>
    `;
    li.querySelector('.name').textContent = r.name;
    const contacts = li.querySelector('.contacts');
    if (r.email) {
      const c = document.createElement('span');
      c.className = 'channel-chip' + (r.notifyEmail ? ' active' : '');
      c.textContent = '📧 ' + r.email;
      contacts.appendChild(c);
    }
    if (r.phone) {
      const c = document.createElement('span');
      c.className = 'channel-chip' + (r.notifyWhatsapp ? ' active' : '');
      c.textContent = '💬 ' + r.phone;
      contacts.appendChild(c);
    }
    if (!r.email && !r.phone) {
      contacts.textContent = 'Sin contacto';
    }
    li.querySelector('.btn-remove').addEventListener('click', () =>
      deleteRecipient(r.id)
    );
    list.appendChild(li);
  });
}

async function saveRecipient(e) {
  e.preventDefault();
  $('recipientError').hidden = true;
  const payload = {
    name: $('rName').value.trim(),
    email: $('rEmail').value.trim(),
    phone: $('rPhone').value.trim(),
    notifyEmail: $('rNotifyEmail').checked,
    notifyWhatsapp: $('rNotifyWhatsapp').checked
  };
  if (!payload.name) {
    $('recipientError').textContent = 'El nombre es obligatorio';
    $('recipientError').hidden = false;
    return;
  }
  if (!payload.email && !payload.phone) {
    $('recipientError').textContent =
      'Añade al menos un email o un teléfono de WhatsApp';
    $('recipientError').hidden = false;
    return;
  }
  try {
    const created = await api('/api/recipients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.recipients.push(created);
    renderRecipientsList();
    $('recipientForm').reset();
    $('rNotifyEmail').checked = true;
    $('rNotifyWhatsapp').checked = true;
    showToast('Destinatario añadido');
  } catch (err) {
    $('recipientError').textContent = err.message;
    $('recipientError').hidden = false;
  }
}

async function deleteRecipient(id) {
  if (!confirm('¿Eliminar este destinatario?')) return;
  try {
    await api(`/api/recipients/${id}`, { method: 'DELETE' });
    state.recipients = state.recipients.filter((r) => r.id !== id);
    renderRecipientsList();
    showToast('Destinatario eliminado');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ============ Navegación ============
function changeMonth(delta) {
  state.currentMonth += delta;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear--;
  } else if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear++;
  }
  renderCalendar();
}

function goToToday() {
  const now = new Date();
  state.currentMonth = now.getMonth();
  state.currentYear = now.getFullYear();
  renderCalendar();
}

// ============ Logout ============
async function logout() {
  if (!confirm('¿Cerrar sesión?')) return;
  try {
    await api('/api/logout', { method: 'POST' });
  } catch (err) {}
  window.location.href = '/login.html';
}

// ============ Auto-refresco ============
let lastEventsHash = '';
async function checkUpdates() {
  try {
    const events = await api('/api/events');
    const hash = JSON.stringify(events.map((e) => e.id + e.updatedAt));
    if (hash !== lastEventsHash) {
      lastEventsHash = hash;
      state.events = events;
      renderAll();
    }
  } catch (err) {
    // silencioso
  }
}

// ============ Inicialización ============
async function init() {
  // Verificar autenticación
  try {
    const me = await fetch('/api/me').then((r) => r.json());
    if (!me.authed) {
      window.location.href = '/login.html';
      return;
    }
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  renderWeekdays();
  renderLegend();
  renderTypeOptions();

  // Usuario
  $('userName').value = state.userName;
  $('userName').addEventListener('input', (e) => {
    state.userName = e.target.value.trim();
    localStorage.setItem('eventpro_user', state.userName);
  });

  // Navegación
  $('prevMonth').addEventListener('click', () => changeMonth(-1));
  $('nextMonth').addEventListener('click', () => changeMonth(1));
  $('todayBtn').addEventListener('click', goToToday);

  // Nuevo evento
  $('newEventBtn').addEventListener('click', () => openForm(null));

  // Filtro
  $('filterType').addEventListener('change', (e) => {
    state.filterType = e.target.value;
    renderAll();
  });

  // Modal evento
  $('closeModal').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('modal').hidden) closeModal();
      else if (!$('recipientsModal').hidden) closeRecipientsModal();
    }
  });

  $('editBtn').addEventListener('click', () => {
    if (currentEvent) openForm(currentEvent);
  });
  $('deleteBtn').addEventListener('click', deleteEvent);
  $('cancelEdit').addEventListener('click', () => {
    if (currentEvent && currentEvent.id) openDetail(currentEvent);
    else closeModal();
  });
  $('formView').addEventListener('submit', saveEvent);

  // Adjuntos
  $('attachBtn').addEventListener('click', () => $('attachInput').click());
  $('attachInput').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadAttachment(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Destinatarios
  $('recipientsBtn').addEventListener('click', openRecipientsModal);
  $('closeRecipientsModal').addEventListener('click', closeRecipientsModal);
  $('recipientsModal').addEventListener('click', (e) => {
    if (e.target.id === 'recipientsModal') closeRecipientsModal();
  });
  $('recipientForm').addEventListener('submit', saveRecipient);

  // Logout
  $('logoutBtn').addEventListener('click', logout);

  await loadEvents();
  await loadIntegrations();
  setInterval(checkUpdates, 15000);
}

init();
