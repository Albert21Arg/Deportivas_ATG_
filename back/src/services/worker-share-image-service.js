import prisma from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function parsePublicUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new HttpError(422, 'La URL de la imagen no es válida');
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(422, 'La URL de la imagen no es válida');
  }

  const hostname = url.hostname.toLowerCase();
  const isIpLiteral = hostname.startsWith('[') || /^[\d.]+$/.test(hostname);
  if (url.protocol !== 'https:' || url.username || url.password || isIpLiteral
    || hostname === 'localhost' || hostname.endsWith('.localhost')
    || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new HttpError(422, 'La imagen debe estar en una URL HTTPS pública');
  }

  return url;
}

async function isRegisteredImage(url) {
  const candidates = [...new Set([
    url.href,
    `${url.origin}${url.pathname}${url.search}`,
    `${url.pathname}${url.search}`,
  ])];
  const [player, team] = await Promise.all([
    prisma.player.findFirst({ where: { photo: { in: candidates } }, select: { id: true } }),
    prisma.team.findFirst({ where: { logo: { in: candidates } }, select: { id: true } }),
  ]);
  return Boolean(player || team);
}

async function readBoundedBody(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new HttpError(413, 'La imagen supera el tamaño máximo permitido');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new HttpError(502, 'No se pudo leer la imagen remota');

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'La imagen supera el tamaño máximo permitido');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function fetchRegisteredWorkerImage(source) {
  const initialUrl = parsePublicUrl(source);
  if (!await isRegisteredImage(initialUrl)) {
    throw new HttpError(404, 'La imagen no está asociada a un jugador o equipo');
  }

  let currentUrl = initialUrl;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const checkedUrl = parsePublicUrl(currentUrl.href);
    let response;
    try {
      response = await fetch(checkedUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { Accept: [...ALLOWED_IMAGE_TYPES].join(',') },
      });
    } catch {
      throw new HttpError(502, 'No se pudo obtener la imagen remota');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) {
        throw new HttpError(502, 'La imagen tiene demasiadas redirecciones');
      }
      currentUrl = new URL(location, checkedUrl);
      continue;
    }

    if (!response.ok) throw new HttpError(502, 'El servidor de imágenes no respondió correctamente');
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      throw new HttpError(415, 'El enlace no apunta a una imagen compatible');
    }

    return { contentType, body: await readBoundedBody(response) };
  }

  throw new HttpError(502, 'La imagen tiene demasiadas redirecciones');
}
