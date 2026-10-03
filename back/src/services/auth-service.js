import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { AUTH, getJwtSecret } from '../config/auth.js';
import prisma from '../config/prisma.js';
import * as userRepository from '../repositories/user-repository.js';
import { HttpError } from '../utils/http-error.js';
import { sendPasswordResetEmail } from './mailer-service.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildFrontendUrl() {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    teamId: user.teamId ?? null,
    team: user.team ?? null,
  };
}

// Bloqueo por fuerza bruta: cada contraseña incorrecta cuenta como intento
// fallido (independiente de si la cuenta está activa, para no filtrar ese
// dato); al llegar a maxLoginAttempts se fija lockedUntil y se reinicia el
// contador. Mientras esté bloqueada, se rechaza sin ni siquiera comparar la
// contraseña (así una racha nueva de intentos no reinicia el bloqueo).
async function registerFailedAttempt(user) {
  const attempts = user.failedLoginAttempts + 1;

  if (attempts >= AUTH.maxLoginAttempts) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + AUTH.loginLockoutMinutes * 60 * 1000) },
    });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts } });
}

export async function login({ email, password }) {
  const [staleDtIds, user] = await Promise.all([
    userRepository.deleteStaleDtAccounts(),
    prisma.user.findUnique({
      where: { email },
      include: { team: { select: { id: true, name: true } } },
    }),
  ]);

  if (user && staleDtIds.includes(user.id)) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new HttpError(429, `Demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto${minutesLeft === 1 ? '' : 's'}.`);
  }

  const passwordMatches = user
    ? await bcrypt.compare(password, user.password)
    : false;

  if (!passwordMatches) {
    if (user) await registerFailedAttempt(user);
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  if (!user || user.status !== AUTH.statuses.ACTIVE) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
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

// Responde igual exista o no la cuenta / esté activa o no, para no dejar
// adivinar por la respuesta qué correos están registrados. El enlace real
// solo se genera y se envía si el usuario existe y está activo.
export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== AUTH.statuses.ACTIVE) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + AUTH.passwordResetTokenTtlMinutes * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordTokenHash: hashToken(rawToken),
      resetPasswordExpiresAt: expiresAt,
    },
  });

  const resetUrl = `${buildFrontendUrl()}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
}

export async function resetPassword({ token, password }) {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new HttpError(400, 'El enlace de recuperación no es válido o ya venció');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, AUTH.bcryptRounds),
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    },
  });
}

export { sanitizeUser };
