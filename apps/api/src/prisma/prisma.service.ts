import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // Número máximo de reintentos en la conexión inicial
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000; // 2s base (backoff exponencial)

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Conexión con reintentos y backoff exponencial.
   * Maneja cold starts de Render Free Tier donde la primera conexión
   * puede fallar por timeout mientras PgBouncer/Supavisor se estabiliza.
   */
  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Conexión a la base de datos establecida');
    } catch (error) {
      const isLastAttempt = attempt >= this.MAX_RETRIES;

      this.logger.warn(
        `⚠️  Intento ${attempt}/${this.MAX_RETRIES} de conexión falló: ${(error as Error).message}`,
      );

      if (isLastAttempt) {
        this.logger.error(
          '❌ No se pudo conectar a la base de datos después de todos los reintentos',
        );
        throw error;
      }

      // Backoff exponencial: 2s, 4s, 8s...
      const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      this.logger.log(`⏳ Reintentando en ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.connectWithRetry(attempt + 1);
    }
  }
}
