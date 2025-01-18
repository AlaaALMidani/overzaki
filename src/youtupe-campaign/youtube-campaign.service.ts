import { GoogleCampaignService } from './../google-campaign/google-campaign.service';
/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

@Injectable()
export class YouTubeCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly googleCampaignService: GoogleCampaignService;

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


  async createYouTubeCampaign(
    name: string,
    budgetAmountMicros: number,
    videoId: string,
    startDate: string,
    endDate: string,
    squareImage: string, // Square image file
    landscapeImage: string, // Landscape image file
    finalUrl: string,
    businessName: string,
    headlines: string[],
    descriptions: string[],
    languages: string[],
    keywords: {
      keyword: string;
      type: string;
    }[],
    locations:string[],

  ): Promise<{
    message: string;
    campaign: string;
    adGroup: string;
    ad: string;
  }> {
    try {
      console.log('=== Starting YouTube campaign creation process ===');
      const videoAssetResourceName = await this.createVideoAsset(name, videoId);
      const squareImageAssetResourceName = await this.createImageAsset('../square1.png', `${name}_square`)
      const landscapeImageAssetResourceName = await this.createImageAsset('../square_1.png', `${name}_landscape`)
      const budgetResourceName = await this.createCampaignBudget(name, budgetAmountMicros);
      const biddingStrategy = await this.createBiddingStrategy(name, budgetAmountMicros)
      const campaignResourceName = await this.createCampaign(name, budgetResourceName, startDate, endDate, biddingStrategy);
      await this.googleCampaignService.addLanguageTargeting(campaignResourceName, languages)
      await this.googleCampaignService.addGeoTargeting(campaignResourceName,locations)
      const adGroupResourceName = await this.createAdGroup(name, campaignResourceName);
      await this.googleCampaignService.addKeywordsToAdGroup(adGroupResourceName, keywords)
      const adResourceName = await this.createDiscoveryAd(
        adGroupResourceName, // Ad group resource name
        businessName, // Business name
        headlines, // Headlines
        descriptions, // Descriptions
        landscapeImageAssetResourceName, // Landscape image URL
        squareImageAssetResourceName, // Square image URL
        finalUrl, // Landing page URL
        videoAssetResourceName
      );
      console.log('=== YouTube campaign creation completed successfully ===');

      return {
        message: 'YouTube campaign created successfully',
        campaign: campaignResourceName,
        adGroup: adGroupResourceName,
        ad: adResourceName,
      };

    } catch (error) {
      throw error;
      //this.handleGoogleAdsError(error);
    }
  }
  private validateVideoId(videoId: string): string {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new HttpException(
        'Invalid YouTube video ID. It must be exactly 11 characters long.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return videoId;
  }
  private async createVideoAsset(
    name: string,
    videoId: string,
  ): Promise<string> {
    console.log('Uploading video asset...');
    const response = await this.googleAdsClient.assets.create([
      {
        youtube_video_asset: {
          youtube_video_id: videoId,
        },
        name: `${name}_VideoAsset`,
        type: 'YOUTUBE_VIDEO',
      },
    ]);
    const resourceName = response.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error('Failed to upload video asset.');
    }
    console.log('Video asset created:', resourceName);
    return resourceName;
  }
  private async createBiddingStrategy(name: string, amountMicros: number): Promise<string> {
    try {
      console.log('Creating Target CPA bidding strategy...');

      const response = await this.googleAdsClient.biddingStrategies.create([
        {
          name: `${name}_TargetCPA`,
          type: 'TARGET_CPA',
          target_cpa: {
            target_cpa_micros: 1000000, // Example: 5.00 USD = 5000000 micros
          },
        },
      ]);

      const resourceName = response.results[0]?.resource_name;

      if (!resourceName) {
        throw new Error('Failed to create Target CPA bidding strategy.');
      }

      console.log('Bidding strategy created:', resourceName);
      return resourceName;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create campaign.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async createCampaignBudget(
    name: string,
    amountMicros: number,
  ): Promise<string> {
    console.log('Creating campaign budget...');
    const response = await this.googleAdsClient.campaignBudgets.create([
      {
        name: `${name}_Budget`,
        amount_micros: amountMicros,
        delivery_method: 'STANDARD',
        explicitly_shared: false, // Ensure the budget is not shared
      },
    ]);

    const resourceName = response.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error('Failed to create campaign budget.');
    }
    console.log('Campaign budget created:', resourceName);
    return resourceName;
  }
  private async createCampaign(
    name: string,
    budgetResourceName: string,
    startDate: string,
    endDate: string,
    biddingStrategy: string,
  ): Promise<string> {
    console.log('Creating campaign...');
    const payload = {
      start_date: startDate,
      end_date: endDate,
      name,

      status: 'PAUSED',
      advertising_channel_type: 'DISPLAY', // Discovery campaign
      campaign_budget: budgetResourceName,
      bidding_strategy_type: 'TARGET_CPA', // Use 'TARGET_CPA' or 'MAXIMIZE_CONVERSIONS'
      bidding_strategy: biddingStrategy
    };

    try {
      const response = await this.googleAdsClient.campaigns.create([(payload as any)]);
      const resourceName = response.results[0]?.resource_name;
      if (!resourceName) {
        throw new Error('Failed to create campaign.');
      }
      console.log('Campaign created:', resourceName);
      return resourceName;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw new HttpException(
        {
          message: 'Failed to create campaign.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async createAdGroup(
    name: string,
    campaignResourceName: string,
  ): Promise<string> {
    try {
      console.log('Creating ad group...');
      const response = await this.googleAdsClient.adGroups.create([
        {
          name: `${name}_AdGroup`,
          campaign: campaignResourceName,
          type: 'DISPLAY_STANDARD',
          status: 'ENABLED',
        },
      ]);

      const resourceName = response.results[0]?.resource_name;
      if (!resourceName) {
        throw new Error('Failed to create ad group.');
      }

      console.log('Ad group created:', resourceName);
      return resourceName;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create ad group.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async createDiscoveryAd(
    adGroupResourceName: string,
    businessName: string, // Business name
    headlines: string[], // Headlines for the ad
    descriptions: string[], // Descriptions for the ad
    marketingImageUrl: string, // Landscape image URL
    squareMarketingImageUrl: string, // Square image URL
    finalUrl: string, // Landing page URL
    videoAssetResourceName: string,
  ): Promise<string> {
    try {
      console.log('Creating Discovery Ad...');
      const x = {
        ad: {
          name: 'YouTube Video Ad',
          final_urls: [finalUrl], // Landing page URL
          responsive_display_ad: {
            business_name: businessName, // Business name
            marketing_images: [{ asset: marketingImageUrl }], // Landscape image
            square_marketing_images: [{ asset: squareMarketingImageUrl }], // Square image
            headlines: headlines.map((text) => ({ text })), // Headlines
            descriptions: descriptions.map((text) => ({ text })), // Descriptions

            youtube_videos: [
              { asset: videoAssetResourceName },
            ],
          },
        },
      }
      console.log(JSON.stringify(x, null, 2))
      const response = await this.googleAdsClient.adGroupAds.create([
        {
          ad_group: adGroupResourceName,
          ad: {
            name: 'YouTube Video Ad',
            type: 'RESPONSIVE_DISPLAY_AD',
            final_urls: [finalUrl], // Landing page URL
            responsive_display_ad: {
              business_name: businessName, // Business name
              marketing_images: [{ asset: marketingImageUrl }], // Landscape image
              square_marketing_images: [{ asset: squareMarketingImageUrl }], // Square image
              headlines: headlines.map((text) => ({ text })), // Headlines
              descriptions: descriptions.map((text) => ({ text })), // Descriptions
              youtube_videos: [
                { asset: videoAssetResourceName },
              ],
              long_headline: { text: headlines[0] },
              square_logo_images: [{ asset: squareMarketingImageUrl }],
              call_to_action_text: 'Book Now'
            },
          },
          status: 'ENABLED',
        },
      ]);

      const resourceName = response.results[0]?.resource_name;
      if (!resourceName) {
        throw new Error('Failed to create Discovery Ad.');
      }

      console.log('Discovery Ad created:', resourceName);
      return resourceName;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create Discovery Ad.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async createImageAsset(file: string, assetName: string): Promise<string> {
    try {
      console.log('Uploading image asset...');
      const absoluteImagePath = path.join(__dirname, file);

      // Read the image file and encode it to base64
      const image = fs.readFileSync(absoluteImagePath, { encoding: 'base64' });

      const response = await this.googleAdsClient.assets.create([
        {
          name: assetName,
          type: 'IMAGE', // Asset type is IMAGE
          image_asset: {
            data: image, // Convert file buffer to Base64
          },
        },
      ]);

      const resourceName = response.results[0]?.resource_name;

      console.log('Image asset created:', resourceName);
      return resourceName;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to upload image asset.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

}
