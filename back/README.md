# Backend

API y lógica de negocio de la plataforma deportiva.

- `src/config/`: configuración de la aplicación y entorno.
- `src/controllers/`: entrada y salida de las peticiones HTTP.
- `src/middlewares/`: autenticación JWT, autorización por rol y errores.
- `src/models/`: usuarios, torneos, equipos, partidos y tablas.
- `src/routes/`: rutas de la API.
- `src/services/`: reglas de negocio y cálculo de posiciones.
- `src/utils/`: utilidades compartidas.
- `database/`: migraciones y datos iniciales.
- `tests/`: pruebas del backend.

## Cloudflare Workers y D1

El Worker `deportivas-atg` publica la API Express mediante el adaptador HTTP de Workers y sirve la SPA desde los assets estáticos. Prisma conecta al binding D1 `DB`; en desarrollo local, el backend continúa usando `prisma/dev.db`.

Configura `JWT_SECRET` como secreto de Worker antes del primer despliegue:

```bash
npx wrangler secret put JWT_SECRET --config wrangler.toml
npm run cloudflare:deploy
```

La D1 `deportivas-db` ya existe. `npm run d1:export` copia `prisma/dev.db` a D1, reemplazando las tablas y datos remotos. Las referencias de imágenes `/uploads/` se convierten en una imagen de respaldo; las imágenes nuevas de anuncios requieren URLs externas y no se guardan en disco local.

El Worker ejecuta el mantenimiento de partidos mediante un cron cada minuto y genera HTML básico de vista previa para crawlers usando el logo del torneo. Las imágenes de compartir renderizadas en el servidor con Canvas siguen disponibles al ejecutar el backend Node local; en la web, las imágenes de partidos se generan en el navegador.
