import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import * as multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { extname } from 'path';

@Injectable()
export class VideoValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(VideoValidationMiddleware.name);

  private upload = multer({
    limits: { fileSize: 500 * 1024 * 1024 }, 
    fileFilter: (req, file, callback) => {
      const allowedMimeTypes = ['video/mp4', 'video/avi', 'video/mov'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        req['fileValidationError'] = 'Invalid video format. Allowed formats are MP4, AVI, MOV.';
        return callback(null, false);
      }
      callback(null, true);
    },
    
    storage: multer.diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }).single('videoFile');

  use(req: Request, res: Response, next: NextFunction) {
    this.upload(req, res, (err) => {
      if (err) {
        this.logger.error('File upload error:', err.message);
        throw new BadRequestException(err.message || 'Invalid file upload');
      }

      if (req['fileValidationError']) {
        throw new BadRequestException(req['fileValidationError']);
      }

      next();
    });
  }
}
