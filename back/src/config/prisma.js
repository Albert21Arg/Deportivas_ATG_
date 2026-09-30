import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

// Si están definidas las credenciales de Cloudflare, Prisma usa la base D1
// "deportivas-db" vía HTTP; si no, usa el SQLite local de DATABASE_URL.
function createAdapter() {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN } = process.env;

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_DATABASE_ID || !CLOUDFLARE_D1_TOKEN) {
    return undefined;
  }

  return new PrismaD1({ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN });
}

const adapter = createAdapter();
const prisma = adapter ? new PrismaClient({ adapter }) : new PrismaClient();

export default prisma;
