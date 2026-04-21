/**
 * Script: add-commission-widget-permission.ts
 *
 * Propósito: Añade el permiso 'widget.commissions.view' a todos los roles
 * que ya posean 'commissions.view' o tengan el permiso wildcard '*'.
 * Esto activa el nuevo bloque de Comisiones en el Dashboard.
 *
 * Ejecución:
 *   cd packages/database
 *   npx ts-node -e "require('./prisma/add-commission-widget-permission.ts')"
 *
 * O desde la raíz del monorepo:
 *   node -r ts-node/register packages/database/prisma/add-commission-widget-permission.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando roles que deberían tener widget.commissions.view...');

  // Obtener todos los roles de todas las empresas
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, companyId: true, permissions: true },
  });

  let updatedCount = 0;

  for (const role of roles) {
    const perms: string[] = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];

    // Añadimos el permiso si el rol tiene:
    //   a) El wildcard '*' (superadmin)
    //   b) 'commissions.view' (rol que ya usa el módulo de comisiones)
    //   c) El nombre contiene 'admin', 'gerente' o 'manager' (por convención de nombres)
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

  console.log(`\n✨ Completado. ${updatedCount} rol(es) actualizados.`);
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
