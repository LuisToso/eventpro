// ---- Tipos de actividad ----
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

// ---- Estado ----
let state = {
  events: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  filterType: '',
  userName: localStorage.getItem('eventpro_user') || ''
};

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);

// ---- Utils ----
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
  return EVENT_TYPES.find(t => t.value === value) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function showToast(message, variant = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${variant}`;
  toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.hidden = true; }, 2800);
}

// ---- API ----
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.errors ? err.errors.join(', ') : (err.error || 'Error'));
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

// ---- Render ----
function renderWeekdays() {
  const el = $('weekdays');
  el.innerHTML = WEEKDAYS.map(w => `<div class="weekday">${w}</div>`).join('');
}

function renderLegend() {
  $('typeLegend').innerHTML = EVENT_TYPES.map(t =>
    `<span class="legend-chip"><span class="legend-dot" style="background:${t.color}"></span>${t.label}</span>`
  ).join('');
}

function renderTypeOptions() {
  const filterSel = $('filterType');
  const formSel = $('fType');
  const filterOpts = '<option value="">Todos los tipos</option>' +
    EVENT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  const formOpts = EVENT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  filterSel.innerHTML = filterOpts;
  formSel.innerHTML = formOpts;
}

function renderCalendar() {
  const monthStart = new Date(state.currentYear, state.currentMonth, 1);
  const monthEnd = new Date(state.currentYear, state.currentMonth + 1, 0);

  // Ajuste para que la semana empiece en Lunes
  let startWeekday = monthStart.getDay(); // 0=Dom
  startWeekday = (startWeekday + 6) % 7; // ahora 0=Lun

  $('monthLabel').textContent = `${MONTHS[state.currentMonth]} ${state.currentYear}`;

  const grid = $('calendarGrid');
  grid.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Días del mes anterior para rellenar
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - i - 1);
    grid.appendChild(createDayCell(d, true, today));
  }

  // Días del mes actual
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const d = new Date(state.currentYear, state.currentMonth, day);
    grid.appendChild(createDayCell(d, false, today));
  }

  // Relleno del mes siguiente para completar la cuadrícula
  const totalCells = grid.children.length;
  const remainder = totalCells % 7;
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

  if (date.getTime() === today.getTime()) {
    cell.classList.add('today');
  }

  const num = document.createElement('span');
  num.className = 'day-number';
  num.textContent = date.getDate();
  cell.appendChild(num);

  // Eventos de ese día, filtrados
  const dayEvents = state.events
    .filter(e => e.date === iso)
    .filter(e => !state.filterType || e.type === state.filterType)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  const maxVisible = 3;
  dayEvents.slice(0, maxVisible).forEach(ev => {
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    const type = getTypeConfig(ev.type);
    chip.style.background = type.color;
    chip.title = `${ev.time ? ev.time + ' · ' : ''}${ev.title}`;
    chip.textContent = (ev.time ? ev.time + ' ' : '') + ev.title;
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
      // Abre el primer evento extra; podríamos hacer una vista de día aquí
      openDetail(dayEvents[maxVisible]);
    });
    cell.appendChild(more);
  }

  // Click en celda vacía → nuevo evento en ese día
  cell.addEventListener('click', () => openForm(null, iso));

  return cell;
}

function renderUpcoming() {
  const list = $('upcomingList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = state.events
    .filter(e => parseDate(e.date) >= today)
    .filter(e => !state.filterType || e.type === state.filterType)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 6);

  if (upcoming.length === 0) {
    list.innerHTML = '<li style="color:var(--text-dim);padding:1rem;text-align:center;">No hay eventos próximos. Haz clic en un día para crear uno.</li>';
    return;
  }

  list.innerHTML = '';
  upcoming.forEach(ev => {
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

// ---- Modal ----
let currentEvent = null;

function openModal() {
  $('modal').hidden = false;
}

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
  $('detailDate').textContent = `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  $('detailTime').textContent = event.time
    ? event.time + (event.endTime ? ' — ' + event.endTime : '')
    : '—';
  $('detailLocation').textContent = event.location || '—';
  $('detailAssignee').textContent = event.assignee || '—';
  $('detailDescription').textContent = event.description || '—';

  const updated = event.updatedAt ? new Date(event.updatedAt).toLocaleString('es-ES') : '';
  $('detailMeta').textContent = `Última actualización: ${updated}${event.updatedBy ? ' por ' + event.updatedBy : ''}`;

  openModal();
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

  if (!payload.title) {
    $('formError').textContent = 'El título es obligatorio';
    $('formError').hidden = false;
    return;
  }
  if (!payload.date) {
    $('formError').textContent = 'La fecha es obligatoria';
    $('formError').hidden = false;
    return;
  }

  try {
    let saved;
    if (id) {
      saved = await api(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const idx = state.events.findIndex(ev => ev.id === id);
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
    $('formError').textContent = err.message;
    $('formError').hidden = false;
  }
}

async function deleteEvent() {
  if (!currentEvent) return;
  if (!confirm(`¿Eliminar "${currentEvent.title}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`/api/events/${currentEvent.id}`, { method: 'DELETE' });
    state.events = state.events.filter(e => e.id !== currentEvent.id);
    showToast('Evento eliminado');
    closeModal();
    renderAll();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

// ---- Navegación ----
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

// ---- Autorefresco ----
let lastEventsHash = '';
async function checkUpdates() {
  try {
    const events = await api('/api/events');
    const hash = JSON.stringify(events.map(e => e.id + e.updatedAt));
    if (hash !== lastEventsHash) {
      lastEventsHash = hash;
      state.events = events;
      renderAll();
    }
  } catch (err) {
    // Silencioso, no molestar si hay un fallo puntual
  }
}

// ---- Inicialización ----
function init() {
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

  // Modal
  $('closeModal').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('modal').hidden) closeModal();
  });

  $('editBtn').addEventListener('click', () => {
    if (currentEvent) openForm(currentEvent);
  });
  $('deleteBtn').addEventListener('click', deleteEvent);
  $('cancelEdit').addEventListener('click', () => {
    if (currentEvent) openDetail(currentEvent);
    else closeModal();
  });
  $('formView').addEventListener('submit', saveEvent);

  loadEvents();
  // Auto-refresco cada 15s para ver cambios del resto del equipo
  setInterval(checkUpdates, 15000);
}

init();
