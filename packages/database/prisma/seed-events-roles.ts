import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVENT_PERMISSIONS = ['VIEW_EVENTS', 'CREATE_EVENTS', 'MANAGE_EVENTS_FINANCE'];

async function main() {
  console.log('🛡️ Actualizando Permisos de Roles de Administrador...');

  // Buscar todos los roles de tipo "Administrador" o "ADMIN"
  const adminRoles = await prisma.role.findMany({
    where: {
      OR: [
        { name: { contains: 'Admin', mode: 'insensitive' } },
        { name: 'Dueño' },
        { name: 'Gerencia' }
      ]
    }
  });

  if (adminRoles.length === 0) {
    console.log('⚠️ No se encontraron roles de Administrador. Asignaremos a todos.');
    // Fallback: si no hay roles de admin explícitos, podríamos actualizar todos temporalmente o el primero
    const allRoles = await prisma.role.findMany();
    for (const role of allRoles) {
      await updateRolePermissions(role);
    }
  } else {
    for (const role of adminRoles) {
      await updateRolePermissions(role);
    }
  }

  console.log('✅ Permisos de Evento inyectados exitosamente.');
}

async function updateRolePermissions(role: any) {
  let currentPermissions: string[] = [];
  
  if (role.permissions) {
    if (typeof role.permissions === 'string') {
      try { currentPermissions = JSON.parse(role.permissions); } catch (e) {}
    } else if (Array.isArray(role.permissions)) {
      currentPermissions = role.permissions;
    }
  }

  const newPermissions = Array.from(new Set([...currentPermissions, ...EVENT_PERMISSIONS]));

  await prisma.role.update({
    where: { id: role.id },
    data: { permissions: newPermissions }
  });

  console.log(`- Permisos actualizados para el rol: ${role.name}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
