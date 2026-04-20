import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(companyId: string, userPermissions: string[] = []) {
    try {
      if (!companyId) {
        return this.emptyStats();
      }

      // ── Guard de permisos ─────────────────────────────────────────────────
      const hasInventoryPerm  = userPermissions.includes('widget.inventory.view') || userPermissions.includes('inventory.view');
      const hasLowStockPerm   = userPermissions.includes('widget.low_stock.view');
      const hasSalesPerm      = userPermissions.includes('widget.sales.view');
      const hasFinancePerm    = userPermissions.includes('widget.finance.view');
      const hasEventsPerm     = userPermissions.includes('widget.events.view') || userPermissions.includes('events.view');
      const hasCommissionPerm = userPermissions.includes('widget.commissions.view') || userPermissions.includes('commissions.view');

      // ── Rangos de fecha ───────────────────────────────────────────────────
      const now = new Date();

      // Mes actual
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Mes anterior (para tendencias)
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Próximos 7 días (facturas por vencer)
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Últimas 8 semanas para sparkline
      const startOf8Weeks = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

      // Mes y año fiscales actuales (para comisiones)
      const currentFiscalMonth = now.getMonth() + 1;
      const currentFiscalYear  = now.getFullYear();

      // ── Consultas en paralelo ─────────────────────────────────────────────
      const [
        // ---------- Usuarios ----------
        totalUsers,

        // ---------- Inventario ----------
        totalProductsResult,
        productsResult,
        lowStockCountResult,
        lowStockProductsResult,

        // ---------- Eventos ----------
        eventsTotalResult,
        eventsActiveResult,
        eventsCompletedResult,
        eventsMonthResult,
        eventsIncomeResult,

        // ---------- Tesorería (CxC) ----------
        pendingInvoicesResult,
        invoicesPaidCountResult,
        invoicesIssuedCountResult,

        // ---------- Ventas: monto facturado ----------
        monthlySalesRawResult,
        prevMonthlySalesRawResult,

        // ---------- Ventas: cobros recibidos ----------
        monthlyCollectedResult,
        prevMonthlyCollectedResult,

        // ---------- Ventas: pipeline ----------
        quotesGroupedResult,
        salesOrdersPendingResult,

        // ---------- Top 5 clientes del mes ----------
        topClientsResult,

        // ---------- Compras: CxP ----------
        pendingBillsResult,

        // ---------- Compras: facturas por vencer (7d) ----------
        dueSoonBillsResult,

        // ---------- Compras: egresos del mes ----------
        monthlyPaymentsOutResult,
        prevMonthlyPaymentsOutResult,

        // ---------- Compras: OC abiertas ----------
        openPOsResult,

        // ---------- Comisiones del mes ----------
        commissionsEarnedMonthResult,
        commissionsSaldoResult,

        // ---------- Top vendedores del mes ----------
        topSalespersonsResult,

        // ---------- Sparkline: ventas por semana ----------
        weeklySalesResult,

      ] = await Promise.all([

        // Usuarios
        this.prisma.user.count({ where: { companyId } }),

        // ── Inventario ────────────────────────────────────────────────────
        (hasInventoryPerm || hasLowStockPerm)
          ? this.prisma.product.count({ where: { companyId } })
          : Promise.resolve(0),

        hasInventoryPerm
          ? this.prisma.product.findMany({ where: { companyId }, select: { priceBase: true, currentStock: true } })
          : Promise.resolve([] as any[]),

        hasLowStockPerm
          ? this.prisma.product.count({ where: { companyId, currentStock: { lte: 10 } } })
          : Promise.resolve(0),

        hasLowStockPerm
          ? this.prisma.product.findMany({
              where: { companyId, currentStock: { lte: 10 } },
              take: 5,
              orderBy: { currentStock: 'asc' },
            })
          : Promise.resolve([] as any[]),

        // ── Eventos ──────────────────────────────────────────────────────
        hasEventsPerm ? this.prisma.event.count({ where: { companyId } }) : Promise.resolve(0),
        hasEventsPerm ? this.prisma.event.count({ where: { companyId, status: 'ACTIVE' } }) : Promise.resolve(0),
        hasEventsPerm ? this.prisma.event.count({ where: { companyId, status: 'COMPLETED' } }) : Promise.resolve(0),
        hasEventsPerm ? this.prisma.event.count({ where: { companyId, date: { gte: startOfMonth } } }) : Promise.resolve(0),
        hasEventsPerm
          ? this.prisma.incomeEventDetail.aggregate({
              _sum: { amountApplied: true },
              where: { event: { companyId, status: 'ACTIVE' } },
            })
          : Promise.resolve({ _sum: { amountApplied: 0 } }),

        // ── Tesorería: CxC ───────────────────────────────────────────────
        hasFinancePerm
          ? this.prisma.salesInvoice.findMany({
              where: { companyId, status: { in: ['ISSUED', 'PARTIAL'] as any } },
              select: { totalAmount: true, paidAmount: true },
            })
          : Promise.resolve([] as any[]),

        hasFinancePerm
          ? this.prisma.salesInvoice.count({
              where: { companyId, status: 'PAID' as any, updatedAt: { gte: startOfMonth } },
            })
          : Promise.resolve(0),

        hasSalesPerm
          ? this.prisma.salesInvoice.count({
              where: { companyId, status: { not: 'VOID' as any }, issueDate: { gte: startOfMonth } },
            })
          : Promise.resolve(0),

        // ── Ventas: monto facturado mes actual ───────────────────────────
        hasSalesPerm
          ? this.prisma.salesInvoice.aggregate({
              _sum: { totalAmount: true },
              where: { companyId, status: { not: 'VOID' as any }, issueDate: { gte: startOfMonth } },
            })
          : Promise.resolve({ _sum: { totalAmount: 0 } }),

        // Ventas mes anterior (para delta %)
        hasSalesPerm
          ? this.prisma.salesInvoice.aggregate({
              _sum: { totalAmount: true },
              where: {
                companyId,
                status: { not: 'VOID' as any },
                issueDate: { gte: startOfPrevMonth, lte: endOfPrevMonth },
              },
            })
          : Promise.resolve({ _sum: { totalAmount: 0 } }),

        // ── Ventas: cobros recibidos (PaymentIn) ──────────────────────────
        hasSalesPerm
          ? this.prisma.paymentIn.aggregate({
              _sum: { amountReceived: true },
              where: { companyId, paymentDate: { gte: startOfMonth } },
            })
          : Promise.resolve({ _sum: { amountReceived: 0 } }),

        hasSalesPerm
          ? this.prisma.paymentIn.aggregate({
              _sum: { amountReceived: true },
              where: { companyId, paymentDate: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
            })
          : Promise.resolve({ _sum: { amountReceived: 0 } }),

        // ── Pipeline de cotizaciones ─────────────────────────────────────
        hasSalesPerm
          ? this.prisma.quote.groupBy({ by: ['status'], where: { companyId }, _count: { id: true } })
          : Promise.resolve([] as any[]),

        // Órdenes de venta pendientes de facturar
        hasSalesPerm
          ? this.prisma.salesOrder.count({
              where: { companyId, status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as any } },
            })
          : Promise.resolve(0),

        // ── Top 5 clientes del mes por monto facturado ────────────────────
        hasSalesPerm
          ? this.prisma.salesInvoice.groupBy({
              by: ['clientId'],
              where: { companyId, status: { not: 'VOID' as any }, issueDate: { gte: startOfMonth } },
              _sum: { totalAmount: true },
              orderBy: { _sum: { totalAmount: 'desc' } },
              take: 5,
            })
          : Promise.resolve([] as any[]),

        // ── Compras: CxP (Cuentas por Pagar) ────────────────────────────
        hasFinancePerm
          ? this.prisma.purchaseBill.findMany({
              where: { companyId, status: { in: ['UNPAID', 'PARTIAL'] as any } },
              select: { totalAmount: true, paidAmount: true },
            })
          : Promise.resolve([] as any[]),

        // Facturas por vencer en los próximos 7 días
        hasFinancePerm
          ? this.prisma.purchaseBill.count({
              where: {
                companyId,
                status: { in: ['UNPAID', 'PARTIAL'] as any },
                dueDate: { gte: now, lte: in7Days },
              },
            })
          : Promise.resolve(0),

        // Egresos del mes actual
        hasFinancePerm
          ? this.prisma.paymentOut.aggregate({
              _sum: { amountPaid: true },
              where: { companyId, paymentDate: { gte: startOfMonth } },
            })
          : Promise.resolve({ _sum: { amountPaid: 0 } }),

        // Egresos mes anterior (para delta %)
        hasFinancePerm
          ? this.prisma.paymentOut.aggregate({
              _sum: { amountPaid: true },
              where: { companyId, paymentDate: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
            })
          : Promise.resolve({ _sum: { amountPaid: 0 } }),

        // Órdenes de compra abiertas
        hasFinancePerm
          ? this.prisma.purchaseOrder.count({
              where: { companyId, status: { in: ['OPEN', 'PARTIALLY_RECEIVED'] as any } },
            })
          : Promise.resolve(0),

        // ── Comisiones: generadas este mes ───────────────────────────────
        hasCommissionPerm
          ? this.prisma.commissionLedger.aggregate({
              _sum: { amount: true },
              where: {
                companyId,
                type: 'EARNED' as any,
                fiscalMonth: currentFiscalMonth,
                fiscalYear: currentFiscalYear,
              },
            })
          : Promise.resolve({ _sum: { amount: 0 } }),

        // Saldo total pendiente por pagar (EARNED + ADJUSTMENT de todos los tiempos)
        hasCommissionPerm
          ? this.prisma.commissionLedger.groupBy({
              by: ['type'],
              where: { companyId },
              _sum: { amount: true },
            })
          : Promise.resolve([] as any[]),

        // Top vendedores del mes
        hasCommissionPerm
          ? this.prisma.commissionLedger.groupBy({
              by: ['salespersonId'],
              where: {
                companyId,
                type: 'EARNED' as any,
                fiscalMonth: currentFiscalMonth,
                fiscalYear: currentFiscalYear,
              },
              _sum: { amount: true },
              orderBy: { _sum: { amount: 'desc' } },
              take: 5,
            })
          : Promise.resolve([] as any[]),

        // ── Sparkline de ventas semanales (últimas 8 semanas) ────────────
        hasSalesPerm
          ? this.prisma.salesInvoice.findMany({
              where: { companyId, status: { not: 'VOID' as any }, issueDate: { gte: startOf8Weeks } },
              select: { issueDate: true, totalAmount: true },
            })
          : Promise.resolve([] as any[]),
      ]);

      // ── Cálculos derivados ────────────────────────────────────────────────

      // Inventario
      const totalProducts  = totalProductsResult;
      const inventoryValue = productsResult.reduce(
        (acc: number, item: any) => acc + Number(item.priceBase) * Number(item.currentStock), 0
      );
      const lowStockCount    = lowStockCountResult;
      const lowStockProducts = lowStockProductsResult;

      // Eventos
      const eventsStats = {
        totalCount:        eventsTotalResult,
        activeCount:       eventsActiveResult,
        completedCount:    eventsCompletedResult,
        thisMonthCount:    eventsMonthResult,
        activeEventsIncome: Number(eventsIncomeResult._sum.amountApplied || 0),
      };

      // Tesorería CxC
      const accountsReceivable = pendingInvoicesResult.reduce(
        (acc: number, inv: any) => acc + (Number(inv.totalAmount) - Number(inv.paidAmount || 0)), 0
      );
      const invoicesPaidCount   = invoicesPaidCountResult;
      const invoicesIssuedCount = invoicesIssuedCountResult;

      // Cotizaciones
      const quotesStats = { sent: 0, expired: 0, accepted: 0, rejected: 0, total: 0 };
      quotesGroupedResult.forEach((q: any) => {
        if (q.status === 'SENT')     quotesStats.sent     = q._count.id;
        if (q.status === 'EXPIRED')  quotesStats.expired  = q._count.id;
        if (q.status === 'ACCEPTED') quotesStats.accepted = q._count.id;
        if (q.status === 'REJECTED') quotesStats.rejected = q._count.id;
        quotesStats.total += q._count.id;
      });
      const conversionRate = quotesStats.total > 0
        ? Math.round((quotesStats.accepted / quotesStats.total) * 100)
        : 0;

      // Ventas del mes
      const monthlySalesAmount     = Number(monthlySalesRawResult._sum.totalAmount || 0);
      const prevMonthlySalesAmount = Number(prevMonthlySalesRawResult._sum.totalAmount || 0);
      const salesDelta = prevMonthlySalesAmount > 0
        ? Math.round(((monthlySalesAmount - prevMonthlySalesAmount) / prevMonthlySalesAmount) * 100)
        : null;

      // Cobros del mes
      const monthlyCollectedAmount     = Number(monthlyCollectedResult._sum.amountReceived || 0);
      const prevMonthlyCollectedAmount = Number(prevMonthlyCollectedResult._sum.amountReceived || 0);
      const collectedDelta = prevMonthlyCollectedAmount > 0
        ? Math.round(((monthlyCollectedAmount - prevMonthlyCollectedAmount) / prevMonthlyCollectedAmount) * 100)
        : null;

      // Top clientes (necesitamos los nombres — segunda consulta rápida)
      let topClients: { clientId: string; name: string; amount: number }[] = [];
      if (topClientsResult.length > 0) {
        const clientIds = topClientsResult.map((r: any) => r.clientId);
        const clientsData = await this.prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true },
        });
        const clientMap = new Map(clientsData.map((c: any) => [c.id, c.name]));
        topClients = topClientsResult.map((r: any) => ({
          clientId: r.clientId,
          name:     clientMap.get(r.clientId) || 'Cliente sin nombre',
          amount:   Number(r._sum.totalAmount || 0),
        }));
      }

      // Compras: CxP
      const accountsPayable = pendingBillsResult.reduce(
        (acc: number, b: any) => acc + (Number(b.totalAmount) - Number(b.paidAmount || 0)), 0
      );
      const dueSoonBillsCount      = dueSoonBillsResult;
      const openPurchaseOrdersCount = openPOsResult;

      // Egresos del mes
      const monthlyPaymentsOut     = Number(monthlyPaymentsOutResult._sum.amountPaid || 0);
      const prevMonthlyPaymentsOut = Number(prevMonthlyPaymentsOutResult._sum.amountPaid || 0);
      const paymentsDelta = prevMonthlyPaymentsOut > 0
        ? Math.round(((monthlyPaymentsOut - prevMonthlyPaymentsOut) / prevMonthlyPaymentsOut) * 100)
        : null;

      // Balance del mes
      const monthlyBalance = monthlyCollectedAmount - monthlyPaymentsOut;

      // Ratio CxC / CxP (liquidez simple)
      const liquidityRatio = accountsPayable > 0
        ? Math.round((accountsReceivable / accountsPayable) * 100) / 100
        : null;

      // Comisiones
      const commissionsEarnedMonth = Number(commissionsEarnedMonthResult._sum.amount || 0);
      let commissionsTotalEarned = 0;
      let commissionsTotalAdjustment = 0;
      commissionsSaldoResult.forEach((g: any) => {
        if (g.type === 'EARNED')     commissionsTotalEarned     += Number(g._sum.amount || 0);
        if (g.type === 'ADJUSTMENT') commissionsTotalAdjustment += Number(g._sum.amount || 0);
      });
      const commissionsPendingBalance = commissionsTotalEarned + commissionsTotalAdjustment; // adjustment ya es negativo

      // Top vendedores (necesitamos nombres)
      let topSalespersons: { salespersonId: string; name: string; amount: number }[] = [];
      if (topSalespersonsResult.length > 0) {
        const spIds = topSalespersonsResult.map((r: any) => r.salespersonId);
        const spData = await this.prisma.user.findMany({
          where: { id: { in: spIds } },
          select: { id: true, name: true, email: true },
        });
        const spMap = new Map(spData.map((u: any) => [u.id, u.name || u.email]));
        topSalespersons = topSalespersonsResult.map((r: any) => ({
          salespersonId: r.salespersonId,
          name:          spMap.get(r.salespersonId) || 'Vendedor',
          amount:        Number(r._sum.amount || 0),
        }));
      }

      // Sparkline: agrupar por semana (ISO week number relativo)
      const weeklyMap = new Map<string, number>();
      weeklySalesResult.forEach((inv: any) => {
        const d = new Date(inv.issueDate);
        // Obtener el lunes de la semana
        const day  = d.getDay(); // 0=Dom, 1=Lun
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const key = `${monday.getFullYear()}-W${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        weeklyMap.set(key, (weeklyMap.get(key) || 0) + Number(inv.totalAmount));
      });
      const weeklySales = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, total]) => ({ week, total }));

      return {
        // ── Existentes ────────────────────────────────────────────────
        totalProducts,
        totalUsers,
        lowStockCount,
        inventoryValue,
        lowStockProducts,
        accountsReceivable,
        invoicesIssuedCount,
        invoicesPaidCount,
        quotesStats,
        eventsStats,
        // ── NUEVOS: Ventas ────────────────────────────────────────────
        salesStats: {
          monthlySalesAmount,
          salesDelta,
          monthlyCollectedAmount,
          collectedDelta,
          salesOrdersPending: salesOrdersPendingResult,
          conversionRate,
          topClients,
        },
        // ── NUEVOS: Compras / Tesorería ───────────────────────────────
        purchaseStats: {
          accountsPayable,
          dueSoonBillsCount,
          monthlyPaymentsOut,
          paymentsDelta,
          openPurchaseOrdersCount,
        },
        // ── NUEVOS: Comisiones ────────────────────────────────────────
        commissionsStats: {
          earnedThisMonth:    commissionsEarnedMonth,
          pendingBalance:     commissionsPendingBalance,
          topSalespersons,
        },
        // ── NUEVOS: Balance global ─────────────────────────────────────
        financialSummary: {
          monthlyBalance,
          liquidityRatio,
        },
        // ── NUEVOS: Sparkline ─────────────────────────────────────────
        weeklySales,
      };
    } catch (error) {
      console.error('SERVER ERROR IN GET STATS:', error);
      throw error;
    }
  }

  // ── Helper: estado vacío por defecto ──────────────────────────────────────
  private emptyStats() {
    return {
      totalProducts: 0,
      totalUsers: 0,
      lowStockCount: 0,
      inventoryValue: 0,
      lowStockProducts: [],
      accountsReceivable: 0,
      invoicesIssuedCount: 0,
      invoicesPaidCount: 0,
      quotesStats: { sent: 0, expired: 0, accepted: 0, rejected: 0, total: 0 },
      eventsStats: { totalCount: 0, activeCount: 0, completedCount: 0, thisMonthCount: 0, activeEventsIncome: 0 },
      salesStats: {
        monthlySalesAmount: 0, salesDelta: null, monthlyCollectedAmount: 0,
        collectedDelta: null, salesOrdersPending: 0, conversionRate: 0, topClients: [],
      },
      purchaseStats: {
        accountsPayable: 0, dueSoonBillsCount: 0,
        monthlyPaymentsOut: 0, paymentsDelta: null, openPurchaseOrdersCount: 0,
      },
      commissionsStats: { earnedThisMonth: 0, pendingBalance: 0, topSalespersons: [] },
      financialSummary: { monthlyBalance: 0, liquidityRatio: null },
      weeklySales: [],
    };
  }
}
