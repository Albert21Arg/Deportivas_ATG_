import { HttpError } from '../utils/http-error.js';

const icons = new Set(['MessageCircle', 'MessageSquareQuote', 'Beer', 'Phone', 'Mail', 'Send', 'Globe', 'Link']);
const colors = new Set(['emerald', 'cyan', 'amber', 'blue', 'violet', 'rose']);

export function validateFloatingBubbleUpdate(request, _response, next) {
  try {
    const body = request.body ?? {};
    const data = {};
    if (body.label !== undefined) {
      const label = String(body.label).trim();
      if (!label || label.length > 50) throw new HttpError(422, 'El nombre debe tener entre 1 y 50 caracteres');
      data.label = label;
    }
    if (body.linkUrl !== undefined) {
      const linkUrl = String(body.linkUrl).trim();
      if (!linkUrl || (!/^https?:\/\//i.test(linkUrl) && !/^mailto:/i.test(linkUrl) && !/^tel:/i.test(linkUrl) && linkUrl !== '#')) {
        throw new HttpError(422, 'El enlace debe ser una URL, tel:, mailto: o #');
      }
      data.linkUrl = linkUrl;
    }
    if (body.icon !== undefined) {
      if (!icons.has(body.icon)) throw new HttpError(422, 'Icono no válido');
      data.icon = body.icon;
    }
    if (body.logoUrl !== undefined) {
      const logoUrl = String(body.logoUrl).trim();
      if (logoUrl && !/^https?:\/\//i.test(logoUrl)) throw new HttpError(422, 'El logo debe ser una URL http o https');
      data.logoUrl = logoUrl || null;
    }
    if (body.color !== undefined) {
      if (!colors.has(body.color)) throw new HttpError(422, 'Color no válido');
      data.color = body.color;
    }
    if (body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(body.status)) throw new HttpError(422, 'Estado no válido');
      data.status = body.status;
    }
    if (!Object.keys(data).length) throw new HttpError(422, 'No hay cambios para guardar');
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}
