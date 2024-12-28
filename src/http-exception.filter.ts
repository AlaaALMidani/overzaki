import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    let formattedErrors = {};
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      formattedErrors = this.formatValidationErrors(exceptionResponse.message);
    }

    response.status(status).json({
      status,
      ok: false,
      validation: formattedErrors,
    });
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string> {
    const formatted = {};
    errors.forEach((error) => {
      if (error.constraints) {
        formatted[error.property] = Object.values(error.constraints)[0];
      }
    });
    return formatted;
  }
}
