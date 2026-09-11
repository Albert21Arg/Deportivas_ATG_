import 'dotenv/config';
import bcrypt from 'bcrypt';

import { AUTH } from '../src/config/auth.js';
import prisma from '../src/config/prisma.js';

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME?.trim() || 'SuperAdmin';

if (!email || !password || password.length < 8) {
  throw new Error('SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 8 caracteres) son obligatorios');
}

const passwordHash = await bcrypt.hash(password, AUTH.bcryptRounds);

await prisma.user.upsert({
  where: { email },
  update: {
    name,
    password: passwordHash,
    role: AUTH.roles.SUPERADMIN,
    status: AUTH.statuses.ACTIVE,
  },
  create: {
    name,
    email,
    password: passwordHash,
    role: AUTH.roles.SUPERADMIN,
    status: AUTH.statuses.ACTIVE,
  },
});

console.log(`Usuario SUPERADMIN preparado: ${email}`);
await prisma.$disconnect();
