import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Ahora pedimos el companyId como requisito
  async getStats(companyId: string) {
    if (!companyId) {
      return { 
        totalProducts: 0, totalUsers: 0, lowStockCount: 0, 
        inventoryValue: 0, lowStockProducts: [] 
      };
    }

    // 1. Contar Productos (SOLO de esta empresa)
    const totalProducts = await this.prisma.product.count({
      where: { companyId }
    });

    // 2. Contar Usuarios (SOLO de esta empresa)
    const totalUsers = await this.prisma.user.count({
      where: { companyId }
    });

    // 3. Stock Bajo (SOLO de esta empresa)
    const lowStockCount = await this.prisma.product.count({
      where: { 
        companyId,
        currentStock: { lte: 10 } 
      },
    });

    // 4. Valor del Inventario (SOLO de esta empresa)
    const products = await this.prisma.product.findMany({
      where: { companyId },
      select: { priceBase: true, currentStock: true },
    });
    
    const inventoryValue = products.reduce((acc, item) => {
      return acc + (Number(item.priceBase) * Number(item.currentStock));
    }, 0);

    // 5. Tabla Rápida (SOLO de esta empresa)
    const lowStockProducts = await this.prisma.product.findMany({
      where: { 
        companyId,
        currentStock: { lte: 10 } 
      },
      take: 5,
      orderBy: { currentStock: 'asc' },
    });

    return {
      totalProducts,
      totalUsers,
      lowStockCount,
      inventoryValue,
      lowStockProducts
    };
  }
}