// src/shared/app-store-utils.ts
import gplay from 'google-play-scraper';
import * as appStoreScraper from 'app-store-scraper';
import { Injectable, Logger } from '@nestjs/common'; 

export class AppStoreUtils {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private async getAppleAppStoreId(
    appName: string,
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      const results = await appStoreScraper.search({
        term: appName,
        num: 10,
      });

      const apps = [];

      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          apps.push({
            appId: results[i].id,
            title: results[i].title,
            icon: results[i].icon,
          });
        }
        return apps;
      } else {
        this.logger.warn(
          `No results found for app name: ${appName} in Apple App Store`,
        );
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
      const results = await gplay.search({
        term: appName,
        num: 10,
      });

      const apps = [];

      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          apps.push({
            appId: results[i].appId,
            title: results[i].title,
            icon: results[i].icon,
          });
        }
        return apps;
      } else {
        this.logger.warn(
          `No results found for app name: ${appName} in Google Play Store`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching Google Play app ID:', error.message);
      throw new Error(`Failed to fetch Google Play app ID: ${error.message}`);
    }
  }

  async getAppId(
    appName: string,
    store: 'google' | 'apple',
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      if (store === 'google') {
        return await this.getGooglePlayAppId(appName);
      } else if (store === 'apple') {
        return await this.getAppleAppStoreId(appName);
      } else {
        throw new Error('Invalid store parameter. Use "google" or "apple".');
      }
    } catch (error) {
      this.logger.error('Error fetching app ID:', error.message);
      throw new Error(`Failed to fetch app ID: ${error.message}`);
    }
  }
}