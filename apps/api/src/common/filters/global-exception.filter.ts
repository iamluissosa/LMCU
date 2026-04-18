import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Type guard for Prisma errors
function isPrismaClientKnownRequestError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    ((error as Record<string, unknown>).code as string).startsWith('P')
  );
}

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
        message =
          typeof payload.message === 'string'
            ? payload.message
            : JSON.stringify(payload.message || exception.message);
        code =
          typeof payload.error === 'string'
            ? payload.error
            : JSON.stringify(payload.error || 'HTTP_ERROR');
      } else {
        message = exception.message;
      }
    } else if (isPrismaClientKnownRequestError(exception)) {
      // Manejo de errores de Prisma
      const prismaError = exception as Record<string, unknown>;
      const prismaCode = prismaError.code as string;

      if (prismaCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Unique constraint failed. Recurso duplicado.';
        code = 'DUPLICATE_ENTRY';
      } else if (prismaCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found. Recurso no encontrado.';
        code = 'NOT_FOUND';
      } else if (prismaCode === 'P2003') {
        status = HttpStatus.CONFLICT;
        message =
          'Foreign key constraint failed. No se puede eliminar el recurso porque está relacionado con otros datos.';
        code = 'FOREIGN_KEY_CONSTRAINT';
      } else {
        // Otros errores de Prisma
        status = HttpStatus.BAD_REQUEST;
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
