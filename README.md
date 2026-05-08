# Lomaz Home - Plataforma Inmobiliaria

> Plataforma inmobiliaria completa para asesores y agencias en Colombia.
> Desarrollada en 24 sesiones de trabajo con HTML + CSS + JavaScript + Supabase + Vercel.

**Live:** https://plataforma-inmobiliaria-two.vercel.app
**Repo:** https://github.com/Lomazhome/plataforma-inmobiliaria

---

## Que es Lomaz Home?

Lomaz Home es una plataforma inmobiliaria profesional para asesores en Colombia que permite:
- Publicar propiedades desde un solo lugar y distribuirlas automaticamente a Metrocuadrado, Finca Raiz y Proppit
- Gestionar clientes, leads y pipeline de ventas con un CRM integrado
- Usar el chatbot ARIA con inteligencia artificial para atender consultas 24/7
- Calcular rentabilidades, creditos hipotecarios y ROI de inversiones
- Comparar propiedades, gestionar favoritos y publicar articulos en el blog

---

## Funcionalidades Principales

### Publico (sin login)
- **Listado de propiedades** con filtros por tipo, ciudad, precio, habitaciones
- **Ficha de propiedad** con galeria, mapa, descripcion y formulario de contacto
- **Blog inmobiliario** con articulos, categorias y buscador
- **Calculadora financiera** de credito hipotecario, ROI y rentabilidad de arriendo
- **Chatbot ARIA** disponible en toda la plataforma
- **Comparador** de hasta 3 propiedades simultaneamente
- **Favoritos** guardados en localStorage (sin necesidad de registro)

### Panel de Asesor (requiere login)
- **Dashboard** con estadisticas en tiempo real: propiedades, leads, clientes, tareas
- **Agregar propiedad** con wizard de 5 pasos y subida de fotos a Supabase Storage
- **Mis propiedades** con estado, estadisticas y acciones rapidas
- **CRM de Clientes** completo con 21 campos, historial y seguimiento
- **Leads** con tabla, filtros y cambio de estado
- **Pipeline Kanban** drag-and-drop para visualizar el embudo de ventas
- **Portales** - publicacion automatica a Metrocuadrado, Finca Raiz y Proppit
- **Notificaciones** en tiempo real con filtros por tipo
- **Perfil de asesor** con foto, datos profesionales y redes sociales

### Panel de Administrador
- **Admin** - vista global de toda la plataforma
- Gestion de propiedades, asesores, leads, clientes y blog
- Estadisticas globales con graficas de barras
- Actividad reciente unificada

---

## Stack Tecnologico

| Capa | Tecnologia | Detalle |
|------|-----------|---------|
| Frontend | HTML5 + CSS3 + JS Vanilla | Sin frameworks, carga ultra rapida |
| Base de datos | Supabase (PostgreSQL) | Auth, DB, Storage, RLS |
| Hosting | Vercel | Deploy automatico desde GitHub |
| Chatbot | OpenAI gpt-4o-mini | Con fallback local inteligente |
| Mapas | Google Maps Embed API | En fichas de propiedades |
| Iconos | Emojis nativos | Sin dependencias externas |
| Estilos | CSS inline + variables | Sin Bootstrap ni Tailwind |

---

## Archivos del Proyecto

```
plataforma-inmobiliaria/
|-- index.html              # Homepage publica con hero, busqueda y propiedades
|-- propiedades.html         # Listado de propiedades con filtros avanzados
|-- propiedad.html           # Ficha individual de propiedad
|-- login.html               # Login y registro de asesores (Supabase Auth)
|-- dashboard.html           # Panel principal del asesor
|-- agregar-propiedad.html   # Wizard 5 pasos para publicar propiedad
|-- mis-propiedades.html     # Mis propiedades con acciones
|-- clientes.html            # CRM completo de clientes
|-- leads.html               # Gestion de leads entrantes
|-- pipeline.html            # Kanban de ventas drag-and-drop
|-- calculadora.html         # Calculadora financiera (ROI, credito, arriendo)
|-- comparador.html          # Comparador de hasta 3 propiedades
|-- favoritos.html           # Lista de favoritos (localStorage)
|-- blog.html                # Blog inmobiliario con articulos
|-- aria.html                # Chatbot ARIA con IA y embed
|-- portales.html            # Integracion con portales externos
|-- notificaciones.html      # Centro de notificaciones
|-- perfil-asesor.html       # Perfil y configuracion del asesor
|-- admin.html               # Panel de administracion global
|-- config.js                # Configuracion Supabase y constantes
|-- ux-widgets.js            # Utilidades UX globales reutilizables
|-- schema-fix.sql           # SQL para crear/corregir el schema en Supabase
|-- sitemap.xml              # Mapa del sitio para SEO
|-- robots.txt               # Directivas para motores de busqueda
|-- README.md                # Esta documentacion
```

---

## Configuracion Inicial (una sola vez)

### 1. Supabase - Ejecutar el schema

1. Abre Supabase Dashboard: https://supabase.com/dashboard/project/lniouebpuuuqctrgxoiw
2. Ve a **SQL Editor**
3. Copia y ejecuta el contenido de `schema-fix.sql` del repositorio
4. Esto crea todas las columnas necesarias en las tablas

### 2. Storage de fotos

En Supabase Dashboard > Storage, crea un bucket llamado `fotos-propiedades`:
- Publico: **Si**
- Tamano maximo por archivo: **5 MB**
- Tipos permitidos: `image/jpeg, image/png, image/webp`

### 3. Primer usuario administrador

1. Ve a `login.html` y registrate con tu email
2. En Supabase Dashboard > Authentication > Users, verifica que tu email aparece
3. Para el panel admin, agrega tu email al array `ADMIN_EMAILS` en `admin.html`

### 4. Configurar OpenAI para ARIA (opcional)

1. Obtiene una API key en https://platform.openai.com
2. En `aria.html`, haz clic en el icono de configuracion
3. Ingresa tu API key (se guarda en localStorage, nunca en el servidor)
4. ARIA automaticamente usara gpt-4o-mini para respuestas avanzadas
5. Sin API key, ARIA usa respuestas inteligentes locales

---

## Integracion con Portales

Lomaz Home se integra con tres portales principales de Colombia:

### Metrocuadrado
- URL: https://www.metrocuadrado.com/userspace/realestates
- En `portales.html` configura tu token de API
- Las propiedades publicadas se sincronizan automaticamente

### Finca Raiz
- URL: https://ov.fincaraiz.com.co/inmobiliarias/administrar-inmuebles
- Requiere credenciales de cuenta inmobiliaria
- Publicacion masiva con un solo clic

### Proppit
- URL: https://proppit.com/properties
- Proppit republica en 6 portales adicionales automaticamente
- Configura el API token en la seccion de portales

> **Nota:** La integracion real requiere APIs activas en cada portal.
> Los campos de las propiedades estan disenados para ser compatibles con los tres portales.

---

## Atajos de Teclado (ux-widgets.js)

Disponibles en todas las paginas del panel:

| Atajo | Accion |
|-------|--------|
| `Alt + H` | Ir al Dashboard |
| `Alt + P` | Ir a Propiedades |
| `Alt + N` | Ir a Notificaciones |
| `Alt + A` | Abrir chatbot ARIA |
| `Alt + C` | Abrir Calculadora |
| `Escape` | Cerrar modal abierto |

---

## API de ux-widgets.js

Incluye el archivo en cualquier pagina para activar todas las mejoras UX:

```html
<script src="ux-widgets.js"></script>
```

Funciones disponibles via `window.LH`:

```javascript
// Mostrar notificacion toast
LH.toast("Propiedad guardada", "success");
LH.toast("Error al guardar", "error");
LH.toast("Informacion", "info");
LH.toast("Advertencia", "warn");

// Dialogo de confirmacion personalizado
LH.confirm("Eliminar esta propiedad?", function() {
  // confirmo
}, function() {
  // cancelo
});

// Copiar al portapapeles
LH.copy("https://lomaz.home/propiedad?id=123", "Enlace");

// Formatear moneda colombiana
LH.money(250000000); // "$ 250.000.000"

// Formatear fecha
LH.date("2026-05-08"); // "08 may. 2026"

// Tiempo relativo
LH.relTime("2026-05-07"); // "hace 1 dia"

// Loader de pagina
LH.showLoader();
LH.hideLoader();
```

Widgets que se inyectan automaticamente en todas las paginas:
- Barra de progreso de scroll (naranja, parte superior)
- Boton flotante de ARIA (esquina inferior derecha)
- Boton volver arriba (aparece al bajar 320px)
- Badge de notificaciones no leidas
- Transiciones suaves entre paginas

---

## Historial de Sesiones de Desarrollo

La plataforma fue construida en 24 sesiones, cada una con un entregable funcional completo:

| Sesion | Archivo | Descripcion |
|--------|---------|-------------|
| 01 | Infraestructura | GitHub repo + Vercel deploy + Supabase schema inicial |
| 02 | config.js + index.html | Configuracion global y homepage publica |
| 03 | RLS + propiedades.html | Politicas de seguridad y listado de propiedades |
| 04 | propiedad.html | Ficha individual con galeria, mapa y formulario de lead |
| 05 | login.html + dashboard.html | Autenticacion Supabase y panel inicial |
| 06 | agregar-propiedad.html | Wizard de 5 pasos para publicar propiedades con fotos |
| 07 | mis-propiedades.html | Gestion de propiedades propias con Storage |
| 08 | clientes.html | CRM completo de clientes con 21 campos |
| 09 | leads.html | Tabla de leads con filtros y cambio de estado |
| 10 | pipeline.html | Kanban drag-and-drop para pipeline de ventas |
| 11 | calculadora.html | Calculadora de ROI, credito hipotecario y arriendo |
| 12 | dashboard.html | Dashboard actualizado con navegacion y stats en tiempo real |
| 13 | perfil-asesor.html | Perfil personal, profesional y seguridad del asesor |
| 14 | favoritos.html | Lista de favoritos con localStorage y datos de Supabase |
| 15 | comparador.html | Comparador de hasta 3 propiedades con 25+ campos y score |
| 16 | blog.html | Blog inmobiliario con 6 articulos seed y lector modal |
| 17 | SEO | sitemap.xml + robots.txt + meta OG/Twitter/JSON-LD |
| 18 | portales.html | Integracion con Proppit, Metrocuadrado y Finca Raiz |
| 19 | aria.html | Chatbot ARIA con OpenAI gpt-4o-mini y fallback local |
| 20 | admin.html | Panel de administracion global con estadisticas |
| 21 | notificaciones.html | Centro de notificaciones con filtros y tiempo real |
| 22 | ux-widgets.js | Libreria de mejoras UX globales reutilizables |
| 23 | schema-fix.sql | Correcciones de schema y pruebas de la plataforma |
| 24 | README.md | Documentacion completa y deploy final |

---

## Credenciales de Proyecto

> **Seguridad:** Nunca compartas estas credenciales publicamente.
> La anon key de Supabase es de solo lectura desde el frontend.

| Variable | Valor |
|----------|-------|
| Supabase Project ID | lniouebpuuuqctrgxoiw |
| Supabase URL | https://lniouebpuuuqctrgxoiw.supabase.co |
| Vercel URL | https://plataforma-inmobiliaria-two.vercel.app |
| GitHub Repo | https://github.com/Lomazhome/plataforma-inmobiliaria |

---

## Tablas de Supabase

| Tabla | Proposito | Columnas Clave |
|-------|-----------|----------------|
| `propiedades` | Inmuebles publicados | titulo, tipo, tipo_negocio, precio, ciudad, estado, asesor_id |
| `leads` | Contactos de clientes | nombre, email, telefono, mensaje, propiedad_id, estado |
| `clientes` | CRM de clientes | nombre_completo, tipo_cliente, presupuesto_max, asesor_id |
| `perfiles` | Datos de asesores | nombre_completo, agencia, foto_url, matricula |

Todas las tablas tienen **Row Level Security (RLS)** activado.

---

## Guia Rapida para Asesores

1. **Registrate** en `/login.html` con tu email y contrasena
2. **Completa tu perfil** en `/perfil-asesor.html` con foto y datos profesionales
3. **Publica tu primera propiedad** en `/agregar-propiedad.html` (wizard de 5 pasos)
4. **Conecta los portales** en `/portales.html` para publicar en Metrocuadrado, Finca Raiz y Proppit
5. **Gestiona tus leads** en `/leads.html` cuando lleguen consultas
6. **Mueve clientes por el pipeline** en `/pipeline.html`
7. **Usa ARIA** en cualquier pagina para consultas rapidas sobre propiedades

---

## Paginas Publicas (sin login)

| URL | Descripcion |
|-----|-------------|
| `/index.html` | Homepage con busqueda y propiedades destacadas |
| `/propiedades.html` | Todas las propiedades publicadas con filtros |
| `/propiedad.html?id=X` | Ficha individual de una propiedad |
| `/blog.html` | Blog inmobiliario |
| `/calculadora.html` | Calculadora financiera |
| `/comparador.html` | Comparador de propiedades |
| `/aria.html` | Chatbot ARIA |
| `/login.html` | Ingreso y registro |

---

## Paginas Privadas (requieren login)

| URL | Descripcion |
|-----|-------------|
| `/dashboard.html` | Panel principal del asesor |
| `/agregar-propiedad.html` | Publicar nueva propiedad |
| `/mis-propiedades.html` | Mis propiedades |
| `/clientes.html` | CRM de clientes |
| `/leads.html` | Gestion de leads |
| `/pipeline.html` | Pipeline Kanban |
| `/portales.html` | Integracion con portales |
| `/notificaciones.html` | Centro de notificaciones |
| `/perfil-asesor.html` | Perfil del asesor |
| `/favoritos.html` | Propiedades favoritas |
| `/admin.html` | Panel de administracion |

---

## Desarrollo

Este proyecto fue construido completamente sin frameworks usando:
- HTML semantico con CSS inline para cero dependencias
- JavaScript Vanilla ES6+ con async/await
- Supabase JS SDK v2 cargado via CDN
- Vercel para hosting con deploy automatico en cada push a `main`

Para modificar cualquier pagina:
1. Edita el archivo en GitHub (boton del lapiz)
2. Haz commit directamente a `main`
3. Vercel despliega automaticamente en ~30 segundos

---

## Licencia

Proyecto privado de Lomaz Home. Todos los derechos reservados.

---

*Construido con dedicacion por Lomaz Home Team - Colombia 2026*
