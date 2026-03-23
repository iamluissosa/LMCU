const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      roleLegacy: null,
      companyId: { not: null },
    },
    data: {
      roleLegacy: 'ADMIN',
    },
  });
  console.log(`✅ Usuarios actualizados: ${result.count}`);
  
  // Verificar estado final
  const users = await prisma.user.findMany({
    select: { id: true, email: true, roleLegacy: true, companyId: true },
  });
  console.table(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
