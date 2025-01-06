/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';

@Injectable()
export class GoogleCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly logger = new Logger(GoogleCampaignService.name);

  constructor() {
    this.validateEnvVariables();

    const googleAdsApi = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    this.googleAdsClient = googleAdsApi.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });
  }

  private validateEnvVariables() {
    const requiredEnvVars = [
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_CUSTOMER_ID',
      'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
      'GOOGLE_ADS_REFRESH_TOKEN',
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`);
      }
    }
  }

  async createFullSearchAd(params: {
    campaignName: string;
    budgetAmount: number;
    startDate: string;
    endDate: string;
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    path1?: string;
    path2?: string;
    sitelinks?: { text: string; finalUrl: string }[];
    callouts?: string[];
    phoneNumber?: string;
    location?: {
      streetAddress: string;
      city: string;
      country: string;
      postalCode: string;
    };
    promotions?: { discount: string; finalUrl: string }[];
    ageRanges?: string[];
    languages?: string[];
  }): Promise<any> {
    try {
      const {
        campaignName,
        budgetAmount,
        startDate,
        endDate,
        headlines,
        descriptions,
        finalUrl,
        path1 = '',
        path2 = '',
        sitelinks = [],
        callouts = [],
        phoneNumber,
        location,
        promotions = [],
        ageRanges = [],
        languages = [],
      } = params;

      const budgetResourceName = await this.createCampaignBudget(campaignName, budgetAmount);
      const campaignResourceName = await this.createCampaign(campaignName, budgetResourceName, startDate, endDate);

      if (languages.length) {
        await this.addLanguageTargeting(campaignResourceName, languages);
      }

      if (ageRanges && ageRanges.length) {
        await this.addAgeTargeting(campaignResourceName, ageRanges);
      }

      const adGroupResourceName = await this.createAdGroup(campaignName, campaignResourceName);
      await this.createAd(adGroupResourceName, finalUrl, headlines, descriptions, path1, path2);
      await this.addExtensions(campaignResourceName, sitelinks, callouts, phoneNumber, location, promotions);

      return {
        message: 'Search Ad created successfully',
        data: {
          campaignBudget: budgetResourceName,
          campaign: campaignResourceName,
          adGroup: adGroupResourceName,
        },
      };
    } catch (error: any) {
      this.logger.error('Error creating Search Ad:', error);
      throw new HttpException(
        {
          message: 'Failed to create Search Ad',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createCampaignBudget(campaignName: string, budgetAmount: number): Promise<string> {
    const response = await this.googleAdsClient.campaignBudgets.create([
      {
        name: `${campaignName}_Budget`,
        amount_micros: budgetAmount * 1_000_000,
        delivery_method: 'STANDARD',
      },
    ]);

    const budgetResourceName = response.results?.[0]?.resource_name;
    if (!budgetResourceName) throw new Error('Failed to create campaign budget.');
    return budgetResourceName;
  }

  private async createCampaign(
    campaignName: string,
    budgetResourceName: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const response = await this.googleAdsClient.campaigns.create([
      {
        name: campaignName,
        status: 'PAUSED',
        advertising_channel_type: 'SEARCH',
        manual_cpc: {},
        campaign_budget: budgetResourceName,
        start_date: startDate.replace(/-/g, ''),
        end_date: endDate.replace(/-/g, ''),
      },
    ]);

    const campaignResourceName = response.results?.[0]?.resource_name;
    if (!campaignResourceName) throw new Error('Failed to create campaign.');
    return campaignResourceName;
  }

  private async createAdGroup(campaignName: string, campaignResourceName: string): Promise<string> {
    const response = await this.googleAdsClient.adGroups.create([
      {
        name: `${campaignName}_AdGroup`,
        campaign: campaignResourceName,
        type: 'SEARCH_STANDARD',
        status: 'ENABLED',
      },
    ]);

    const adGroupResourceName = response.results?.[0]?.resource_name;
    if (!adGroupResourceName) throw new Error('Failed to create ad group.');
    return adGroupResourceName;
  }

  private async createAd(
    adGroupResourceName: string,
    finalUrl: string,
    headlines: string[],
    descriptions: string[],
    path1: string,
    path2: string,
  ) {
    await this.googleAdsClient.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        ad: {
          final_urls: [finalUrl],
          responsive_search_ad: {
            headlines: headlines.map((headline) => ({
              text: headline,
            })),
            descriptions: descriptions.map((description) => ({
              text: description,
            })),
            path1,
            path2,
          },
        },
      },
    ]);
  }

  private async addAgeTargeting(campaignResourceName: string, ageRanges: string[]) {
    const ageTargets = ageRanges.map(age => ({
      campaign: campaignResourceName,
      criterion: {
        age_range: {
          type: age,
        },
      },
    }));

    await this.googleAdsClient.campaignCriteria.create(ageTargets);
  }

  private async addLanguageTargeting(campaignResourceName: string, languages: string[]) {
    const languageTargets = languages.map(language => ({
      campaign: campaignResourceName,
      criterion: {
        language: {
          language_id: this.getLanguageId(language),
        },
      },
    }));

    await this.googleAdsClient.campaignCriteria.create(languageTargets);
  }

  private getLanguageId(language: string): number {
    const languageIds: { [key: string]: number } = {
      'en': 1000,
      'ar': 1025,
    };

    return languageIds[language] || 1000;
  }

  private async addExtensions(
    campaignResourceName: string,
    sitelinks: { text: string; finalUrl: string }[],
    callouts: string[],
    phoneNumber?: string,
    location?: { streetAddress: string; city: string; country: string; postalCode: string },
    promotions: { discount: string; finalUrl: string }[] = [],
  ) {
    const operations: any[] = [];

    if (sitelinks.length) {
      operations.push({
        create: {
          campaign: campaignResourceName,
          extension_type: 'SITELINK',
          sitelink_extension: sitelinks.map((sitelink) => ({
            link_text: sitelink.text,
            final_urls: [sitelink.finalUrl],
          })),
        },
      });
    }

    if (callouts.length) {
      operations.push({
        create: {
          campaign: campaignResourceName,
          extension_type: 'CALLOUT',
          callout_extension: {
            callouts: callouts.map((callout) => ({ text: callout })),
          },
        },
      });
    }

    if (phoneNumber) {
      operations.push({
        create: {
          campaign: campaignResourceName,
          extension_type: 'CALL',
          call_extension: {
            phone_number: phoneNumber,
          },
        },
      });
    }

    if (location) {
      operations.push({
        create: {
          campaign: campaignResourceName,
          extension_type: 'LOCATION',
          location_extension: {
            address: {
              street_address: location.streetAddress,
              city_name: location.city,
              country_code: location.country,
              postal_code: location.postalCode,
            },
          },
        },
      });
    }

    if (promotions.length) {
      operations.push({
        create: {
          campaign: campaignResourceName,
          extension_type: 'PROMOTION',
          promotion_extension: promotions.map((promotion) => ({
            discount_modifier: 'UP_TO',
            percent_off: parseFloat(promotion.discount),
            final_urls: [promotion.finalUrl],
          })),
        },
      });
    }

    if (operations.length) {
      try {
        await this.googleAdsClient.campaignExtensionSettings.create(operations);
      } catch (error) {
        this.logger.error('Error creating campaign extensions:', error);
        throw new Error('Failed to create campaign extensions. Ensure all required fields are provided.');
      }
    }
  }
}
