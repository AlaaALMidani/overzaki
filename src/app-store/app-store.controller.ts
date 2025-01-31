import { Controller, Get, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppStoreService } from './app-store.service';

@Controller('app-store')
export class AppStoreController {
  private readonly logger = new Logger(AppStoreController.name);

  constructor(private readonly appStoreService: AppStoreService) {}

  @Get('app-id')
  async getAppId(
    @Query('appName') appName: string,
    @Query('store') store: 'google' | 'apple',
  ) {
    this.logger.log(`Fetching app ID for: ${appName} from store: ${store}`);

    if (!appName || !store) {
      throw new HttpException('Both appName and store query parameters are required.', HttpStatus.BAD_REQUEST);
    }

    if (!['google', 'apple'].includes(store)) {
      throw new HttpException('Invalid store parameter. Use "google" or "apple".', HttpStatus.BAD_REQUEST);
    }

    try {
      const appId = await this.appStoreService.getAppId(appName, store);
      return { appId };
    } catch (error) {
      this.logger.error('Error fetching app ID:', error.message);
      throw new HttpException(error.message || 'Failed to fetch app ID', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
