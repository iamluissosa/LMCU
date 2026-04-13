import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CORRECCIÓN: Usamos Objetos en lugar de Enums para evitar el error de Node v24
const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
} as const;

const MovementType = {
  IN_PURCHASE: 'IN_PURCHASE',
  OUT_SALE: 'OUT_SALE',
  ADJ_POSITIVE: 'ADJ_POSITIVE',
  ADJ_NEGATIVE: 'ADJ_NEGATIVE'
} as const;

async function main() {
  console.log('🌱 Iniciando Seed para LMCU ERP...');

  // --- 1. CONFIGURACIÓN DEL ADMIN ---
  // 👇👇👇 ¡PEGA AQUÍ TU ID DE SUPABASE QUE COPIASTE ANTES! 👇👇👇
  const ADMIN_UUID = '5570ee7a-9595-490c-8666-e186a404f6df';

  const email = 'admin@lmcu.com';

  // Creamos el perfil del usuario inicial sin asignar empresa (se hará más adelante)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: ADMIN_UUID,
      email,
      password: 'password123', // Dummy password required by schema
      name: 'Administrador LMCU',
    },
  });

  console.log(`👤 Usuario garantizado: ${user.email}`);

  // --- 2. EMPRESA (TENANT) ---
  const company = await prisma.company.upsert({
    where: { rif: 'J-12345678-9' },
    update: {},
    create: {
      name: 'Distribuidora LMCU, C.A.',
      rif: 'J-12345678-9',
      address: 'Valencia, Carabobo',
      city: 'Valencia',
      state: 'Carabobo',
      taxpayerType: 'J',
      settings: {
        create: {
          currency: 'USD',
          timeZone: 'America/Caracas'
        }
      }
    },
  });

  console.log(`🏢 Empresa garantizada: ${company.name}`);

  // --- 3. VINCULAR USUARIO A EMPRESA ---
  // Ahora actualizamos al usuario para asignarlo a esta empresa y actualizar su role a admin

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      companyId: company.id,
      roleLegacy: Role.OWNER // Asignarlo como OWNER del default string array. Opcionalmente podrías buscar o crear un rol global.
    }
  });

  console.log('✅ Relación Usuario-Empresa creada.');

  // --- 4. PRODUCTO DE PRUEBA ---
  const product = await prisma.product.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'PROD-001',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Producto de Prueba LMCU',
      code: 'PROD-001',
      priceBase: 10.50,
      currentStock: 100,
    },
  });

  console.log(`📦 Producto creado: ${product.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });