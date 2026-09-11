import prisma from '../config/prisma.js';

const select = {
  id: true,
  title: true,
  imageUrl: true,
  linkUrl: true,
  delaySeconds: true,
  durationSeconds: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export function findAll() {
  return prisma.announcement.findMany({ select, orderBy: { createdAt: 'desc' } });
}

export function findActive() {
  return prisma.announcement.findMany({
    where: { status: 'ACTIVE' },
    select,
    orderBy: { createdAt: 'asc' },
  });
}

export function create(data) {
  return prisma.announcement.create({ data, select });
}

export function update(id, data) {
  return prisma.announcement.update({ where: { id }, data, select });
}

export function findById(id) {
  return prisma.announcement.findUnique({ where: { id }, select });
}

export function remove(id) {
  return prisma.announcement.delete({ where: { id } });
}
