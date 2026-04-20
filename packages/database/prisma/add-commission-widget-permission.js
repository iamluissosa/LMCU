/**
 * Script: add-commission-widget-permission.js
 *
 * Propósito: Añade el permiso 'widget.commissions.view' a todos los roles
 * que ya posean 'commissions.view' o sean de tipo Admin/Gerente/Manager.
 *
 * Ejecución (desde la raíz del proyecto):
 *   node packages/database/prisma/add-commission-widget-permission.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando roles que deberían tener widget.commissions.view...\n');

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, companyId: true, permissions: true },
  });

  let updatedCount = 0;

  for (const role of roles) {
    const perms = Array.isArray(role.permissions) ? role.permissions : [];

    const shouldAdd =
      perms.includes('*') ||
      perms.includes('commissions.view') ||
      role.name.toLowerCase().includes('admin') ||
      role.name.toLowerCase().includes('gerente') ||
      role.name.toLowerCase().includes('manager');

    const alreadyHas = perms.includes('widget.commissions.view');

    if (shouldAdd && !alreadyHas) {
      const updatedPerms = [...perms, 'widget.commissions.view'];
      await prisma.role.update({
        where: { id: role.id },
        data:  { permissions: updatedPerms },
      });
      console.log(`  ✅ Actualizado: "${role.name}" (companyId: ${role.companyId})`);
      updatedCount++;
    } else if (alreadyHas) {
      console.log(`  ⏭  Ya tenía el permiso: "${role.name}"`);
    } else {
      console.log(`  ➖ Omitido: "${role.name}" (no cumple criterios)`);
    }
  }

  console.log(`\n✨ Completado. ${updatedCount} rol(es) actualizado(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
