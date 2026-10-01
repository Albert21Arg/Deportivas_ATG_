import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

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

function isPrivateAddress(address) {
  if (isIP(address) === 4) {
    const [first, second] = address.split('.').map(Number);
    return first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && [0, 168].includes(second))
      || (first === 198 && [18, 19, 51].includes(second))
      || (first === 203 && second === 0);
  }

  const normalized = address.toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.slice('::ffff:'.length);
    return isIP(mappedIpv4) === 4 && isPrivateAddress(mappedIpv4);
  }

  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:');
}

async function assertPublicAddress(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new HttpError(422, 'La URL de la imagen no es pública');
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new HttpError(422, 'La URL de la imagen no es pública');
  }
}

async function isRegisteredPlayerOrTeamImage(url) {
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
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
}

export async function fetchRegisteredShareImage(source) {
  if (typeof source !== 'string' || source.length > 2048) {
    throw new HttpError(422, 'La URL de la imagen no es válida');
  }

  let url;
  try {
    url = new URL(source);
  } catch {
    throw new HttpError(422, 'La URL de la imagen no es válida');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new HttpError(422, 'La URL de la imagen debe usar HTTP o HTTPS');
  }
  if (!await isRegisteredPlayerOrTeamImage(url)) {
    throw new HttpError(404, 'La imagen no está asociada a un jugador o equipo');
  }

  let currentUrl = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    try {
      await assertPublicAddress(currentUrl);
      const response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { Accept: [...ALLOWED_IMAGE_TYPES].join(',') },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirects === 3) throw new HttpError(502, 'La imagen tiene demasiadas redirecciones');
        currentUrl = new URL(location, currentUrl);
        if (!['http:', 'https:'].includes(currentUrl.protocol)) throw new HttpError(502, 'Redirección de imagen no válida');
        continue;
      }

      if (!response.ok) throw new HttpError(502, 'El servidor de imágenes no respondió correctamente');
      const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new HttpError(415, 'El enlace no apunta a una imagen compatible');

      return { contentType, body: await readBoundedBody(response) };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'No se pudo obtener la imagen remota');
    }
  }

  throw new HttpError(502, 'No se pudo obtener la imagen remota');
}
