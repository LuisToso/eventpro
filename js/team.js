/* =========================================================
   team.js
   Gestión del equipo (agregar, eliminar, listar, buscar).
   ========================================================= */

const Team = (() => {

  function all(data) {
    return data.team.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  function byRole(data) {
    const map = {};
    for (const m of all(data)) {
      if (!map[m.role]) map[m.role] = [];
      map[m.role].push(m);
    }
    return map;
  }

  function byId(data, id) {
    return data.team.find(m => m.id === id);
  }

  function add(data, { name, role, contact }) {
    const member = {
      id: Storage.newId(),
      name: name.trim(),
      role: role.trim(),
      contact: (contact || '').trim()
    };
    data.team.push(member);
    Storage.save(data);
    return member;
  }

  function remove(data, id) {
    data.team = data.team.filter(m => m.id !== id);
    // Quitamos a la persona de los eventos
    data.events.forEach(ev => {
      ev.attendeeIds = (ev.attendeeIds || []).filter(x => x !== id);
    });
    Storage.save(data);
  }

  function renderList(data, container, onDelete) {
    container.innerHTML = '';
    const members = all(data);

    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">Todavía no hay nadie en el equipo. Agrega a la primera persona arriba.</p>';
      return;
    }

    for (const m of members) {
      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML = `
        <div class="info">
          <div class="name"></div>
          <span class="role"></span>
          <div class="contact"></div>
        </div>
        <button title="Eliminar" aria-label="Eliminar">&times;</button>
      `;
      card.querySelector('.name').textContent = m.name;
      card.querySelector('.role').textContent = m.role;
      card.querySelector('.contact').textContent = m.contact || '';
      card.querySelector('button').addEventListener('click', () => onDelete(m));
      container.appendChild(card);
    }
  }

  return { all, byRole, byId, add, remove, renderList };
})();
