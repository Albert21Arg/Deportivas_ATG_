export const AUTH = {
  accessTokenExpiresIn: process.env.JWT_EXPIRES_IN ?? '60m',
  bcryptRounds: 12,
  passwordResetTokenTtlMinutes: 60,
  maxLoginAttempts: 5,
  loginLockoutMinutes: 3,
  dtAccountRetentionDays: 20,
  roles: {
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
    DT: 'DT',
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
