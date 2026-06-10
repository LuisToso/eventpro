// ============ Configuración ============
const PROJECT_COLORS = [
  '#f97316', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7',
  '#eab308', '#14b8a6', '#3b82f6', '#ec4899', '#10b981'
];

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
  projects: [],
  integrations: { email: false, whatsapp: false },
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  filterType: '',
  filterProject: '',
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

async function loadProjects() {
  try {
    state.projects = await api('/api/projects');
    renderProjectFilter();
    renderProjectFormOptions();
  } catch (err) {
    showToast('Error cargando proyectos: ' + err.message, 'error');
  }
}

function getProjectById(id) {
  return state.projects.find((p) => p.id === id) || null;
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
    .filter((e) => !state.filterProject || e.projectId === state.filterProject)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  const maxVisible = 3;
  dayEvents.slice(0, maxVisible).forEach((ev) => {
    const chip = document.createElement('div');
    const type = getTypeConfig(ev.type);
    const project = ev.projectId ? getProjectById(ev.projectId) : null;
    chip.className = 'event-chip' + (project ? ' has-project' : '');
    chip.style.background = type.color;
    if (project) {
      chip.style.borderLeftColor = project.color;
    }
    const label = (ev.time ? ev.time + ' ' : '') + ev.title;
    chip.title = label + (project ? ' · ' + project.name : '');
    // Project dot
    if (project) {
      const dot = document.createElement('span');
      dot.className = 'chip-proj-dot';
      dot.style.background = project.color;
      chip.appendChild(dot);
    }
    const text = document.createTextNode(label);
    chip.appendChild(text);
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
    .filter((e) => !state.filterProject || e.projectId === state.filterProject)
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

  // Project badge
  const badgeEl = $('detailProjectBadge');
  const project = event.projectId ? getProjectById(event.projectId) : null;
  if (project) {
    badgeEl.hidden = false;
    badgeEl.innerHTML = '';
    const badge = document.createElement('span');
    badge.className = 'project-badge';
    badge.style.background = project.color;
    badge.title = 'Ver proyecto: ' + project.name;
    const dot = document.createElement('span');
    dot.className = 'project-badge-dot';
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode('📁 ' + project.name));
    badge.addEventListener('click', () => {
      closeModal();
      openProjectsModal(project.id);
    });
    badgeEl.appendChild(badge);
  } else {
    badgeEl.hidden = true;
    badgeEl.innerHTML = '';
  }

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
  $('fProject').value = event ? (event.projectId || '') : (state.filterProject || '');
  $('fDescription').value = event ? (event.description || '') : '';

  openModal();
  setTimeout(() => $('fTitle').focus(), 50);
}

async function saveEvent(e) {
  e.preventDefault();
  const id = $('eventId').value;
  const selectedProjectId = $('fProject').value;
  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;
  const payload = {
    title: $('fTitle').value.trim(),
    date: $('fDate').value,
    type: $('fType').value,
    time: $('fTime').value,
    endTime: $('fEndTime').value,
    location: $('fLocation').value.trim(),
    assignee: $('fAssignee').value.trim(),
    description: $('fDescription').value.trim(),
    projectId: selectedProjectId || null,
    projectName: selectedProject ? selectedProject.name : null,
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

// ============ Projects filter & form helpers ============
function renderProjectFilter() {
  const sel = $('filterProject');
  const current = sel.value;
  sel.innerHTML = '<option value="">Todos los proyectos</option>' +
    state.projects.map((p) =>
      `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`
    ).join('');
  if (state.projects.find((p) => p.id === current)) sel.value = current;
}

function renderProjectFormOptions() {
  const sel = $('fProject');
  const current = sel.value;
  sel.innerHTML = '<option value="">Sin proyecto</option>' +
    state.projects.map((p) =>
      `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`
    ).join('');
  if (state.projects.find((p) => p.id === current)) sel.value = current;
}

// ============ Projects modal ============
let projectsPanelMode = 'list'; // 'list' | 'detail' | 'edit'
let currentProjectId = null;
let selectedNewProjectColor = PROJECT_COLORS[7]; // default azul

function openProjectsModal(focusProjectId) {
  currentProjectId = focusProjectId || null;
  projectsPanelMode = focusProjectId ? 'detail' : 'list';
  selectedNewProjectColor = PROJECT_COLORS[7];
  renderProjectsPanel();
  $('projectsModal').hidden = false;
}

function closeProjectsModal() {
  $('projectsModal').hidden = true;
  currentProjectId = null;
  projectsPanelMode = 'list';
}

function renderProjectsPanel() {
  if (projectsPanelMode === 'list') renderProjectsList();
  else if (projectsPanelMode === 'detail') renderProjectDetail();
  else if (projectsPanelMode === 'edit') renderProjectEdit();
}

function renderProjectsList() {
  const body = $('projectsPanelBody');
  body.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'projects-panel';

  // List
  const list = document.createElement('ul');
  list.className = 'projects-list';

  if (state.projects.length === 0) {
    const li = document.createElement('li');
    li.style.cssText = 'color:var(--text-dim);text-align:center;padding:1rem;';
    li.textContent = 'No hay proyectos. Crea uno abajo.';
    list.appendChild(li);
  } else {
    state.projects.forEach((p) => {
      const evCount = state.events.filter((e) => e.projectId === p.id).length;
      const li = document.createElement('li');
      li.className = 'project-item';
      li.innerHTML = `
        <div class="project-color-dot" style="background:${escapeHtml(p.color)}"></div>
        <div class="project-info">
          <div class="project-name"></div>
          <div class="project-meta">
            <span class="project-status-badge ${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>
            <span class="project-event-count">${evCount} evento${evCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      `;
      li.querySelector('.project-name').textContent = p.name;
      li.addEventListener('click', () => {
        currentProjectId = p.id;
        projectsPanelMode = 'detail';
        renderProjectsPanel();
      });
      list.appendChild(li);
    });
  }
  panel.appendChild(list);

  // New project form
  const formSection = document.createElement('div');
  formSection.className = 'new-project-form';
  formSection.innerHTML = `
    <h4>Nuevo proyecto</h4>
    <div class="form-row">
      <label>Nombre *
        <input type="text" id="pName" maxlength="120" placeholder="Ej: Pulso Naranja Tour" />
      </label>
    </div>
    <div class="form-row">
      <label>Color
        <div class="color-palette" id="colorPalette"></div>
      </label>
    </div>
    <div class="form-row">
      <label>Descripción
        <textarea id="pDescription" rows="2" maxlength="500" placeholder="Descripción del proyecto..."></textarea>
      </label>
    </div>
    <div class="form-row">
      <label>Estado
        <select id="pStatus">
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </label>
    </div>
    <div class="form-error" id="projectFormError" hidden></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary" id="saveNewProjectBtn">Crear proyecto</button>
    </div>
  `;
  panel.appendChild(formSection);
  body.appendChild(panel);

  // Render color palette
  renderColorPalette('colorPalette', selectedNewProjectColor, (color) => {
    selectedNewProjectColor = color;
  });

  $('saveNewProjectBtn').addEventListener('click', saveNewProject);
}

function renderColorPalette(containerId, selected, onChange) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  PROJECT_COLORS.forEach((color) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (color === selected ? ' selected' : '');
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
      onChange(color);
    });
    container.appendChild(swatch);
  });
}

async function saveNewProject() {
  const name = ($('pName').value || '').trim();
  const errEl = $('projectFormError');
  errEl.hidden = true;
  if (!name) {
    errEl.textContent = 'El nombre es obligatorio';
    errEl.hidden = false;
    return;
  }
  const payload = {
    name,
    color: selectedNewProjectColor,
    description: ($('pDescription').value || '').trim(),
    status: $('pStatus').value || 'activo',
    updatedBy: state.userName || ''
  };
  try {
    const created = await api('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
    state.projects.push(created);
    renderProjectFilter();
    renderProjectFormOptions();
    showToast('Proyecto creado');
    currentProjectId = created.id;
    projectsPanelMode = 'detail';
    renderProjectsPanel();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

function renderProjectDetail() {
  const project = state.projects.find((p) => p.id === currentProjectId);
  if (!project) { projectsPanelMode = 'list'; renderProjectsPanel(); return; }

  const projectEvents = state.events
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  const body = $('projectsPanelBody');
  body.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'project-detail-view';

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost btn-sm';
  backBtn.textContent = '← Volver a proyectos';
  backBtn.addEventListener('click', () => {
    projectsPanelMode = 'list';
    renderProjectsPanel();
  });
  view.appendChild(backBtn);

  // Header
  const header = document.createElement('div');
  header.className = 'project-detail-header';
  const colorDot = document.createElement('div');
  colorDot.className = 'project-detail-color';
  colorDot.style.background = project.color;
  const titleEl = document.createElement('h3');
  titleEl.className = 'project-detail-title';
  titleEl.textContent = project.name;
  const statusBadge = document.createElement('span');
  statusBadge.className = `project-status-badge ${project.status}`;
  statusBadge.textContent = project.status;
  header.appendChild(colorDot);
  header.appendChild(titleEl);
  header.appendChild(statusBadge);
  view.appendChild(header);

  if (project.description) {
    const desc = document.createElement('p');
    desc.className = 'project-detail-desc';
    desc.textContent = project.description;
    view.appendChild(desc);
  }

  // Events list
  const evHeader = document.createElement('div');
  evHeader.style.cssText = 'font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:0.25rem;';
  evHeader.textContent = `${projectEvents.length} evento${projectEvents.length !== 1 ? 's' : ''}`;
  view.appendChild(evHeader);

  if (projectEvents.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text-dim);font-size:0.85rem;';
    empty.textContent = 'No hay eventos en este proyecto.';
    view.appendChild(empty);
  } else {
    const evList = document.createElement('ul');
    evList.className = 'project-events-list';
    projectEvents.forEach((ev) => {
      const type = getTypeConfig(ev.type);
      const li = document.createElement('li');
      li.className = 'project-event-item';
      li.style.borderLeftColor = project.color;

      const dateEl = document.createElement('span');
      dateEl.className = 'project-event-date';
      const d = parseDate(ev.date);
      dateEl.textContent = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

      const titleSpan = document.createElement('span');
      titleSpan.className = 'project-event-title';
      titleSpan.textContent = ev.title;

      const typeSpan = document.createElement('span');
      typeSpan.className = 'project-event-type';
      typeSpan.style.background = type.color;
      typeSpan.textContent = type.label;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'project-event-meta';
      const metaParts = [];
      if (ev.time) metaParts.push(ev.time);
      if (ev.location) metaParts.push(ev.location);
      if (ev.assignee) metaParts.push(ev.assignee);
      metaSpan.textContent = metaParts.join(' · ');

      li.appendChild(dateEl);
      li.appendChild(titleSpan);
      li.appendChild(typeSpan);
      if (metaSpan.textContent) li.appendChild(metaSpan);

      li.addEventListener('click', () => {
        closeProjectsModal();
        openDetail(ev);
      });
      evList.appendChild(li);
    });
    view.appendChild(evList);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  actions.style.borderTop = '1px solid var(--border)';
  actions.style.paddingTop = '1rem';
  actions.style.marginTop = '0.5rem';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost';
  editBtn.textContent = 'Editar proyecto';
  editBtn.addEventListener('click', () => {
    projectsPanelMode = 'edit';
    renderProjectsPanel();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger';
  deleteBtn.textContent = 'Eliminar proyecto';
  deleteBtn.addEventListener('click', () => deleteProject(project.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  view.appendChild(actions);

  body.appendChild(view);
}

let editProjectColor = '';

function renderProjectEdit() {
  const project = state.projects.find((p) => p.id === currentProjectId);
  if (!project) { projectsPanelMode = 'list'; renderProjectsPanel(); return; }

  editProjectColor = project.color;

  const body = $('projectsPanelBody');
  body.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'project-detail-view';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost btn-sm';
  backBtn.textContent = '← Cancelar';
  backBtn.addEventListener('click', () => {
    projectsPanelMode = 'detail';
    renderProjectsPanel();
  });
  view.appendChild(backBtn);

  const formHtml = `
    <div class="form-row">
      <label>Nombre *
        <input type="text" id="pEditName" maxlength="120" value="${escapeHtml(project.name)}" />
      </label>
    </div>
    <div class="form-row">
      <label>Color
        <div class="color-palette" id="editColorPalette"></div>
      </label>
    </div>
    <div class="form-row">
      <label>Descripción
        <textarea id="pEditDescription" rows="2" maxlength="500">${escapeHtml(project.description || '')}</textarea>
      </label>
    </div>
    <div class="form-row">
      <label>Estado
        <select id="pEditStatus">
          <option value="activo" ${project.status === 'activo' ? 'selected' : ''}>Activo</option>
          <option value="pausado" ${project.status === 'pausado' ? 'selected' : ''}>Pausado</option>
          <option value="finalizado" ${project.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
        </select>
      </label>
    </div>
    <div class="form-error" id="projectEditError" hidden></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-primary" id="saveEditProjectBtn">Guardar cambios</button>
    </div>
  `;
  const formDiv = document.createElement('div');
  formDiv.innerHTML = formHtml;
  view.appendChild(formDiv);
  body.appendChild(view);

  renderColorPalette('editColorPalette', editProjectColor, (color) => {
    editProjectColor = color;
  });

  $('saveEditProjectBtn').addEventListener('click', () => saveEditProject(project.id));
}

async function saveEditProject(id) {
  const name = ($('pEditName').value || '').trim();
  const errEl = $('projectEditError');
  errEl.hidden = true;
  if (!name) {
    errEl.textContent = 'El nombre es obligatorio';
    errEl.hidden = false;
    return;
  }
  const payload = {
    name,
    color: editProjectColor,
    description: ($('pEditDescription').value || '').trim(),
    status: $('pEditStatus').value || 'activo',
    updatedBy: state.userName || ''
  };
  try {
    const updated = await api(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const idx = state.projects.findIndex((p) => p.id === id);
    if (idx !== -1) state.projects[idx] = updated;
    // Update projectName on events in local state
    state.events.forEach((ev) => {
      if (ev.projectId === id) ev.projectName = updated.name;
    });
    renderProjectFilter();
    renderProjectFormOptions();
    renderAll();
    showToast('Proyecto actualizado');
    projectsPanelMode = 'detail';
    renderProjectsPanel();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

async function deleteProject(id) {
  const project = state.projects.find((p) => p.id === id);
  if (!project) return;
  if (!confirm(`¿Eliminar proyecto "${project.name}"? Los eventos quedarán sin proyecto.`)) return;
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    state.projects = state.projects.filter((p) => p.id !== id);
    // Clear project from local events state
    state.events.forEach((ev) => {
      if (ev.projectId === id) {
        ev.projectId = null;
        ev.projectName = null;
      }
    });
    renderProjectFilter();
    renderProjectFormOptions();
    renderAll();
    showToast('Proyecto eliminado');
    projectsPanelMode = 'list';
    currentProjectId = null;
    renderProjectsPanel();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
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

  // Filtro tipo
  $('filterType').addEventListener('change', (e) => {
    state.filterType = e.target.value;
    renderAll();
  });

  // Filtro proyecto
  $('filterProject').addEventListener('change', (e) => {
    state.filterProject = e.target.value;
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
      else if (!$('projectsModal').hidden) closeProjectsModal();
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

  // Proyectos
  $('projectsBtn').addEventListener('click', () => openProjectsModal());
  $('closeProjectsModal').addEventListener('click', closeProjectsModal);
  $('projectsModal').addEventListener('click', (e) => {
    if (e.target.id === 'projectsModal') closeProjectsModal();
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

  await loadProjects();
  await loadEvents();
  await loadIntegrations();
  setInterval(checkUpdates, 15000);
}

init();
