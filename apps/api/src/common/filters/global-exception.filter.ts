import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        message = typeof payload.message === 'string'
          ? payload.message
          : JSON.stringify(payload.message || exception.message);
        code = typeof payload.error === 'string' 
          ? payload.error 
          : JSON.stringify(payload.error || 'HTTP_ERROR');
      } else {
        message = exception.message;
      }
    } else if (
      // @ts-expect-error Prisma types might be missing due to generation failure
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      // Manejo de errores de Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaError = exception as any;
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Unique constraint failed. Recurso duplicado.';
        code = 'DUPLICATE_ENTRY';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found. Recurso no encontrado.';
        code = 'NOT_FOUND';
      } else {
        // Otros errores de Prisma
        status = HttpStatus.BAD_REQUEST;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message = `Database error: ${prismaError.message}`;
        code = 'DB_ERROR';
      }
    }

    // Log del error (solo para errores internos o no controlados explícitamente)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Error processing request ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `Handled error ${request.method} ${request.url}: ${message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code,
    });
  }
}
