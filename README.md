# EventPro 🎭

Calendario interactivo compartido para equipos de producción de eventos. Accesible desde cualquier dispositivo (ordenador, tablet, móvil) y editable por todo el equipo.

## ✨ Características

- 📅 **Vista mensual** con navegación entre meses y botón "Hoy".
- 🎨 **Colores por tipo de actividad**: concierto, obra de teatro, presentación, evento empresa, técnica, transporte de generador, montaje, ensayo, otro.
- 🔍 **Filtro por tipo** de evento.
- ➕ **Crear / editar / eliminar** eventos desde cualquier dispositivo.
- 📋 **Cuadro de detalle** al hacer clic en un evento con lugar, hora, tipo, responsable y descripción.
- 👥 **Multi-usuario**: cada miembro escribe su nombre y queda registrado en los cambios.
- 🔄 **Auto-refresco** cada 15 segundos para ver cambios del resto del equipo.
- 📱 **Responsive**: funciona en móvil, tablet y escritorio.
- 💾 **Datos persistidos** en `data/events.json` (fácil backup).

## 🚀 Uso rápido (local)

Requisitos: **Node.js 18+**.

```bash
npm install
npm start
```

Abre `http://localhost:3000` en el navegador. El puerto se puede cambiar con la variable `PORT`.

## 🌐 Acceso desde otros dispositivos de la misma red

Una vez arrancado el servidor, averigua la IP local del equipo (ej. `192.168.1.42`) y el resto del equipo podrá acceder desde el navegador a:

```
http://192.168.1.42:3000
```

## ☁️ Despliegue en internet

Para que el equipo acceda desde cualquier sitio puedes desplegar este proyecto en:

- **Render / Railway / Fly.io**: despliegue gratuito de Node.js. Comando de arranque: `node server.js`.
- **VPS propio** (DigitalOcean, Hetzner…): `npm install && npm start` detrás de Nginx.
- **Docker** (opcional): el proyecto es un Node.js estándar, cualquier imagen `node:20-alpine` lo ejecuta.

Todos los datos se guardan en `data/events.json`. Para persistencia en plataformas tipo Render conviene montar un volumen en `/data` o migrar a una base de datos (SQLite/Postgres).

## 🗂️ Estructura del proyecto

```
eventpro/
├── server.js            # Servidor Express + API REST
├── package.json
├── data/
│   └── events.json      # Almacenamiento de eventos (se crea al arrancar)
└── public/
    ├── index.html       # Interfaz del calendario
    ├── styles.css       # Estilos (dark theme, responsive)
    └── app.js           # Lógica del calendario y modal
```

## 🔌 API

| Método | Endpoint            | Descripción                |
|--------|---------------------|----------------------------|
| GET    | `/api/events`       | Lista todos los eventos    |
| GET    | `/api/events/:id`   | Recupera un evento         |
| POST   | `/api/events`       | Crea un evento             |
| PUT    | `/api/events/:id`   | Actualiza un evento        |
| DELETE | `/api/events/:id`   | Elimina un evento          |

Formato de evento:

```json
{
  "id": "string",
  "title": "Concierto Sala Apolo",
  "date": "2026-04-20",
  "time": "21:00",
  "endTime": "23:30",
  "location": "Sala Apolo, Barcelona",
  "type": "concierto",
  "description": "Rider técnico adjunto...",
  "assignee": "María",
  "updatedBy": "Juan"
}
```

## 🎯 Tipos de actividad predefinidos

- `concierto` · Concierto
- `teatro` · Obra de teatro
- `presentacion` · Presentación
- `empresa` · Evento empresa
- `tecnica` · Técnica / Prueba
- `transporte` · Transporte generador
- `montaje` · Montaje / Desmontaje
- `ensayo` · Ensayo
- `otro` · Otro

Para añadir tipos, edita la constante `EVENT_TYPES` en `public/app.js` y las variables CSS `--type-*` en `public/styles.css`.

## 🔐 Notas de seguridad

Este proyecto está pensado como herramienta interna del equipo. No incluye autenticación; si lo expones públicamente conviene:

1. Poner un proxy con autenticación básica (Nginx, Caddy) delante, o
2. Añadir login (JWT / sesiones).

## 📄 Licencia

MIT
