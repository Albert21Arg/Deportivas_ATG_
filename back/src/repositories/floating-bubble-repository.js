import prisma from '../config/prisma.js';

const select = {
  id: true,
  key: true,
  label: true,
  linkUrl: true,
  icon: true,
  logoUrl: true,
  color: true,
  position: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export function findAll() {
  return prisma.floatingBubble.findMany({ select, orderBy: { position: 'asc' } });
}

export function findActive() {
  return prisma.floatingBubble.findMany({
    where: { status: 'ACTIVE' },
    select,
    orderBy: { position: 'asc' },
  });
}

export function findById(id) {
  return prisma.floatingBubble.findUnique({ where: { id }, select });
}

export function update(id, data) {
  return prisma.floatingBubble.update({ where: { id }, data, select });
}
