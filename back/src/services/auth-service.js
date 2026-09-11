import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { AUTH, getJwtSecret } from '../config/auth.js';
import prisma from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!user || !passwordMatches || user.status !== AUTH.statuses.ACTIVE) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  const token = jwt.sign(
    { role: user.role },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: AUTH.accessTokenExpiresIn,
    },
  );

  return {
    token,
    expiresIn: AUTH.accessTokenExpiresIn,
    user: sanitizeUser(user),
  };
}

export { sanitizeUser };
