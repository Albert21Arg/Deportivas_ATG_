# Manual de usuario — Deportiva ATG

Guía de uso de la plataforma para visitantes y para administradores. Si buscas documentación técnica (instalación, variables de entorno, scripts), consulta el [`README.md`](README.md).

## Índice

- [1. Para cualquier visitante (sin cuenta)](#1-para-cualquier-visitante-sin-cuenta)
- [2. Iniciar sesión](#2-iniciar-sesión)
- [3. Roles: qué puede hacer cada uno](#3-roles-qué-puede-hacer-cada-uno)
- [4. Panel de administración](#4-panel-de-administración)
  - [4.1 Panel principal](#41-panel-principal)
  - [4.2 Torneos](#42-torneos)
  - [4.3 Equipos](#43-equipos)
  - [4.4 Jugadores](#44-jugadores)
  - [4.5 Partidos](#45-partidos)
  - [4.6 Fase de grupos](#46-fase-de-grupos-solo-torneos-en-modo-fase-de-grupos)
  - [4.7 Llaves de eliminación](#47-llaves-de-eliminación-solo-torneos-en-modo-eliminación)
  - [4.8 Goleadores y multas por tarjetas](#48-goleadores-y-multas-por-tarjetas)
  - [4.9 Anuncios publicitarios](#49-anuncios-publicitarios)
  - [4.10 Botones flotantes](#410-botones-flotantes)
  - [4.11 Configuración del sitio](#411-configuración-del-sitio)
  - [4.12 Administradores](#412-administradores)
- [5. Preguntas frecuentes](#5-preguntas-frecuentes)

---

## 1. Para cualquier visitante (sin cuenta)

Cualquier persona puede entrar a la página principal sin necesidad de iniciar sesión.

### Portada

Muestra todos los torneos activos. De cada uno se ve, de un vistazo:

- Cantidad de equipos.
- **Último campeón** (si el superadmin lo declaró) — nombre y escudo.
- El equipo líder de la clasificación.
- Si hay un partido en vivo en ese momento.

Puedes buscar un torneo por nombre con el buscador de la sección "Torneos activos", y entrar a uno tocando **"Ver torneo y próximos partidos"**.

### Página de un torneo

Al entrar a un torneo verás varias secciones, cada una se abre/cierra tocando su título:

- **Tabla de posiciones** — clasificación del torneo (todos contra todos, por grupos/bombos, o el estado de las llaves, según el formato del torneo).
- **Próximos partidos** — calendario. Toca un partido para ver su detalle.
- **Goleadores** — ranking de goles por jugador.
- **Valla menos vencida** — ranking de arqueros según goles recibidos por partido.
- **Tarjetas** — rankings de amarillas, rojas y azules.
- **Historial de partidos** — resultados ya jugados. Toca un partido para ver sus goles y tarjetas.

Al tocar un equipo (en la tabla de posiciones o en un partido) se abre su ficha con sus estadísticas y plantilla. Al tocar un jugador se abre su tarjeta individual (estilo carta de videojuego), con sus goles, tarjetas y partidos jugados.

> Si el nombre o la foto de un jugador o equipo se ven borrosos, es porque tiene un pago pendiente, o porque el superadmin decidió ocultar ese nombre manualmente (ver [4.4](#44-jugadores)). No es un error.

### Partido en vivo

Mientras un partido está en curso se marca como **"EN VIVO"** y se puede ver, en tiempo real, el marcador y la lista de goles/tarjetas a medida que se registran.

### Modo claro/oscuro

El ícono ☀️/🌙 en la esquina superior cambia el tema de toda la plataforma. La plataforma recuerda tu preferencia la próxima vez que entres.

---

## 2. Iniciar sesión

El acceso al panel de administración está en `/login` (botón **"Iniciar sesión"** en la esquina superior de la portada). Necesitas un correo y una contraseña creados previamente por un superadministrador — no hay registro público de cuentas.

Si olvidaste tu contraseña, pide a un **superadmin** que te cree una nueva o la restablezca desde la sección [Administradores](#412-administradores) (no existe recuperación automática por correo).

---

## 3. Roles: qué puede hacer cada uno

La plataforma tiene dos tipos de cuenta:

| Acción | ADMIN | SUPERADMIN |
|---|:---:|:---:|
| Gestionar los torneos que se le asignaron (equipos, jugadores, partidos, grupos, llaves) | ✅ | ✅ |
| Ver y gestionar **todos** los torneos, sin importar quién los creó | ❌ | ✅ |
| Crear/editar/desactivar torneos, cambiar su orden en la portada | ❌ | ✅ |
| Declarar el equipo campeón de un torneo | ❌ | ✅ |
| Editar la fecha de vencimiento de pago o de escudo de un **equipo** | ❌ | ✅ |
| Editar la foto o la fecha de pago de un **jugador** | ❌ | ✅ |
| Ocultar/mostrar el nombre de un jugador en todo el sitio | ❌ | ✅ |
| Crear/editar anuncios publicitarios y botones flotantes | ✅ | ✅ |
| Configurar el ícono del sitio (favicon) | ❌ | ✅ |
| Crear cuentas de administrador y asignarles torneos | ❌ | ✅ |

En resumen: un **ADMIN** administra el día a día de sus torneos (equipos, partidos, resultados), mientras que las decisiones financieras (pagos), de marca (nombres visibles, favicon) y de alcance total de la plataforma quedan reservadas al **SUPERADMIN**.

---

## 4. Panel de administración

Todo el panel vive bajo `/dashboard` y requiere sesión iniciada.

### 4.1 Panel principal

Es la pantalla de inicio al entrar al panel. Muestra:

- Un acceso directo a cada una de tus herramientas (solo visible para SUPERADMIN: Administradores, Torneos, Equipos, Anuncios, Botones flotantes, Configuración del sitio).
- La lista de tus torneos, con un buscador. Toca **"Ingresar al torneo"** para entrar al espacio de gestión de uno en concreto.

### 4.2 Torneos

Ruta: **Torneos** en el panel principal (solo SUPERADMIN puede crear/editar torneos; un ADMIN entra directo a los suyos desde el panel principal).

Al crear o editar un torneo puedes definir:

- **Nombre**, **descripción** y **escudo** (URL de la imagen).
- **Modo de torneo**: Todos contra todos, Fase de grupos, Eliminación directa o Eliminatoria ida y vuelta.
- **Fecha de caducidad**: al llegar esa fecha el torneo se inhabilita solo. Déjala vacía si no debe caducar.
- **Texto del campeón**: un texto corto (por ejemplo el año) que acompaña la palabra "Campeón" en la llave de eliminación.

Acciones sobre cada torneo (SUPERADMIN):

- **Editar** / **Activar-Desactivar** / **↑ Subir** / **↓ Bajar** (orden en que aparece en la portada).
- **🏆 Declarar campeón**: elige el equipo campeón del torneo entre los equipos inscritos. Se muestra en la portada, en el recuadro "Último campeón", con el escudo y nombre de ese equipo. Al guardar, el torneo queda marcado como finalizado.
- **Cambiar modo** (disponible también para ADMIN): cambia el formato de competencia. Solo se puede cambiar libremente si el torneo aún no tiene partidos, o si todos sus partidos ya están resueltos (finalizados o cancelados).

### 4.3 Equipos

Ruta: **Equipos**. Desde aquí:

- **Crear equipo**: nombre y escudo (URL de imagen). Al crearlo desde dentro de un torneo, queda asociado a ese torneo automáticamente.
- **Asociar equipo**: vincula un equipo ya existente (de otro torneo) al torneo actual.
- **Editar**: nombre, escudo y, **solo si eres SUPERADMIN**, la fecha de vencimiento de pago y la fecha de vencimiento del escudo. Si no ves esos dos campos de fecha, es porque tu cuenta es ADMIN — pide a un superadmin que los actualice.
- **Retirar**: quita el equipo de este torneo (no lo borra del sistema, solo de esta competencia).

Cuando el pago de un equipo vence, su nombre y escudo se ven borrosos en las páginas públicas, salvo los goles en contra, los partidos jugados y los puntos, que siempre se muestran.

### 4.4 Jugadores

Ruta: entra a un equipo desde **Equipos** → **Agregar Jugadores**.

Para cada jugador se registra: nombre, fecha de nacimiento, número de documento, dorsal y foto.

Acciones rápidas por jugador:

- **Editar** / **Inhabilitar-Habilitar**.
- **🧤 Marcar/Quitar como arquero**: designa al arquero titular del equipo (solo puede haber uno a la vez; se usa para calcular la "valla menos vencida").
- **Ocultar/Mostrar nombre** (**solo SUPERADMIN**): si lo desactivas, el nombre de ese jugador se ve borroso en **todo** el sitio (tablas, tarjetas, eventos de partido), sin importar si su pago está al día. Es independiente del estado de pago — un interruptor manual para casos puntuales.

**Solo SUPERADMIN** puede subir/cambiar la foto de un jugador y editar su fecha de pago (`paidUntil`). Si tu cuenta es ADMIN y no ves esos campos en el formulario, es el comportamiento esperado.

### 4.5 Partidos

Ruta: **Partidos**, dentro del espacio de un torneo.

- **Programar partido**: elige los dos equipos, fecha y hora.
- Un partido programado se puede **iniciar** (pasa a estado "EN VIVO"): a partir de ahí puedes tocar **"⚽ Agregar goleadores y tarjetas"** para registrar, en cualquier momento del partido:
  - Gol o autogol (elige el jugador; en un autogol, el jugador debe ser del equipo rival).
  - Tarjeta amarilla 🟨, roja 🟥 o azul 🟦 (si el torneo tiene las azules habilitadas).
  - El minuto del evento.
- Cada evento aparece de inmediato en el marcador en vivo que ven los visitantes.
- **Finalizar partido**: cierra el partido, deja el resultado como definitivo y lo mueve al historial. Si el partido terminó en empate y el formato lo requiere (llaves), se abre un modal para registrar la **tanda de penales**.
- **Generar fixture** / **Eliminar fixture** (solo en torneos modo "Todos contra todos"): crea o borra automáticamente el calendario completo de partidos según los equipos inscritos (pide confirmación antes de borrar).

### 4.6 Fase de grupos (solo torneos en modo "Fase de grupos")

Ruta: **Bombos y grupos**, dentro del espacio del torneo.

- Organiza los equipos en **bombos** (pots) y usa **"Sortear grupos"** para repartirlos aleatoriamente en los grupos. Sortear reemplaza los grupos existentes de ese torneo, así que úsalo con cuidado si ya hay partidos jugados.

### 4.7 Llaves de eliminación (solo torneos en modo "Eliminación")

Ruta: **Llaves de eliminación**, dentro del espacio del torneo.

- Arma cada cruce de la llave con sus equipos y sigue el avance ronda a ronda.
- Al resolverse la final, el campeón, subcampeón y (si aplica) tercer puesto quedan registrados automáticamente para esa llave.

### 4.8 Goleadores y multas por tarjetas

Rutas: **Goleadores** y **Multas por tarjetas**, dentro del espacio del torneo.

- **Goleadores**: mismo ranking que ven los visitantes, pero sin ningún dato oculto por pago.
- **Multas por tarjetas**: por equipo, qué jugadores tienen tarjetas con multa pendiente de pago, separado por tipo (amarilla, roja, azul) — cada tipo se paga por separado. Marca aquí cuándo un jugador ya pagó su multa.

### 4.9 Anuncios publicitarios

Ruta: **Anuncios** (en el panel principal).

Cada anuncio tiene: título, imagen, enlace opcional, cuánto tiempo pasa antes de mostrarse al entrar a la página, y cuánto tiempo permanece visible.

El campo **"¿Dónde se muestra?"** decide su alcance — se muestra **solo en un lugar**, nunca en ambos a la vez:

- **Inicio (home)**: aparece únicamente en la portada.
- Un torneo específico: aparece únicamente en la página pública de ese torneo.

El anuncio se muestra como una ventana modal con estilo de publicidad comercial (no se puede cerrar los primeros segundos si dura más de 4 segundos).

### 4.10 Botones flotantes

Ruta: **Botones flotantes** (en el panel principal, aparece en la portada como "Burbujas flotantes").

Configura accesos rápidos flotantes (por ejemplo WhatsApp o redes sociales) que se ven en toda la plataforma pública: nombre, enlace, ícono o logo, y si están activos o no.

### 4.11 Configuración del sitio

Ruta: **Configuración del sitio** (solo SUPERADMIN).

Define la imagen que se usa como ícono de la pestaña del navegador (favicon) para toda la plataforma. Déjala vacía para volver al ícono por defecto.

### 4.12 Administradores

Ruta: **Administradores** (solo SUPERADMIN).

- **Nuevo administrador**: crea una cuenta ADMIN (nombre, correo, contraseña).
- Asigna a cada administrador qué torneos puede gestionar. Un ADMIN solo verá y podrá administrar los torneos que se le asignen aquí.

---

## 5. Preguntas frecuentes

**No puedo editar la fecha de vencimiento de un equipo o jugador.**
Esos campos solo los puede editar una cuenta **SUPERADMIN**. Si tu cuenta es ADMIN, ni siquiera se muestran en el formulario — no es un error, es una restricción intencional. Pide al superadmin que lo actualice.

**El nombre de un jugador se ve borroso en la página pública.**
Puede deberse a dos cosas independientes: (1) el pago del jugador está vencido, o (2) un superadmin desactivó manualmente "Mostrar nombre" para ese jugador en particular (ver [4.4](#44-jugadores)). Los puntos y partidos jugados de un equipo, y los goles en contra, nunca se ocultan, aunque el resto de sus datos sí.

**No veo el botón "🏆 Declarar campeón" ni "Configuración del sitio" ni los campos de fecha de vencimiento.**
Esas acciones son exclusivas de SUPERADMIN. Si necesitas usarlas y tu cuenta es ADMIN, pide a un superadmin que lo haga o que te dé ese rol.

**Guardé un cambio y no pasó nada / apareció un error.**
Revisa el mensaje de la notificación que aparece en la esquina — casi siempre explica qué falta (por ejemplo, un campo obligatorio vacío). Si el error dice algo como "servidor" o "conexión", puede ser un problema temporal del servidor: espera un momento y vuelve a intentar; si persiste, contacta a quien administra el hosting de la plataforma.

**¿Cómo recupero mi contraseña?**
No hay recuperación automática por correo. Un superadmin debe crearte una cuenta nueva o cambiarte la contraseña desde [Administradores](#412-administradores).
