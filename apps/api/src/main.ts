import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtro Global de Excepciones
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Interceptor Global de Transformación
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS dinámico: permite el frontend web + apps móviles nativas (sin header Origin)
  app.enableCors({
    origin: (origin, callback) => {
      // En desarrollo, aceptar cualquier origen
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // Orígenes permitidos: CORS_ALLOWED_ORIGINS (comma-separated) o FRONTEND_URL como fallback
      const allowedOrigins = (
        process.env.CORS_ALLOWED_ORIGINS ||
        process.env.FRONTEND_URL ||
        ''
      )
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      // Apps nativas (React Native) envían requests sin header Origin → permitir
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
