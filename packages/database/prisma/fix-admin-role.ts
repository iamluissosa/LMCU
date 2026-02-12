
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@lmcu.com' // Ajusta si el usuario usó otro email, pero en la imagen se ve 'admin'
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  })

  if (!user) {
    console.log(`❌ Usuario ${email} no existe en la BD local.`)
    return
  }

  console.log(`🔍 Estado Actual:`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role Legacy: ${user.roleLegacy}`)
  console.log(`   CompanyID: ${user.companyId}`)

  if (user.roleLegacy !== 'ADMIN') {
      console.log(`⚠️ El rol no es ADMIN. Actualizando...`)
      const updated = await prisma.user.update({
          where: { email },
          data: { roleLegacy: 'ADMIN' } // Forzamos ADMIN
      })
      console.log(`✅ Usuario actualizado a ADMIN.`)
  } else {
      console.log(`✅ El usuario ya es ADMIN.`)
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
