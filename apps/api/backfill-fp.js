const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Buscar todas las facturas que no tienen periodo fiscal
  const bills = await prisma.purchaseBill.findMany({
    where: {
      OR: [
        { fiscalMonth: null },
        { fiscalYear: null }
      ]
    }
  });

  console.log(`💸 Se encontraron ${bills.length} facturas de compra para corregir.`);

  let fixCount = 0;
  for (const bill of bills) {
    if (bill.issueDate) {
      const month = new Date(bill.issueDate).getMonth() + 1;
      const year = new Date(bill.issueDate).getFullYear();
      
      await prisma.purchaseBill.update({
        where: { id: bill.id },
        data: {
          fiscalMonth: month,
          fiscalYear: year
        }
      });
      fixCount++;
    }
  }

  console.log(`✅ ¡Se han rellenado los períodos fiscales de ${fixCount} facturas de compra correctamente!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
