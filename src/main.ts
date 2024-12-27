/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// import { join } from 'path';
import * as express from 'express';
// Bootstrap Function
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/webhook', express.raw({ type: 'application/json' }));
  // app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  const port = process.env.PORT || 3000;
  app.enableCors({
    // origin: ['http://localhost:3001', 'https://over-zaki0.vercel.app/'],
    origin: ['*'],
    methods: '*',
    credentials: true,
  });
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
