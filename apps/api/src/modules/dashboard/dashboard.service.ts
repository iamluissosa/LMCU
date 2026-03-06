import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Ahora pedimos el companyId como requisito, y los permisos del usuario para optimizar consultas
  async getStats(companyId: string, userPermissions: string[] = []) {
    if (!companyId) {
      return {
        totalProducts: 0,
        totalUsers: 0,
        lowStockCount: 0,
        inventoryValue: 0,
        lowStockProducts: [],
        accountsReceivable: 0,
        invoicesIssuedCount: 0,
        invoicesPaidCount: 0,
        quotesStats: { sent: 0, expired: 0, accepted: 0, rejected: 0 },
      };
    }

    const hasInventoryPerm = userPermissions.includes('widget.inventory.view') || userPermissions.includes('inventory.view');
    const hasLowStockPerm = userPermissions.includes('widget.low_stock.view');
    const hasSalesPerm = userPermissions.includes('widget.sales.view');
    const hasFinancePerm = userPermissions.includes('widget.finance.view');

    // MÉTODOS BASE (Usuarios siempre se muestra si eres admin, pero por defecto lo calculamos rápido)
    const totalUsers = await this.prisma.user.count({ where: { companyId } });

    // --- MÓDULO INVENTARIO ---
    let totalProducts = 0;
    let inventoryValue = 0;
    let lowStockCount = 0;
    let lowStockProducts: any[] = [];

    if (hasInventoryPerm || hasLowStockPerm) {
       totalProducts = await this.prisma.product.count({ where: { companyId } });
       
       const products = await this.prisma.product.findMany({
         where: { companyId },
         select: { priceBase: true, currentStock: true },
       });
       inventoryValue = products.reduce((acc, item) => acc + Number(item.priceBase) * Number(item.currentStock), 0);

       if (hasLowStockPerm) {
          lowStockCount = await this.prisma.product.count({
            where: { companyId, currentStock: { lte: 10 } },
          });
          lowStockProducts = await this.prisma.product.findMany({
            where: { companyId, currentStock: { lte: 10 } },
            take: 5,
            orderBy: { currentStock: 'asc' },
          });
       }
    }

    // --- MÓDULO FINANZAS (Cuentas por cobrar y Facturas Cobradas) ---
    let accountsReceivable = 0;
    let invoicesPaidCount = 0;
    
    // Asumiremos métricas del mes actual para "Emitidas" y "Cobradas" por rendimiento
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Casting strings to SalesInvoiceStatus or ignoring to bypass type-safety errors strictly bound to generated Prisma client
    if (hasFinancePerm) {
        // Cuentas por Cobrar (Facturas PENDING o PARTIAL)
        const pendingInvoices = await this.prisma.salesInvoice.findMany({
           where: { companyId, status: { in: ['ISSUED', 'PARTIAL'] as any } },
           select: { totalAmount: true, paidAmount: true }
        });
        accountsReceivable = pendingInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) - Number(inv.paidAmount || 0)), 0);

        // Facturas Pagadas (En el mes actual)
        invoicesPaidCount = await this.prisma.salesInvoice.count({
           where: { companyId, status: 'PAID' as any, updatedAt: { gte: startOfMonth } }
        });
    }

    // --- MÓDULO VENTAS (Facturas emitidas y Estado de Cotizaciones) ---
    let invoicesIssuedCount = 0;
    const quotesStats = { sent: 0, expired: 0, accepted: 0, rejected: 0 };

    if (hasSalesPerm) {
        // Facturas Emitidas (En el mes actual, no anuladas)
        invoicesIssuedCount = await this.prisma.salesInvoice.count({
           where: {
             companyId,
             status: { not: 'VOID' as any },
             issueDate: { gte: startOfMonth }
           }
        });
        // Agrupación de cotizaciones por estado
        const quotesGrouped = await this.prisma.quote.groupBy({
           by: ['status'],
           where: { companyId },
           _count: { id: true }
        });
        
        quotesGrouped.forEach((q) => {
            if (q.status === ('ENVIADA' as any)) quotesStats.sent = q._count.id;
            if (q.status === ('VENCIDA' as any)) quotesStats.expired = q._count.id;
            if (q.status === ('ACEPTADA' as any)) quotesStats.accepted = q._count.id;
            if (q.status === ('RECHAZADA' as any)) quotesStats.rejected = q._count.id;
        });
    }

    return {
      totalProducts,
      totalUsers,
      lowStockCount,
      inventoryValue,
      lowStockProducts,
      accountsReceivable,
      invoicesIssuedCount,
      invoicesPaidCount,
      quotesStats,
    };
  }
}
