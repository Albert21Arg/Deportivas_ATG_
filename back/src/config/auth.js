export const AUTH = {
  accessTokenExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  bcryptRounds: 12,
  roles: {
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
  },
  statuses: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
  },
};

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === 'CHANGE_THIS_SECRET') {
    throw new Error('JWT_SECRET must be configured with a strong secret');
  }

  return secret;
}
