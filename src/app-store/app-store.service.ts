import { Injectable, Logger } from '@nestjs/common';
import * as appStoreScraper from 'app-store-scraper';
import gplay from 'google-play-scraper';

@Injectable()
export class AppStoreService {
  private readonly logger = new Logger(AppStoreService.name);

  private async getAppleAppStoreId(
    appName: string,
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      const results = await appStoreScraper.search({ term: appName, num: 10 });

      if (results.length > 0) {
        return results.map((app) => ({
          appId: app.id,
          title: app.title,
          icon: app.icon,
        }));
      } else {
        this.logger.warn(`No results found for app: ${appName} in Apple App Store`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching Apple App Store ID:', error.message);
      throw new Error(`Failed to fetch Apple App Store ID: ${error.message}`);
    }
  }

  private async getGooglePlayAppId(
    appName: string,
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      const results = await gplay.search({ term: appName, num: 10 });

      if (results.length > 0) {
        return results.map((app) => ({
          appId: app.appId,
          title: app.title,
          icon: app.icon,
        }));
      } else {
        this.logger.warn(`No results found for app: ${appName} in Google Play Store`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching Google Play App ID:', error.message);
      throw new Error(`Failed to fetch Google Play App ID: ${error.message}`);
    }
  }

  async getAppId(
    appName: string,
    store: 'google' | 'apple',
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    if (!appName || !store) {
      throw new Error('Both appName and store parameters are required.');
    }

    try {
      return store === 'google'
        ? await this.getGooglePlayAppId(appName)
        : await this.getAppleAppStoreId(appName);
    } catch (error) {
      this.logger.error('Error fetching app ID:', error.message);
      throw new Error(`Failed to fetch app ID: ${error.message}`);
    }
  }
}
