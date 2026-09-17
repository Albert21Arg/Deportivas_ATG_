# Deportiva ATG

Plataforma web para gestionar ligas y torneos de fútbol amateur: equipos, jugadores, partidos, tabla de posiciones, goleadores, tarjetas, llaves de eliminación y contenido publicitario, con un panel de administración (SUPERADMIN / ADMIN) y páginas públicas de consulta para cualquier visitante.

Es un monorepo con dos proyectos independientes:

- **`back/`** — API REST en Node.js/Express + Prisma (SQLite).
- **`front/`** — SPA en React + Vite + Tailwind CSS.

## Tabla de contenido

- [Características](#características)
- [Stack técnico](#stack-técnico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Roles y permisos](#roles-y-permisos)
- [Modelo de datos](#modelo-de-datos)
- [API](#api)
- [Modo producción / túnel (una sola app)](#modo-producción--túnel-una-sola-app)

## Características

**Público (sin iniciar sesión)**

- Portada con el listado de torneos activos, tabla de posiciones resumida, líder y último partido en vivo de cada uno.
- Página de un torneo: tabla de posiciones (todos-contra-todos, fase de grupos o llaves), calendario de próximos partidos, goleadores, valla menos vencida, tarjetas (amarillas/rojas/azules) e historial de partidos jugados.
- Ficha de equipo y ficha de jugador (estilo "carta") con sus estadísticas.
- Eventos de partido en vivo (goles, autogoles, tarjetas) con actualización automática.
- Anuncios publicitarios (imagen + enlace) configurables por torneo o para la portada.
- Burbujas flotantes: accesos rápidos configurables (WhatsApp, redes, etc.).
- Diseño responsive, con modo claro/oscuro persistente.

**Panel de administración** (`/dashboard`, requiere sesión)

- Gestión de torneos: nombre, escudo, modo de competencia (liga, grupos, eliminación directa o ida y vuelta), fecha de caducidad, activar/inactivar, orden en la portada.
- Declarar el equipo campeón de un torneo (solo SUPERADMIN) — se muestra en la portada como "Último campeón".
- Gestión de equipos: escudo, fecha de vencimiento de pago y de vencimiento del escudo (solo SUPERADMIN puede editarlas).
- Gestión de jugadores por equipo: foto, dorsal, fecha de nacimiento, documento, estado de pago, marcar arquero titular, y un interruptor "mostrar nombre" (solo SUPERADMIN) que difumina el nombre del jugador en todo el sitio si se desactiva.
- Registro de partidos y eventos en vivo (goles, autogoles, tarjetas, penales).
- Fase de grupos y llaves de eliminación (ida/vuelta, gol de visitante, tercer y cuarto puesto).
- Gestión de anuncios publicitarios y de burbujas flotantes.
- Configuración del sitio: ícono de la pestaña (favicon).
- Gestión de administradores y asignación de torneos que puede gestionar cada uno (solo SUPERADMIN).

## Stack técnico

| | Backend | Frontend |
|---|---|---|
| Runtime | Node.js ≥ 20.19 | Node.js ≥ 20.19 |
| Framework | Express 5 | React 19 |
| Build/Dev | — | Vite 7 |
| Base de datos | SQLite (vía Prisma 6) | — |
| Estilos | — | Tailwind CSS 3 |
| Autenticación | JWT (jsonwebtoken) + bcrypt | Contexto de React (sesión en `sessionStorage`) |
| Enrutado | Express Router | React Router 7 |
| HTTP client | — | Axios |
| Seguridad | Helmet, CORS por lista blanca, `express-rate-limit` | — |
| Íconos | — | lucide-react |
| Subida de archivos | Multer (`uploads/`) | — |

## Estructura del repositorio

```
Deportivas_ATG_/
├─ back/                   API y lógica de negocio
│  ├─ src/
│  │  ├─ config/           configuración (env, Prisma, auth)
│  │  ├─ controllers/      entrada/salida HTTP
│  │  ├─ middlewares/      autenticación JWT, autorización por rol, manejo de errores
│  │  ├─ repositories/     acceso a datos (Prisma)
│  │  ├─ services/         reglas de negocio (posiciones, brackets, permisos)
│  │  ├─ validators/       validación y saneo de payloads
│  │  ├─ routes/           definición de rutas de la API
│  │  └─ utils/            utilidades compartidas (errores, expiración, tarjetas)
│  ├─ prisma/              schema.prisma, migraciones y seed
│  ├─ uploads/             archivos subidos (fotos de jugadores, etc.)
│  └─ tests/
└─ front/                  interfaz web
   └─ src/
      ├─ pages/            una vista por ruta (dashboard y páginas públicas)
      ├─ components/       piezas reutilizables (tablas, modales, navbars)
      ├─ context/          sesión (Auth), tema, notificaciones
      ├─ routes/           definición de rutas (React Router) y guard de sesión
      ├─ services/         cliente Axios
      ├─ utils/            helpers de presentación (fechas, expiración de pagos)
      └─ styles/           estilos globales (Tailwind)
```

Cada carpeta (`back/`, `front/`) tiene su propio `README.md` con más detalle.

## Requisitos previos

- Node.js 20.19 o superior y npm 10 o superior.
- No se necesita ningún motor de base de datos externo: la base de datos es un archivo SQLite local (`back/prisma/dev.db`), gestionado por Prisma.

## Puesta en marcha

### 1. Backend

```bash
cd back
npm install
cp .env.example .env      # completa los valores (ver "Variables de entorno")
npx prisma migrate dev    # crea/actualiza back/prisma/dev.db
npx prisma db seed        # opcional: datos iniciales de ejemplo
npm run dev               # http://localhost:3000
```

### 2. Frontend

```bash
cd front
npm install
npm run dev                # http://localhost:5173
```

En desarrollo, Vite corre en el puerto `5173` y redirige (`proxy`) las peticiones a `/api` y `/uploads` hacia el backend en el puerto `3000` — no hace falta configurar CORS manualmente para desarrollo local.

## Variables de entorno

### `back/.env`

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Prisma hacia el archivo SQLite, p. ej. `file:./dev.db` |
| `JWT_SECRET` | Secreto usado para firmar y verificar los tokens de sesión. Debe ser largo y aleatorio. |
| `JWT_EXPIRES_IN` | Vigencia del token de acceso (p. ej. `1d`) |
| `PORT` | Puerto donde escucha el servidor Express (por defecto `3000`) |
| `CORS_ORIGIN` | Origen adicional permitido por CORS (además de `localhost:5173`, útil para túneles/dominios de despliegue) |
| `FRONTEND_URL` | URL pública del frontend, usada para armar el enlace del correo de "recuperar contraseña" (p. ej. `https://miapp.com`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Credenciales SMTP para enviar el correo de recuperación de contraseña. Si se dejan vacías, el enlace no se envía por correo: queda impreso en la consola del backend (útil en desarrollo). |

### `front/.env` (opcional)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API. Si no se define, se usa `/api` (funciona tanto con el proxy de Vite en desarrollo como sirviendo todo desde el backend en producción). |

## Scripts disponibles

### `back/`

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor con recarga automática (`node --watch`) |
| `npm start` | Levanta el servidor sin recarga (producción) |
| `npm run lint` | ESLint sobre todo el backend |
| `npm run db:migrate` | Crea una migración de Prisma y la aplica |
| `npm run db:generate` | Regenera el cliente de Prisma |
| `npm run db:studio` | Abre Prisma Studio para explorar/editar la base de datos |
| `npm run db:seed` | Ejecuta `prisma/seed.js` |
| `npm run serve:tunnel` | Compila el frontend y levanta el backend sirviéndolo como una sola app (ver más abajo) |

### `front/`

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite con recarga en caliente |
| `npm run build` | Compila la SPA a `front/dist/` |
| `npm run preview` | Sirve localmente el resultado de `build` |
| `npm run lint` | ESLint sobre todo el frontend |

## Roles y permisos

La plataforma tiene dos roles de usuario (`User.role`):

- **SUPERADMIN**: acceso total. Es el único rol que puede gestionar otros administradores y qué torneos les corresponden, editar fechas de vencimiento de equipos, editar la foto y el pago de un jugador, activar/desactivar el interruptor de "mostrar nombre" de un jugador, declarar el campeón de un torneo, y configurar el sitio (favicon).
- **ADMIN**: gestiona únicamente los torneos que un SUPERADMIN le haya asignado (equipos, jugadores, partidos, grupos, llaves, anuncios), sin acceso a las acciones exclusivas de SUPERADMIN listadas arriba.

Las rutas públicas (portada y página de un torneo) no requieren sesión. Las rutas bajo `/dashboard` requieren una sesión válida (`ProtectedRoute`); dentro del panel, cada acción sensible se valida también en el backend, no solo se oculta en la interfaz.

## Modelo de datos

Entidades principales (ver `back/prisma/schema.prisma` para el detalle completo):

- **User**: cuentas de administración (`role`: `SUPERADMIN`/`ADMIN`). Incluye el token (hasheado) y la fecha de vencimiento usados para la recuperación de contraseña por correo.
- **Tournament**: torneo — modo de competencia, estado, campeón/subcampeón/tercer puesto, fecha de caducidad.
- **Team** / **Player** / **PlayerTeam**: equipos, jugadores y su relación (incluye si es el arquero titular).
- **UserTournament** / **TournamentTeam**: asignación de administradores y equipos a un torneo.
- **Match** / **MatchEvent**: partidos y sus eventos (goles, autogoles, tarjetas, penales).
- **Group** / **GroupTeam**: fase de grupos.
- **KnockoutTie**: llaves de eliminación directa o ida/vuelta.
- **Announcement**: anuncios publicitarios, opcionalmente asociados a un torneo.
- **FloatingBubble**: accesos rápidos flotantes de la portada.
- **SiteSetting**: configuración global del sitio (favicon).
- **TableCaption**: leyendas/notas de la tabla de posiciones.

## API

Todas las rutas cuelgan del prefijo `/api`. Los grupos principales son:

| Prefijo | Contenido |
|---|---|
| `/api/auth` | Login, sesión (`/me`) y recuperación de contraseña (`/forgot-password`, `/reset-password`) |
| `/api/public` | Endpoints públicos (sin autenticación): torneos activos, detalle de un torneo, historial, configuración del sitio |
| `/api/tournaments` | CRUD de torneos, equipos/jugadores/grupos/llaves anidados por torneo, campeón |
| `/api/teams` | CRUD de equipos |
| `/api/users` | Gestión de administradores |
| `/api/matches` | Detalle y eventos de un partido |
| `/api/announcements` | Anuncios publicitarios |
| `/api/floating-bubbles` | Burbujas flotantes |
| `/api/site-settings` | Configuración del sitio |
| `/api/health` | Chequeo de salud del servicio |

Las rutas privadas requieren un header `Authorization: Bearer <token>` obtenido en `/api/auth/login`.

## Modo producción / túnel (una sola app)

Para desplegar el frontend y el backend como un solo proceso (por ejemplo, detrás de un túnel), `back/src/app.js` sirve automáticamente `front/dist/` (y hace *fallback* a `index.html` para las rutas de la SPA) si esa carpeta existe:

```bash
cd back
npm run serve:tunnel   # compila front/ y levanta el backend sirviendo todo en un solo puerto
```

En este modo no es necesario Vite ni el proxy de desarrollo: la SPA y la API viven en el mismo origen.
