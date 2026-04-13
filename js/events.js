/* =========================================================
   events.js
   Gestión de eventos: crear, editar, eliminar, filtrar por día.
   ========================================================= */

const Events = (() => {

  function all(data) {
    return data.events.slice().sort((a, b) => {
      if (a.date === b.date) return (a.time || '').localeCompare(b.time || '');
      return a.date.localeCompare(b.date);
    });
  }

  function byId(data, id) {
    return data.events.find(e => e.id === id);
  }

  // Eventos de un día concreto ("YYYY-MM-DD")
  function forDate(data, isoDate) {
    return all(data).filter(e => e.date === isoDate);
  }

  function save(data, event) {
    if (event.id) {
      // Editar existente
      const idx = data.events.findIndex(e => e.id === event.id);
      if (idx >= 0) data.events[idx] = event;
    } else {
      // Crear nuevo
      event.id = Storage.newId();
      data.events.push(event);
    }
    Storage.save(data);
    return event;
  }

  function remove(data, id) {
    data.events = data.events.filter(e => e.id !== id);
    Storage.save(data);
  }

  // Agrupa los asistentes de un evento por rol: { "Técnica": [member, ...], ... }
  function groupAttendeesByRole(data, event) {
    const grouped = {};
    const ids = event.attendeeIds || [];
    for (const id of ids) {
      const m = Team.byId(data, id);
      if (!m) continue;
      if (!grouped[m.role]) grouped[m.role] = [];
      grouped[m.role].push(m);
    }
    return grouped;
  }

  return { all, byId, forDate, save, remove, groupAttendeesByRole };
})();
