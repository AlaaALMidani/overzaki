/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes';
import { BadRequestException } from '@nestjs/common';
// import { join } from 'path';
// import * as express from 'express';
// Bootstrap Function
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  const port = process.env.PORT || 3000;
  app.enableCors({
    origin: ['http://localhost:3001'],
    methods: '*',
    credentials: true,
  });
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true, // Removes unknown properties
  //     forbidNonWhitelisted: true, // Throws an error if unknown properties are included
  //     transform: true, // Automatically transforms payloads to DTO instances
  //   }),
  // );
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const validationErrors = errors.reduce((result, error) => {
          result[error.property] = Object.values(error.constraints || {});
          return result;
        }, {});

        return new BadRequestException({
          validation: validationErrors, // Custom format
        });
      },
    }),
  );


  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
