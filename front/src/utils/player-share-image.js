import { toCanvas } from 'html-to-image';
import api from '../services/api.js';

/*
|--------------------------------------------------------------------------
| Imagen para compartir la tarjeta de un jugador
|--------------------------------------------------------------------------
| Toma una "foto" de la tarjeta tal como se ve en pantalla (html-to-image)
| y la centra sobre un fondo oscuro en formato 4:5 (1080x1350), el que mejor
| se ve en Instagram, Facebook y WhatsApp. Los elementos marcados con
| data-share-hide (p.ej. el botón de like) no salen en la imagen.
| Devuelve un Blob PNG.
*/

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
// Imagen transparente de 1x1: si una foto o escudo no se puede cargar, la
// tarjeta se genera igual sin esa imagen en vez de fallar completa.
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function waitForImage(image, source) {
  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      clearTimeout(timeoutId);
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    timeoutId = setTimeout(finish, 10000);
    image.crossOrigin = 'anonymous';
    image.src = source;
    if (image.complete) queueMicrotask(finish);
  });
}

// La silueta de la tarjeta es un <clipPath> SVG definido fuera del marco
// (id "player-card-shape", en coordenadas 0..1). La foto del marco no lo
// incluye, así que aquí se vuelve a recortar la imagen con esa misma forma.
function cardShapePath(clipPathId, x, y, width, height) {
  const d = document.querySelector(`#${clipPathId} path`)?.getAttribute('d');
  if (!d) return null;
  const path = new Path2D();
  path.addPath(new Path2D(d), new DOMMatrix().translate(x, y).scale(width, height));
  return path;
}

export async function buildPlayerShareImage(cardElement, { footer = '', clipPathId = 'player-card-shape' } = {}) {
  const externalImages = [...cardElement.querySelectorAll('img')]
    .filter((image) => {
      if (!image.src || !['http:', 'https:'].includes(new URL(image.src).protocol)) return false;
      return new URL(image.src).origin !== window.location.origin;
    })
    .map((image) => ({
      image,
      source: image.src,
      src: image.getAttribute('src'),
      srcSet: image.getAttribute('srcset'),
      crossOrigin: image.getAttribute('crossorigin'),
    }));

  let card;
  try {
    await Promise.all(externalImages.map(({ image, source }) => {
      image.removeAttribute('srcset');
      const proxyUrl = `${String(api.defaults.baseURL).replace(/\/$/, '')}/public/share-image?url=${encodeURIComponent(source)}`;
      return waitForImage(image, proxyUrl);
    }));

    card = await toCanvas(cardElement, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
      imagePlaceholder: EMPTY_IMAGE,
      filter: (node) => !(node instanceof HTMLElement && node.dataset.shareHide !== undefined),
    });
  } finally {
    externalImages.forEach(({ image, src, srcSet, crossOrigin }) => {
      if (src === null) image.removeAttribute('src');
      else image.setAttribute('src', src);
      if (srcSet === null) image.removeAttribute('srcset');
      else image.setAttribute('srcset', srcSet);
      if (crossOrigin === null) image.removeAttribute('crossorigin');
      else image.setAttribute('crossorigin', crossOrigin);
    });
  }

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');

  const background = context.createRadialGradient(WIDTH / 2, HEIGHT * 0.38, 40, WIDTH / 2, HEIGHT * 0.38, HEIGHT * 0.8);
  background.addColorStop(0, '#1c2738');
  background.addColorStop(0.5, '#080c13');
  background.addColorStop(1, '#000000');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Tarjeta centrada, lo más grande posible dejando espacio para el pie.
  const maxWidth = WIDTH - 120;
  const maxHeight = HEIGHT - (footer ? 170 : 110);
  const scale = Math.min(maxWidth / card.width, maxHeight / card.height);
  const width = card.width * scale;
  const height = card.height * scale;
  const x = (WIDTH - width) / 2;
  const y = 50;
  const shape = cardShapePath(clipPathId, x, y, width, height);

  // Sombra con la silueta de la tarjeta y, encima, la tarjeta recortada.
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.85)';
  context.shadowBlur = 60;
  context.shadowOffsetY = 30;
  context.fillStyle = '#000';
  if (shape) context.fill(shape);
  else context.fillRect(x, y, width, height);
  context.restore();

  context.save();
  if (shape) context.clip(shape);
  context.drawImage(card, x, y, width, height);
  context.restore();

  if (footer) {
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillStyle = 'rgba(148, 163, 184, 0.9)';
    context.font = `600 30px ${FONT}`;
    context.fillText(footer, WIDTH / 2, HEIGHT - 52);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/png',
    );
  });
}
