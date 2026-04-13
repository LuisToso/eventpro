const form = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('loginError');

// Si ya está autenticado, redirigir al calendario
fetch('/api/me')
  .then((r) => r.json())
  .then((d) => {
    if (d.authed) window.location.href = '/';
  })
  .catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Error' }));
      errorBox.textContent = data.error || 'Error iniciando sesión';
      errorBox.hidden = false;
      passwordInput.select();
      return;
    }
    window.location.href = '/';
  } catch (err) {
    errorBox.textContent = 'Error de conexión';
    errorBox.hidden = false;
  }
});
