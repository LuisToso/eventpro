# EventPro

Calendario interactivo para gestionar la agenda del equipo. Al pinchar un día se despliegan los eventos, y al pinchar un evento se ve el detalle completo: nombre, lugar, hora y asistentes agrupados por rol (Técnica, Producción, Artistas, Logística, Otro).

## Tecnología

Aplicación web **100% estática**: solo HTML, CSS y JavaScript. No necesita servidor, base de datos ni instalación. Los datos se guardan en el navegador (`localStorage`) y puedes exportar/importar un JSON para compartir o respaldar.

## Cómo usarla

### Localmente
Abre `index.html` en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).

### Publicarla en internet (GitHub Pages — gratis)
1. Haz push de esta rama al repositorio.
2. En GitHub, ve a **Settings → Pages**.
3. En **Source**, selecciona la rama `main` (o la que quieras publicar) y carpeta `/ (root)`.
4. En unos segundos tu calendario estará disponible en una URL pública.

## Estructura del proyecto

```
eventpro/
├── index.html          Estructura y modales
├── css/
│   └── styles.css      Todos los estilos
├── js/
│   ├── storage.js      Guardar/leer datos de localStorage
│   ├── team.js         Gestión del equipo
│   ├── events.js       Gestión de eventos
│   ├── calendar.js     Dibujo de la grilla mensual
│   └── app.js          Orquestación de UI, modales, formularios
└── README.md
```

Cada archivo tiene una responsabilidad única y está comentado en español para que sea fácil de entender y modificar.

## Funcionalidades

- **Calendario mensual** con navegación entre meses y botón "Hoy"
- **Crear eventos** con: nombre, fecha, hora, duración, lugar, color, asistentes y notas
- **Ver detalle** de cada evento con asistentes **agrupados por rol**
- **Editar y eliminar** eventos
- **Gestión del equipo**: agregar/eliminar personas con su rol y contacto
- **Exportar/Importar** todo en JSON para respaldo o compartir
- **Responsive**: funciona en escritorio y celular
- **Etiquetas de color** para distinguir tipos de evento de un vistazo

## Cómo modificar

- **Agregar un rol nuevo** (ej. "Catering"): en `index.html`, en el `<select id="member-role">`, añade una opción. El sistema agrupa automáticamente por el valor del rol.
- **Cambiar los colores disponibles**: en `index.html`, dentro de `#event-color-picker`, añade o quita botones con el `data-color` que quieras.
- **Cambiar la paleta visual**: edita las variables CSS al inicio de `css/styles.css` (`--primary`, `--bg`, etc.).
- **Agregar un campo a los eventos** (ej. "Presupuesto"): añade el input en el formulario de `index.html`, incluye el campo al guardar en `js/app.js` (función `submit`) y muéstralo en `openEventDetail`.

## Compartir datos con el equipo

1. Una persona crea los eventos y el equipo.
2. En la pestaña **Datos** pulsa **Exportar JSON**.
3. Envía el archivo por correo/mensaje.
4. Los demás abren la app y pulsan **Importar JSON** para cargarlos.

Para una versión colaborativa en tiempo real se necesitaría un backend (Firebase, Supabase, etc.). Si más adelante lo necesitas, la arquitectura actual está preparada: solo hay que reemplazar `storage.js` por una capa que llame a la API.
