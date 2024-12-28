/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// import { join } from 'path';
import * as express from 'express';
import { HttpExceptionFilter } from './http-exception.filter';
// Bootstrap Function
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/webhook', express.raw({ type: 'application/json' }));
  // app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  const port = process.env.PORT || 3000;
  app.enableCors({
    origin: ['http://localhost:3001', 'https://over-zaki0.vercel.app'],
    methods: 'GET, POST, PUT, DELETE',
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
