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
    let accountsReceivable = 0;
    let invoicesPaidCount = 0;
    let invoicesIssuedCount = 0;
    const quotesStats = { sent: 0, expired: 0, accepted: 0, rejected: 0 };
    
    // Asumiremos métricas del mes actual para "Emitidas" y "Cobradas" por rendimiento
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Ejecución concurrente usando Promise.all para reducir el tiempo de carga
    const [
      totalProductsResult,
      productsResult,
      lowStockCountResult,
      lowStockProductsResult,
      pendingInvoicesResult,
      invoicesPaidCountResult,
      invoicesIssuedCountResult,
      quotesGroupedResult
    ] = await Promise.all([
      (hasInventoryPerm || hasLowStockPerm) ? this.prisma.product.count({ where: { companyId } }) : Promise.resolve(0),
      hasInventoryPerm ? this.prisma.product.findMany({ where: { companyId }, select: { priceBase: true, currentStock: true } }) : Promise.resolve([] as any[]),
      hasLowStockPerm ? this.prisma.product.count({ where: { companyId, currentStock: { lte: 10 } } }) : Promise.resolve(0),
      hasLowStockPerm ? this.prisma.product.findMany({ where: { companyId, currentStock: { lte: 10 } }, take: 5, orderBy: { currentStock: 'asc' } }) : Promise.resolve([] as any[]),
      hasFinancePerm ? this.prisma.salesInvoice.findMany({ where: { companyId, status: { in: ['ISSUED', 'PARTIAL'] as any } }, select: { totalAmount: true, paidAmount: true } }) : Promise.resolve([] as any[]),
      hasFinancePerm ? this.prisma.salesInvoice.count({ where: { companyId, status: 'PAID' as any, updatedAt: { gte: startOfMonth } } }) : Promise.resolve(0),
      hasSalesPerm ? this.prisma.salesInvoice.count({ where: { companyId, status: { not: 'VOID' as any }, issueDate: { gte: startOfMonth } } }) : Promise.resolve(0),
      hasSalesPerm ? this.prisma.quote.groupBy({ by: ['status'], where: { companyId }, _count: { id: true } }) : Promise.resolve([] as any[])
    ]);

    totalProducts = totalProductsResult;
    inventoryValue = productsResult.reduce((acc: number, item: any) => acc + Number(item.priceBase) * Number(item.currentStock), 0);
    lowStockCount = lowStockCountResult;
    lowStockProducts = lowStockProductsResult;
    accountsReceivable = pendingInvoicesResult.reduce((acc: number, inv: any) => acc + (Number(inv.totalAmount) - Number(inv.paidAmount || 0)), 0);
    invoicesPaidCount = invoicesPaidCountResult;
    invoicesIssuedCount = invoicesIssuedCountResult;

    quotesGroupedResult.forEach((q: any) => {
        if (q.status === 'ENVIADA') quotesStats.sent = q._count.id;
        if (q.status === 'VENCIDA') quotesStats.expired = q._count.id;
        if (q.status === 'ACEPTADA') quotesStats.accepted = q._count.id;
        if (q.status === 'RECHAZADA') quotesStats.rejected = q._count.id;
    });

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
