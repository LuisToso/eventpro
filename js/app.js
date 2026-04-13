/* =========================================================
   app.js
   Orquesta la app: navegación de vistas, modales, formularios
   y conexión entre Calendar / Events / Team / Storage.
   ========================================================= */

(function () {
  // -------- Estado global --------
  let data = Storage.load();
  const today = new Date();
  const state = { year: today.getFullYear(), month: today.getMonth() };

  // -------- Helpers DOM --------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  function openModal(id) { $('#' + id).hidden = false; }
  function closeModal(id) { $('#' + id).hidden = true; }

  // -------- Navegación de vistas --------
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.view').forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;
      $('#view-' + view).classList.add('active');
      if (view === 'team') renderTeam();
      if (view === 'data') renderDataPreview();
    });
  });

  // -------- Cerrar modales --------
  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  // Cerrar al click fuera del contenido
  $$('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.hidden = true;
    });
  });

  // ============================================================
  // CALENDARIO
  // ============================================================
  function renderCalendar() {
    $('#current-month').textContent = Calendar.formatMonth(state.year, state.month);
    Calendar.render(state, data, $('#calendar-grid'), openDayModal);
  }

  $('#prev-month').addEventListener('click', () => { Calendar.prevMonth(state); renderCalendar(); });
  $('#next-month').addEventListener('click', () => { Calendar.nextMonth(state); renderCalendar(); });
  $('#today-btn').addEventListener('click', () => {
    const now = new Date();
    state.year = now.getFullYear(); state.month = now.getMonth();
    renderCalendar();
  });
  $('#new-event-btn').addEventListener('click', () => openEventForm(null, Calendar.toISO(new Date())));

  // ============================================================
  // MODAL DÍA: lista de eventos de un día
  // ============================================================
  let selectedDate = null;

  function openDayModal(isoDate) {
    selectedDate = isoDate;
    const [y, m, d] = isoDate.split('-');
    const dateObj = new Date(+y, +m - 1, +d);
    $('#day-modal-title').textContent = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const list = $('#day-events-list');
    list.innerHTML = '';
    const events = Events.forDate(data, isoDate);

    if (events.length === 0) {
      list.innerHTML = '<p class="empty-state">No hay eventos este día. Puedes agregar uno abajo.</p>';
    } else {
      events.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'day-event-item';
        item.style.borderLeftColor = ev.color || '#3b82f6';
        item.innerHTML = `
          <div class="time"></div>
          <div class="title"></div>
          <div class="place"></div>
        `;
        item.querySelector('.time').textContent = ev.time || '';
        item.querySelector('.title').textContent = ev.name;
        item.querySelector('.place').textContent = ev.place || '';
        item.addEventListener('click', () => {
          closeModal('day-modal');
          openEventDetail(ev.id);
        });
        list.appendChild(item);
      });
    }

    openModal('day-modal');
  }

  $('#day-add-event-btn').addEventListener('click', () => {
    closeModal('day-modal');
    openEventForm(null, selectedDate);
  });

  // ============================================================
  // MODAL DETALLE DE EVENTO
  // ============================================================
  let currentEventId = null;

  function openEventDetail(id) {
    const ev = Events.byId(data, id);
    if (!ev) return;
    currentEventId = id;

    $('#event-modal-title').textContent = ev.name;
    const detail = $('#event-detail');
    detail.innerHTML = '';

    // Fecha formateada
    const [y, m, d] = ev.date.split('-');
    const dateObj = new Date(+y, +m - 1, +d);
    const fecha = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const rows = [
      ['Fecha', fecha],
      ['Hora', ev.time + (ev.durationMin ? ` (${ev.durationMin} min)` : '')],
      ['Lugar', ev.place || '—'],
      ['Notas', ev.notes || '—']
    ];

    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.innerHTML = '<div class="detail-label"></div><div class="detail-value"></div>';
      row.querySelector('.detail-label').textContent = label;
      row.querySelector('.detail-value').textContent = value;
      detail.appendChild(row);
    });

    // Sección asistentes por rol
    const grouped = Events.groupAttendeesByRole(data, ev);
    const roles = Object.keys(grouped).sort();
    if (roles.length > 0) {
      roles.forEach(role => {
        const section = document.createElement('div');
        section.className = 'detail-row role-section';
        section.innerHTML = `
          <div class="detail-label"></div>
          <div class="detail-value">
            <div class="role-members"></div>
          </div>
        `;
        section.querySelector('.detail-label').textContent = role;
        const members = section.querySelector('.role-members');
        grouped[role].forEach(m => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = m.name;
          if (m.contact) chip.title = m.contact;
          members.appendChild(chip);
        });
        detail.appendChild(section);
      });
    } else {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.innerHTML = '<div class="detail-label">Asistentes</div><div class="detail-value">—</div>';
      detail.appendChild(row);
    }

    openModal('event-modal');
  }

  $('#edit-event-btn').addEventListener('click', () => {
    closeModal('event-modal');
    openEventForm(currentEventId, null);
  });

  $('#delete-event-btn').addEventListener('click', () => {
    if (!currentEventId) return;
    if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    Events.remove(data, currentEventId);
    currentEventId = null;
    closeModal('event-modal');
    renderCalendar();
  });

  // ============================================================
  // FORMULARIO DE EVENTO (crear / editar)
  // ============================================================
  function openEventForm(editId, defaultDate) {
    $('#event-form').reset();
    $('#event-id').value = '';
    $('#event-color').value = '#3b82f6';
    updateColorPicker('#3b82f6');
    renderAttendeesPicker([]);

    if (editId) {
      const ev = Events.byId(data, editId);
      if (!ev) return;
      $('#form-modal-title').textContent = 'Editar evento';
      $('#event-id').value = ev.id;
      $('#event-name').value = ev.name;
      $('#event-date').value = ev.date;
      $('#event-time').value = ev.time;
      $('#event-duration').value = ev.durationMin || 60;
      $('#event-place').value = ev.place || '';
      $('#event-notes').value = ev.notes || '';
      $('#event-color').value = ev.color || '#3b82f6';
      updateColorPicker(ev.color || '#3b82f6');
      renderAttendeesPicker(ev.attendeeIds || []);
    } else {
      $('#form-modal-title').textContent = 'Nuevo evento';
      $('#event-date').value = defaultDate || Calendar.toISO(new Date());
      $('#event-time').value = '20:00';
    }
    openModal('form-modal');
  }

  function updateColorPicker(selected) {
    $$('#event-color-picker button').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === selected);
    });
  }

  $$('#event-color-picker button').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#event-color').value = btn.dataset.color;
      updateColorPicker(btn.dataset.color);
    });
  });

  function renderAttendeesPicker(selectedIds) {
    const container = $('#attendees-picker');
    container.innerHTML = '';
    const byRole = Team.byRole(data);
    const roles = Object.keys(byRole).sort();

    if (roles.length === 0) {
      container.innerHTML = '<p class="help">Todavía no hay nadie en el equipo. Agrega personas en la pestaña <strong>Equipo</strong> para poder asignarlas.</p>';
      return;
    }

    roles.forEach(role => {
      const group = document.createElement('div');
      group.className = 'attendees-group';
      group.innerHTML = `<h4></h4>`;
      group.querySelector('h4').textContent = role;
      byRole[role].forEach(m => {
        const label = document.createElement('label');
        const checked = selectedIds.includes(m.id) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" value="${m.id}" ${checked}><span></span>`;
        label.querySelector('span').textContent = m.name;
        group.appendChild(label);
      });
      container.appendChild(group);
    });
  }

  $('#event-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('#event-id').value || null;
    const attendeeIds = Array.from($$('#attendees-picker input:checked')).map(i => i.value);

    const event = {
      id: id,
      name: $('#event-name').value.trim(),
      date: $('#event-date').value,
      time: $('#event-time').value,
      durationMin: parseInt($('#event-duration').value, 10) || 0,
      place: $('#event-place').value.trim(),
      color: $('#event-color').value,
      notes: $('#event-notes').value.trim(),
      attendeeIds: attendeeIds
    };

    Events.save(data, event);
    closeModal('form-modal');

    // Saltamos al mes del evento para que el usuario lo vea
    const [y, m] = event.date.split('-').map(Number);
    state.year = y; state.month = m - 1;
    renderCalendar();
  });

  // ============================================================
  // EQUIPO
  // ============================================================
  function renderTeam() {
    Team.renderList(data, $('#team-list'), m => {
      if (confirm(`¿Eliminar a ${m.name} del equipo? También se quitará de los eventos donde participa.`)) {
        Team.remove(data, m.id);
        renderTeam();
        renderCalendar();
      }
    });
  }

  $('#team-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#member-name').value.trim();
    const role = $('#member-role').value;
    const contact = $('#member-contact').value.trim();
    if (!name || !role) return;
    Team.add(data, { name, role, contact });
    e.target.reset();
    renderTeam();
  });

  // ============================================================
  // DATOS (export / import / reset)
  // ============================================================
  function renderDataPreview() {
    $('#data-preview').textContent = JSON.stringify(data, null, 2);
  }

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventpro-${Calendar.toISO(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $('#import-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed || !Array.isArray(parsed.team) || !Array.isArray(parsed.events)) {
          alert('El archivo no tiene el formato esperado (debe contener "team" y "events").');
          return;
        }
        if (!confirm('Esto reemplazará tus datos actuales. ¿Continuar?')) return;
        data = parsed;
        Storage.save(data);
        renderCalendar();
        renderTeam();
        renderDataPreview();
        alert('Datos importados correctamente.');
      } catch (err) {
        alert('No se pudo leer el JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Esto borrará TODO el equipo y los eventos. ¿Seguro?')) return;
    Storage.reset();
    data = Storage.load();
    renderCalendar();
    renderTeam();
    renderDataPreview();
  });

  // ============================================================
  // INICIO
  // ============================================================
  renderCalendar();
})();
