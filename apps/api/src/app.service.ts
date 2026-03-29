import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    try {
      // Intentamos una petición ultra ligera hacia Supabase
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in health check:', error);
      throw new InternalServerErrorException({
        status: 'down',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
