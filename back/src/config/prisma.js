import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

let prismaClient;

function createLocalOrHttpClient() {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN } = process.env;

  if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_DATABASE_ID && CLOUDFLARE_D1_TOKEN) {
    return new PrismaClient({
      adapter: new PrismaD1({ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN }),
    });
  }

  return new PrismaClient();
}

export function configurePrismaD1(binding) {
  if (!binding) throw new Error('Cloudflare D1 binding DB is not configured');
  if (!prismaClient) prismaClient = new PrismaClient({ adapter: new PrismaD1(binding) });
}

const prisma = new Proxy({}, {
  get(_target, property) {
    if (!prismaClient) prismaClient = createLocalOrHttpClient();
    const value = Reflect.get(prismaClient, property, prismaClient);
    return typeof value === 'function' ? value.bind(prismaClient) : value;
  },
});

export default prisma;
