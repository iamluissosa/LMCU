const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const roles = await prisma.role.findMany({ where: { name: 'Administrador' } });
    let updatedCount = 0;
    
    for (const role of roles) {
      const perms = Array.isArray(role.permissions) ? role.permissions : [];
      if (!perms.includes('settings.formats')) {
        await prisma.role.update({
          where: { id: role.id },
          data: { permissions: [...perms, 'settings.formats'] }
        });
        updatedCount++;
      }
    }
    console.log(`Parche Aplicado Exitosamente: Se actualizaron ${updatedCount} roles de Administrador para incluir 'settings.formats'.`);
  } catch (error) {
    console.error('Error aplicando el parche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
