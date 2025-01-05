/* eslint-disable prettier/prettier */
import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('privacy-policy')
  getPrivacyPolicy(@Res() res: Response): void {
    const filePath = path.join(__dirname,  'privacy-policy.html'); // Ensure the path is correct
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.status(500).send('Error reading privacy policy file.');
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
      }
    });
  }
}
