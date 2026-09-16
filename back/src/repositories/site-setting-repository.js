import prisma from '../config/prisma.js';

const SETTINGS_ID = 1;
const select = { id: true, faviconUrl: true, updatedAt: true };

export function findSettings() {
  return prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID }, select });
}

export function upsertSettings(data) {
  return prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
    select,
  });
}
