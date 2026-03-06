import { PrismaClient } from '../packages/database/node_modules/@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      company: true,
    },
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
