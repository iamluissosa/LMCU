const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- PERMISOS EXISTENTES ---');
  const permissions = await prisma.permission.findMany();
  console.log(permissions.map(p => p.name).sort());

  console.log('\n--- ROLES Y SUS PERMISOS ---');
  const roles = await prisma.role.findMany({
    include: { permissions: true }
  });
  
  roles.forEach(role => {
    console.log(`\nROL: ${role.name}`);
    console.log('PERMISOS:', role.permissions.map(p => p.name).sort().join(', '));
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
