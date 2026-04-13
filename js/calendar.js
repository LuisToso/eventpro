/* =========================================================
   calendar.js
   Dibuja la grilla mensual y maneja la navegación de meses.
   ========================================================= */

const Calendar = (() => {
  const MONTH_NAMES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Construye ISO "YYYY-MM-DD" a partir de una fecha (local, sin zona horaria UTC)
  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Devuelve el primer lunes visible de la grilla (puede ser del mes anterior)
  function getGridStart(year, month) {
    const first = new Date(year, month, 1);
    // getDay(): domingo=0 ... sábado=6 -> convertimos a lunes=0
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    return start;
  }

  function formatMonth(year, month) {
    return `${MONTH_NAMES[month]} ${year}`;
  }

  function render(state, data, grid, onDayClick) {
    grid.innerHTML = '';
    const { year, month } = state;
    const today = toISO(new Date());

    const start = getGridStart(year, month);
    // 6 filas x 7 columnas = 42 celdas (cubre cualquier mes)
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + i);
      const iso = toISO(cellDate);

      const cell = document.createElement('div');
      cell.className = 'day-cell';
      if (cellDate.getMonth() !== month) cell.classList.add('other-month');
      const dow = cellDate.getDay();
      if (dow === 0 || dow === 6) cell.classList.add('weekend');
      if (iso === today) cell.classList.add('today');

      const num = document.createElement('div');
      num.className = 'day-number';
      num.textContent = cellDate.getDate();
      cell.appendChild(num);

      const eventsBox = document.createElement('div');
      eventsBox.className = 'day-events';
      const dayEvents = Events.forDate(data, iso);
      const MAX_VISIBLE = 3;
      dayEvents.slice(0, MAX_VISIBLE).forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'day-event-chip';
        chip.style.background = ev.color || '#3b82f6';
        chip.textContent = `${ev.time || ''} ${ev.name}`.trim();
        chip.title = ev.name;
        eventsBox.appendChild(chip);
      });
      if (dayEvents.length > MAX_VISIBLE) {
        const more = document.createElement('div');
        more.className = 'more-events';
        more.textContent = `+${dayEvents.length - MAX_VISIBLE} más`;
        eventsBox.appendChild(more);
      }
      cell.appendChild(eventsBox);

      cell.addEventListener('click', () => onDayClick(iso));
      grid.appendChild(cell);
    }
  }

  function prevMonth(state) {
    if (state.month === 0) { state.month = 11; state.year--; }
    else state.month--;
  }

  function nextMonth(state) {
    if (state.month === 11) { state.month = 0; state.year++; }
    else state.month++;
  }

  return { render, prevMonth, nextMonth, formatMonth, toISO };
})();
