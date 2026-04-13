# EventPro 🎭

Calendario interactivo compartido para equipos de producción de eventos. Accesible desde cualquier dispositivo (ordenador, tablet, móvil) y editable por todo el equipo, con login, adjuntos y notificaciones por email + WhatsApp.

---

## ✨ Características

- 📅 **Vista mensual** con navegación y botón "Hoy".
- 🎨 **Tipos de actividad codificados por color**: concierto, obra de teatro, presentación, evento empresa, técnica, transporte de generador, montaje, ensayo, otro.
- 🔍 **Filtro por tipo** de evento.
- ➕ **Crear / editar / eliminar** eventos desde cualquier dispositivo.
- 📋 **Cuadro de detalle** con lugar, hora, tipo, responsable, descripción y adjuntos.
- 📎 **Adjuntar ficheros** a cada evento (PDFs, imágenes, riders técnicos…).
- 🔐 **Login con contraseña compartida** del equipo.
- 👥 **Multi-usuario**: cada miembro escribe su nombre y queda registrado en los cambios.
- 📧 **Notificaciones por email** (SMTP) al crear / editar / eliminar eventos.
- 💬 **Notificaciones por WhatsApp** vía Twilio.
- 🔄 **Auto-refresco cada 15 s** para ver cambios del resto del equipo.
- 📱 **Responsive**: funciona en móvil, tablet y escritorio.

---

## 🚀 Uso rápido (local)

Requisitos: **Node.js 18+**.

```bash
npm install
APP_PASSWORD=mi-password-de-equipo npm start
```

Abre `http://localhost:3000` → te pedirá la contraseña.

> Para tener todas las opciones de configuración consulta `.env.example`.

### Arrancar con archivo `.env`

```bash
cp .env.example .env
# edita .env con tus valores
# luego:
node --env-file=.env server.js
```

---

## ☁️ Despliegue en Render (paso a paso)

Render es la forma más sencilla de tener la app online para todo el equipo.

### 1. Prepara el repositorio
Asegúrate de que el código está en GitHub (ya lo está: `LuisToso/eventpro`).

### 2. Crea cuenta en Render
Ve a [render.com](https://render.com) y regístrate con tu cuenta de GitHub.

### 3. Crea el servicio web

**Opción A · Con Blueprint (automático, recomendado):**
1. En Render: `New +` → `Blueprint`.
2. Conecta tu repo `LuisToso/eventpro`.
3. Render detectará el fichero `render.yaml` y te pedirá los valores de los secretos (ver paso 4).
4. `Apply` → Render construye y despliega.

**Opción B · Manual:**
1. `New +` → `Web Service`.
2. Conecta tu repo `LuisToso/eventpro`.
3. Configura:
   - **Name**: `eventpro`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (o superior).

### 4. Configura las variables de entorno

En Render → tu servicio → `Environment` → añade estas variables:

| Variable           | Valor                                                | Obligatoria |
|--------------------|------------------------------------------------------|-------------|
| `APP_PASSWORD`     | Contraseña del equipo (pon una segura)               | ✅          |
| `SESSION_SECRET`   | Pulsa "Generate" para que Render cree una aleatoria  | ✅          |
| `BASE_URL`         | `https://eventpro.onrender.com` (o tu dominio)       | ✅          |
| `NODE_ENV`         | `production`                                         | ✅          |
| `SMTP_HOST`        | `smtp.gmail.com` (ejemplo)                           | Solo email  |
| `SMTP_PORT`        | `587`                                                | Solo email  |
| `SMTP_USER`        | Tu cuenta de email                                   | Solo email  |
| `SMTP_PASS`        | Contraseña de aplicación (no la normal, ver abajo)   | Solo email  |
| `SMTP_FROM`        | `EventPro <tu-cuenta@gmail.com>`                     | Solo email  |
| `TWILIO_ACCOUNT_SID` | SID de Twilio                                      | Solo WA     |
| `TWILIO_AUTH_TOKEN`  | Auth Token de Twilio                               | Solo WA     |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (sandbox) o tu número   | Solo WA     |

### 5. Guarda los datos de forma permanente (importante)

El plan **Free** de Render tiene filesystem **efímero**: los eventos y adjuntos se **pierden** en cada redeploy.

**Soluciones:**
- **Plan Starter ($7/mes)** + **disco persistente** montado en `/opt/render/project/src/data` (ya configurado en `render.yaml`).
- O migrar a una base de datos (SQLite + disco, o Postgres) — contacta con el desarrollador si lo necesitas.

Para uso con equipos pequeños y pocas modificaciones, el plan Free suele bastar, pero **tus datos pueden perderse** si Render reinicia el servicio.

### 6. Listo

Accede a tu URL (`https://eventpro.onrender.com`), introduce la contraseña, y comparte el enlace con tu equipo. Cada uno entra desde su móvil/ordenador.

---

## 🔐 Login

- Todos los miembros del equipo comparten la **misma contraseña** (definida en `APP_PASSWORD`).
- Cada persona escribe su nombre en la cabecera → queda registrado en los eventos que edita.
- La sesión dura 30 días (cookie segura).
- Para cambiar la contraseña: modifica `APP_PASSWORD` en Render y haz un redeploy.

---

## 📧 Configurar notificaciones por EMAIL

1. **Gmail**: entra a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) y genera una "contraseña de aplicación" específica para EventPro (necesitas 2FA activado).
2. Configura en Render:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-cuenta@gmail.com
   SMTP_PASS=la-app-password-generada
   SMTP_FROM=EventPro <tu-cuenta@gmail.com>
   ```
3. En la app, pulsa **👥 Destinatarios** y añade a las personas con su email. Marca "Recibir por email".
4. Listo. Cada creación / edición / eliminación de evento disparará un email.

> ⚠️ Gmail tiene un límite de ~500 emails/día. Para equipos grandes usa [SendGrid](https://sendgrid.com), [Mailgun](https://www.mailgun.com), etc. (cambias `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`).

---

## 💬 Configurar notificaciones por WHATSAPP (Twilio)

Twilio es el proveedor estándar. Tiene una cuenta de prueba gratuita con sandbox (tu equipo tiene que enviar un mensaje al bot una vez para autorizarse).

### 1. Crea cuenta en Twilio
Ve a [twilio.com/try-twilio](https://www.twilio.com/try-twilio) y regístrate.

### 2. Activa el sandbox de WhatsApp
- En la consola de Twilio → `Messaging` → `Try it out` → `Send a WhatsApp message`.
- Te dará un número (p.ej. `+1 415 523 8886`) y un código de invitación (p.ej. `join something-word`).
- Cada miembro del equipo debe enviar ese código por WhatsApp a ese número **desde su móvil**. Sólo entonces Twilio le podrá enviar mensajes.

### 3. Copia las credenciales
En `Account Info` (panel de inicio) copia:
- `Account SID` → variable `TWILIO_ACCOUNT_SID`
- `Auth Token` → variable `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886`

### 4. Añade destinatarios
En la app → **👥 Destinatarios** → añade al equipo con su teléfono en formato internacional (`+34 600 000 000`, sin espacios). Marca "Recibir por WhatsApp".

### 5. Prueba
Crea o edita un evento → el equipo recibirá un mensaje de WhatsApp.

> Para producción real (sin sandbox, con tu propio número), tendrás que hacer el proceso de aprobación de WhatsApp Business con Twilio. El sandbox funciona perfecto para uso interno.

---

## 🗂️ Estructura del proyecto

```
eventpro/
├── server.js              # Servidor Express + API + notificaciones
├── package.json
├── render.yaml            # Configuración de despliegue en Render
├── .env.example           # Variables de entorno de referencia
├── data/                  # (creado en runtime, ignorado por git)
│   ├── events.json        # Eventos
│   ├── recipients.json    # Destinatarios de notificaciones
│   └── uploads/           # Ficheros adjuntos por evento
└── public/
    ├── index.html         # Calendario
    ├── login.html         # Página de login
    ├── styles.css
    ├── app.js             # Lógica de calendario
    └── login.js           # Lógica de login
```

---

## 🔌 API

Todos los endpoints (excepto `/api/login`, `/api/logout`, `/api/me`) requieren sesión autenticada (cookie).

| Método | Endpoint                                      | Descripción                 |
|--------|-----------------------------------------------|-----------------------------|
| POST   | `/api/login`                                  | Inicia sesión               |
| POST   | `/api/logout`                                 | Cierra sesión               |
| GET    | `/api/me`                                     | Estado de autenticación     |
| GET    | `/api/integrations-status`                    | Estado de email/WhatsApp    |
| GET    | `/api/events`                                 | Lista todos los eventos     |
| GET    | `/api/events/:id`                             | Recupera un evento          |
| POST   | `/api/events`                                 | Crea un evento              |
| PUT    | `/api/events/:id`                             | Actualiza un evento         |
| DELETE | `/api/events/:id`                             | Elimina un evento           |
| POST   | `/api/events/:id/attachments`                 | Sube un adjunto (multipart) |
| DELETE | `/api/events/:id/attachments/:filename`       | Elimina un adjunto          |
| GET    | `/uploads/:id/:filename`                      | Descarga un adjunto         |
| GET    | `/api/recipients`                             | Lista de destinatarios      |
| POST   | `/api/recipients`                             | Añade un destinatario       |
| PUT    | `/api/recipients/:id`                         | Edita un destinatario       |
| DELETE | `/api/recipients/:id`                         | Elimina un destinatario     |

---

## 🎯 Tipos de actividad predefinidos

`concierto`, `teatro`, `presentacion`, `empresa`, `tecnica`, `transporte`, `montaje`, `ensayo`, `otro`.

Para añadir tipos, edita `EVENT_TYPES` en `public/app.js` y las variables `--type-*` en `public/styles.css`.

---

## 🔐 Seguridad

- La app usa **una sola contraseña compartida**. Suficiente para un equipo interno; para producción pública añadir autenticación por usuario.
- Las cookies de sesión son `httpOnly` y `secure` en producción.
- **No** subas `.env` al repo (ya está en `.gitignore`).
- Si pones la app pública en internet, **cambia la contraseña** del `.env.example` inmediatamente.

---

## 📄 Licencia

MIT
