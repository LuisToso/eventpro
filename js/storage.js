/* =========================================================
   storage.js
   Persistencia en localStorage. Todo se guarda bajo la clave
   "eventpro.data" como un único objeto JSON { team, events }.
   ========================================================= */

const Storage = (() => {
  const KEY = 'eventpro.data';

  // Estructura por defecto
  const DEFAULT_DATA = {
    team: [],   // [{ id, name, role, contact }]
    events: []  // [{ id, name, date, time, durationMin, place, color, notes, attendeeIds: [] }]
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_DATA);
      const parsed = JSON.parse(raw);
      // Aseguramos que existan ambos arrays (por compatibilidad)
      return {
        team: Array.isArray(parsed.team) ? parsed.team : [],
        events: Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (e) {
      console.error('Error leyendo storage:', e);
      return structuredClone(DEFAULT_DATA);
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  // Genera IDs simples y únicos
  function newId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  return { load, save, reset, newId };
})();
