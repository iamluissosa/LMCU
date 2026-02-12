
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@lmcu.com'
  
  console.log('--- START CHECK ---')
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('USER NOT FOUND')
  } else {
    console.log(`CURRENT ROLE: ${user.roleLegacy}`)
    if (user.roleLegacy !== 'ADMIN') {
        await prisma.user.update({
            where: { email },
            data: { roleLegacy: 'ADMIN' }
        });
        console.log('UPDATED TO ADMIN')
    } else {
        console.log('ALREADY ADMIN')
    }
  }
  console.log('--- END CHECK ---')
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
