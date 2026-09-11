import { HttpError } from '../utils/http-error.js';

export function authorize(...allowedRoles) {
  return (request, _response, next) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return next(new HttpError(403, 'No tienes permisos para realizar esta acción'));
    }

    return next();
  };
}
