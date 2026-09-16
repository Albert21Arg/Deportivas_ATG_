import { HttpError } from '../utils/http-error.js';

export function validateSiteSettingUpdate(request, _response, next) {
  try {
    const body = request.body ?? {};
    const data = {};
    if (body.faviconUrl !== undefined) {
      const faviconUrl = String(body.faviconUrl ?? '').trim();
      if (faviconUrl && !/^https?:\/\//i.test(faviconUrl)) {
        throw new HttpError(422, 'El ícono debe ser una URL http o https');
      }
      data.faviconUrl = faviconUrl || null;
    }
    if (!Object.keys(data).length) throw new HttpError(422, 'No hay cambios para guardar');
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}
