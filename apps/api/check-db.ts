import { PrismaClient } from '@repo/database';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const bills = await prisma.purchaseBill.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  fs.writeFileSync('bills2.json', JSON.stringify(bills, null, 2), 'utf-8');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
