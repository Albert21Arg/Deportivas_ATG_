import jwt from 'jsonwebtoken';

import { getJwtSecret } from '../config/auth.js';
import prisma from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

export async function authenticate(request, _response, next) {
  try {
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null;

    if (!token) {
      throw new HttpError(401, 'Token de autenticación requerido');
    }

    const payload = jwt.verify(token, getJwtSecret());
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HttpError(401, 'Token de autenticación no válido');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new HttpError(401, 'Credenciales no válidas');
    }

    request.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new HttpError(401, 'Token de autenticación no válido'));
    }

    return next(error);
  }
}
