/*
|--------------------------------------------------------------------------
| Imagen para compartir una fecha (partidos programados)
|--------------------------------------------------------------------------
| Dibuja en un canvas el nombre del torneo, "Fecha N", el día y cada
| partido: hora arriba, los dos escudos grandes (protagonistas, sin
| recuadros) con "VS" en medio y el nombre de cada equipo debajo.
|
| Este archivo lo usan el navegador (botón "Compartir" de la página pública)
| y el backend (imagen de la vista previa del enlace para WhatsApp/Facebook,
| en back/src/services/round-image-service.js), así las dos imágenes son
| iguales. Por eso el dibujo (drawRoundShareImage) no usa nada propio del
| navegador: recibe createCanvas y loadImage según dónde corra.
|
| Formatos:
|  - "portrait":  1080 de ancho, alto según los partidos (para descargar y
|                 compartir la imagen; 1 columna hasta 4 partidos, 2 si hay más).
|  - "landscape": 1200x630, el tamaño que WhatsApp/Facebook muestran en grande
|                 en la vista previa de un enlace.
*/

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function initials(name) {
  return String(name ?? '?')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';
}

// La fuente se guarda en el propio contexto: el navegador usa la del
// sistema (FONT) y el servidor una sola familia instalada, porque su motor
// de dibujo no resuelve bien listas de fuentes y perdía la negrita.
function setFont(context, weight, size) {
  context.font = `${weight} ${size}px ${context.fontFamilyForShare ?? FONT}`;
}

// Achica la letra hasta que el texto quepa; si aun así no cabe, lo corta
// con "…". Deja puesta en el contexto la fuente con la que cupo.
function fitText(context, text, maxWidth, { weight = 700, size = 34, minSize = 24 } = {}) {
  let fontSize = size;
  setFont(context, weight, fontSize);

  while (context.measureText(text).width > maxWidth && fontSize > minSize) {
    fontSize -= 1;
    setFont(context, weight, fontSize);
  }

  let result = text;
  while (context.measureText(result).width > maxWidth && result.length > 1) {
    result = result.slice(0, -1);
  }

  return result === text ? text : `${result.trimEnd()}…`;
}

// Parte el nombre en hasta dos renglones que quepan en maxWidth; el último
// renglón se achica o se corta con "…" si sobra texto.
function wrapName(context, text, maxWidth, size) {
  setFont(context, 700, size);
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  let first = '';
  let index = 0;

  for (; index < words.length; index += 1) {
    const candidate = first ? `${first} ${words[index]}` : words[index];
    if (first && context.measureText(candidate).width > maxWidth) break;
    first = candidate;
  }

  const rest = words.slice(index).join(' ');
  const lines = [fitText(context, first, maxWidth, { weight: 700, size, minSize: Math.round(size * 0.8) })];
  if (rest) lines.push(fitText(context, rest, maxWidth, { weight: 700, size, minSize: Math.round(size * 0.8) }));
  return lines;
}

function shieldPath(context, x, y, size) {
  const width = size * 0.82;
  const left = x + (size - width) / 2;
  const top = y + size * 0.04;
  const bottom = y + size * 0.96;

  context.beginPath();
  context.moveTo(left, top + size * 0.1);
  context.quadraticCurveTo(left + width / 2, top - size * 0.06, left + width, top + size * 0.1);
  context.lineTo(left + width, top + size * 0.48);
  context.quadraticCurveTo(left + width, bottom - size * 0.18, left + width / 2, bottom);
  context.quadraticCurveTo(left, bottom - size * 0.18, left, top + size * 0.48);
  context.closePath();
}

function drawLogo(context, image, team, x, y, size) {
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = Math.round(size * 0.18);
  context.shadowOffsetY = Math.round(size * 0.06);

  if (image) {
    const scale = Math.min(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
    context.restore();
    return;
  }

  // Sin escudo: silueta de escudo con las iniciales del equipo.
  const fill = context.createLinearGradient(x, y, x, y + size);
  fill.addColorStop(0, 'rgba(52, 211, 153, 0.28)');
  fill.addColorStop(1, 'rgba(15, 23, 42, 0.55)');
  shieldPath(context, x, y, size);
  context.fillStyle = fill;
  context.fill();
  context.restore();

  shieldPath(context, x, y, size);
  context.lineWidth = Math.max(3, size * 0.03);
  context.strokeStyle = 'rgba(167, 243, 208, 0.55)';
  context.stroke();

  context.fillStyle = '#ecfdf5';
  setFont(context, 900, Math.round(size * 0.3));
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials(team?.name), x + size / 2, y + size * 0.46);
}

// Medidas de cada formato. En horizontal el alto es fijo, así que el tamaño
// del escudo se calcula para que quepan todas las filas.
function computeLayout(format, count) {
  if (format === 'landscape') {
    const width = 1200;
    const height = 630;
    const padding = 44;
    const columns = count <= 2 ? Math.max(count, 1) : count <= 4 ? 2 : count <= 6 ? 3 : 4;
    const rows = Math.ceil(count / columns);
    const columnGap = 24;
    const rowGap = 18;
    const headerHeight = 150;
    const footerHeight = 40;
    const cellWidth = (width - padding * 2 - columnGap * (columns - 1)) / columns;
    const cellHeight = (height - headerHeight - footerHeight - rowGap * (rows - 1)) / rows;
    const nameSize = columns >= 4 ? 19 : 22;
    const nameLine = nameSize + 3;
    const timeSize = columns >= 4 ? 22 : 26;
    const logoSize = Math.max(56, Math.min(cellHeight - (timeSize + 12) - 10 - nameLine * 2, cellWidth / 2 - 20, 170));
    return { width, height, padding, columns, rows, columnGap, rowGap, headerHeight, footerHeight, cellWidth, cellHeight, nameSize, nameLine, timeSize, logoSize };
  }

  const width = 1080;
  const padding = 64;
  const columns = count > 4 ? 2 : 1;
  const rows = Math.ceil(count / columns);
  const columnGap = 40;
  const rowGap = 48;
  const headerHeight = 300;
  const footerHeight = 120;
  const cellWidth = (width - padding * 2 - columnGap * (columns - 1)) / columns;
  const logoSize = columns === 2 ? 156 : 200;
  const nameSize = columns === 2 ? 27 : 32;
  const nameLine = 32;
  const timeSize = 32;
  const cellHeight = timeSize + 12 + 18 + logoSize + 22 + nameLine * 2;
  const height = headerHeight + rows * cellHeight + (rows - 1) * rowGap + footerHeight;
  return { width, height, padding, columns, rows, columnGap, rowGap, headerHeight, footerHeight, cellWidth, cellHeight, nameSize, nameLine, timeSize, logoSize };
}

function drawHeader(context, format, layout, { tournamentName, title, subtitle }) {
  const { width, padding } = layout;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  if (format === 'landscape') {
    context.fillStyle = 'rgba(226, 232, 240, 0.85)';
    context.fillText(fitText(context, tournamentName, width - padding * 2, { weight: 700, size: 28, minSize: 20 }), padding, padding + 26);

    context.fillStyle = '#34d399';
    const titleText = fitText(context, title.toUpperCase(), (width - padding * 2) * 0.55, { weight: 900, size: 64, minSize: 40 });
    context.fillText(titleText, padding, padding + 92);
    const titleWidth = context.measureText(titleText).width;

    context.fillStyle = '#cbd5e1';
    context.fillText(
      fitText(context, subtitle, width - padding * 2 - titleWidth - 24, { weight: 600, size: 30, minSize: 20 }),
      padding + titleWidth + 24,
      padding + 90,
    );
    return;
  }

  context.fillStyle = 'rgba(226, 232, 240, 0.85)';
  context.fillText(fitText(context, tournamentName, width - padding * 2, { weight: 700, size: 38, minSize: 28 }), padding, padding + 38);

  context.fillStyle = '#34d399';
  context.fillText(fitText(context, title.toUpperCase(), width - padding * 2, { weight: 900, size: 92, minSize: 56 }), padding, padding + 146);

  context.fillStyle = '#cbd5e1';
  context.fillText(fitText(context, subtitle, width - padding * 2, { weight: 600, size: 38, minSize: 28 }), padding, padding + 204);
}

/**
 * Dibuja la imagen y devuelve el canvas.
 *
 * @param {object}   options
 * @param {(width: number, height: number) => object} options.createCanvas
 * @param {(src: string) => Promise<object|null>}     options.loadImage  null si no se pudo cargar
 * @param {'portrait'|'landscape'} [options.format]
 * @param {string}   options.tournamentName
 * @param {string}   options.title       Ej. "Fecha 8" (o el día si no hay número)
 * @param {string}   options.subtitle    Ej. "Domingo 4 octubre 2026"
 * @param {Array}    options.matches     Partidos con homeTeam/awayTeam/time
 * @param {(time: string) => string} options.formatTime
 * @param {(team: object) => boolean} [options.hideLogo]  true si no se debe mostrar el escudo
 * @param {string}   [options.footer]    Texto al pie (ej. dirección de la página)
 * @param {string}   [options.fontFamily] Familia de fuente (por defecto la del sistema)
 */
export async function drawRoundShareImage({
  createCanvas,
  loadImage,
  format = 'portrait',
  tournamentName,
  title,
  subtitle,
  matches,
  formatTime,
  centerLabel = 'VS',
  hideLogo = () => false,
  footer = '',
  fontFamily = FONT,
}) {
  const layout = computeLayout(format, matches.length);
  const { width, height, padding, columns, columnGap, rowGap, headerHeight, cellWidth, cellHeight, nameSize, nameLine, timeSize, logoSize } = layout;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fontFamilyForShare = fontFamily;

  // Fondo
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#0b1220');
  background.addColorStop(1, '#042f2e');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width - 120, 80, 10, width - 120, 80, 460);
  glow.addColorStop(0, 'rgba(52, 211, 153, 0.22)');
  glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  drawHeader(context, format, layout, { tournamentName, title, subtitle });

  // Partidos
  const logos = await Promise.all(
    matches.flatMap((match) => [
      hideLogo(match.homeTeam) || !match.homeTeam?.logo ? null : loadImage(match.homeTeam.logo),
      hideLogo(match.awayTeam) || !match.awayTeam?.logo ? null : loadImage(match.awayTeam.logo),
    ]),
  );

  matches.forEach((match, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + column * (cellWidth + columnGap);
    const y = headerHeight + row * (cellHeight + rowGap);
    const centerX = x + cellWidth / 2;
    const homeCenterX = x + cellWidth * 0.25;
    const awayCenterX = x + cellWidth * 0.75;
    // Centra el partido en su celda (en horizontal la celda puede sobrar
    // cuando hay pocos partidos).
    const contentHeight = timeSize + 22 + logoSize + 10 + nameLine * 2;
    const offsetY = Math.max(0, (cellHeight - contentHeight) / 2);
    const logoY = y + offsetY + timeSize + 12 + 10;
    const nameWidth = cellWidth / 2 - 10;

    // Línea sutil entre filas (separador, no un recuadro)
    if (row > 0) {
      context.fillStyle = 'rgba(255, 255, 255, 0.07)';
      context.fillRect(x + cellWidth * 0.2, y - rowGap / 2, cellWidth * 0.6, 2);
    }

    // Hora
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillStyle = '#6ee7b7';
    context.fillText(fitText(context, formatTime(match.time), cellWidth, { weight: 800, size: timeSize, minSize: Math.round(timeSize * 0.75) }), centerX, y + offsetY + timeSize);

    // Escudo real si está permitido y se pudo cargar; de lo contrario, usa
    // la silueta con iniciales del equipo.
    drawLogo(context, logos[index * 2], match.homeTeam, homeCenterX - logoSize / 2, logoY, logoSize);
    drawLogo(context, logos[index * 2 + 1], match.awayTeam, awayCenterX - logoSize / 2, logoY, logoSize);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(203, 213, 225, 0.7)';
    setFont(context, 900, Math.round(Math.min(32, logoSize * 0.2)));
    context.fillText(
      fitText(context, centerLabel, cellWidth / 2, { weight: 900, size: Math.round(Math.min(32, logoSize * 0.2)), minSize: 14 }),
      centerX,
      logoY + logoSize / 2,
    );

    // Nombres debajo de cada escudo (hasta dos renglones)
    context.textBaseline = 'top';
    context.fillStyle = '#f8fafc';
    [
      [match.homeTeam?.name, homeCenterX],
      [match.awayTeam?.name, awayCenterX],
    ].forEach(([name, nameX]) => {
      wrapName(context, name, nameWidth, nameSize).forEach((line, lineIndex) => {
        context.fillText(line, nameX, logoY + logoSize + 10 + lineIndex * nameLine);
      });
    });
  });

  // Pie
  if (footer) {
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillStyle = 'rgba(148, 163, 184, 0.9)';
    const footerSize = format === 'landscape' ? 20 : 28;
    context.fillText(
      fitText(context, footer, width - padding * 2, { weight: 600, size: footerSize, minSize: 16 }),
      width / 2,
      height - (format === 'landscape' ? 16 : 52),
    );
  }

  return canvas;
}

/*
| Versión para el navegador: genera la imagen vertical y la devuelve como
| Blob PNG. Los escudos se cargan con crossOrigin="anonymous": si el sitio
| donde está guardado el escudo no permite usarlo en otra página (CORS), se
| dibuja la silueta con iniciales en vez de "ensuciar" el canvas y no poder
| exportar la imagen.
*/
export async function buildRoundShareImage(options) {
  const canvas = await drawRoundShareImage({
    ...options,
    format: 'portrait',
    createCanvas: (width, height) => {
      const element = document.createElement('canvas');
      element.width = width;
      element.height = height;
      return element;
    },
    loadImage: (src) =>
      new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      }),
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/png',
    );
  });
}
