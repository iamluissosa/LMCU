
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@lmcu.com'
  
  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        roleLegacy: 'ADMIN',
        // Optional: Remove company constraint if superadmin should see everything?
        // But dashboard logic says: `if (userRole === 'ADMIN') return true;`
        // And backend controller says: `if (!user.companyId || user.roleLegacy === 'ADMIN') ...`
        // Actually, let's keep it simple: just set role to ADMIN.
      },
      include: { company: true },
    })

    console.log(`✅ Usuario ${user.email} actualizado a ADMIN.`)
    console.log(`Company ID: ${user.companyId}`)
    console.log(`Role (Legacy): ${user.roleLegacy}`)
  } catch (e) {
    if ((e as any).code === 'P2025') {
        console.error(`❌ El usuario ${email} no existe. Por favor crea el usuario primero.`)
    } else {
        console.error(e)
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
