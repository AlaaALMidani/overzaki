import { GoogleCampaignService } from './../google-campaign/google-campaign.service';
/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';
import { OrderService } from '../order/order.service';
import { google } from 'googleapis';
dotenv.config();

@Injectable()
export class YouTubeCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly youtubeApiKey = process.env.YOUTUBE_API_KEY;
  private readonly youtube = google.youtube('v3');

  constructor(
    private readonly googleCampaignService: GoogleCampaignService,
    private readonly orderService: OrderService,
  ) {
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
    userId: string,
    walletId: string,
    name: string,
    budgetAmountMicros: number,
    videoId: string,
    startDate: string,
    endDate: string,
    squareImages: string[],
    landscapeImages: string[],
    square_logo_images: string[],
    finalUrl: string,
    businessName: string,
    headlines: string[],
    descriptions: string[],
    languages: string[],
    keywords: {
      keyword: string;
      type: string;
    }[],
    locations: string[],
    gender: string,
    ageRanges: string[],
    longHeadline: string,
    callToAction: string,
  ): Promise<{
    message: string;
    campaign: string;
    adGroup: string;
    ad: string;
  }> {
    try {
      // Log all parameters
      console.log('=== Parameters for createYouTubeCampaign ===');
      console.log('name:', name);
      console.log('budgetAmountMicros:', budgetAmountMicros);
      console.log('videoId:', videoId);
      console.log('startDate:', startDate);
      console.log('endDate:', endDate);
      console.log('squareImages:', squareImages);
      console.log('landscapeImages:', landscapeImages);
      console.log('square_logo_images:', square_logo_images);
      console.log('finalUrl:', finalUrl);
      console.log('businessName:', businessName);
      console.log('headlines:', headlines);
      console.log('descriptions:', descriptions);
      console.log('languages:', languages);
      console.log('keywords:', keywords);
      console.log('locations:', locations);
      console.log('gender:', gender);
      console.log('longheadline:', longHeadline);
      console.log('calltoaction:', callToAction);
      console.log('=== Starting YouTube campaign creation process ===');
      await this.orderService.checkPayAbility(userId, budgetAmountMicros, 25, 10000);

      // Create assets
      const videoAssetResourceName = await this.createVideoAsset(name, videoId);
      const squareImagesAssetResourceNames = await this.createImageAsset(squareImages, `${name}_square`);
      const landscapeImagesAssetResourceNames = await this.createImageAsset(landscapeImages, `${name}_logo`);
      const logoImagesAssetResourceNames = await this.createImageAsset(square_logo_images, `${name}_landscape`);

      // Create campaign budget
      const budgetResourceName = await this.createCampaignBudget(name, budgetAmountMicros);

      // Create bidding strategy
      const biddingStrategy = await this.createBiddingStrategy(name);

      // Create campaign
      const campaignResourceName = await this.createCampaign(name, budgetResourceName, startDate, endDate, biddingStrategy);

      // Add language targeting
      await this.googleCampaignService.addLanguageTargeting(campaignResourceName, languages);

      // Add geo targeting
      await this.googleCampaignService.addGeoTargeting(campaignResourceName, locations);

      // Create ad group
      const adGroupResourceName = await this.createAdGroup(name, campaignResourceName);

      // Add keywords to ad group
      await this.googleCampaignService.addKeywordsToAdGroup(adGroupResourceName, keywords);

      // Create discovery ad
      const adResourceName = await this.createDiscoveryAd(
        adGroupResourceName,
        businessName,
        headlines,
        descriptions,
        landscapeImagesAssetResourceNames,
        squareImagesAssetResourceNames,
        logoImagesAssetResourceNames,
        finalUrl,
        videoAssetResourceName,
        longHeadline,
        callToAction,
      );

      console.log('=== YouTube campaign creation completed successfully ===');
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Youtube Ad',
        budgetAmountMicros,
        {
          base: {
            campaign_id: campaignResourceName,
            campaign_name: name,
            schedule_start_time: startDate,
            schedule_end_time: endDate,
            budget: budgetAmountMicros,
            squareImages,
            landscapeImages,
            square_logo_images,
            videoId,
            finalUrl,
            businessName,
            headlines,
            descriptions,
            languages,
            keywords,
            locations,
            gender,
            ageRanges,
            longHeadline,
            callToAction,
          },
          campaign: campaignResourceName,
          adGroup: adGroupResourceName,
          ad: adResourceName,
        },
      );
      return {
        ...order,
        details: order.details.base,
        message: 'YouTube campaign created successfully',
        campaign: campaignResourceName,
        adGroup: adGroupResourceName,
        ad: adResourceName,
      };

    } catch (error) {
      console.error('Error creating YouTube campaign:', error);
      throw error;
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
  private async createBiddingStrategy(name: string,): Promise<string> {
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
        amount_micros: amountMicros * 1000000,
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
    businessName: string,
    headlines: string[],
    descriptions: string[],
    marketingImages: string[],
    squareMarketingImages: string[],
    logoImages: string[],
    finalUrl: string,
    videoAssetResourceName: string,
    longHeadline: string,
    callToAction: string,
  ): Promise<string> {

    try {
      console.log('Creating Discovery Ad...');
      const payload = {
        name: 'YouTube Video Ad',
        type: 'RESPONSIVE_DISPLAY_AD',
        final_urls: [finalUrl], // Landing page URL
        responsive_display_ad: {
          business_name: businessName, // Business name
          marketing_images: marketingImages.map((image) => ({ asset: image })),
          square_marketing_images: squareMarketingImages.map((image) => ({ asset: image })),
          square_logo_images: logoImages.map((image) => ({ asset: image })),
          headlines: headlines.map((text) => ({ text })), // Headlines
          descriptions: descriptions.map((text) => ({ text })), // Descriptions
          youtube_videos: [
            { asset: videoAssetResourceName },
          ],
          long_headline: { text: longHeadline },
          call_to_action_text: callToAction
        }
      }
      console.log(JSON.stringify(payload, null, 2))
      const response = await this.googleAdsClient.adGroupAds.create([
        {
          ad_group: adGroupResourceName,
          ad: {
            name: 'YouTube Video Ad',
            type: 'RESPONSIVE_DISPLAY_AD',
            final_urls: [finalUrl], // Landing page URL
            responsive_display_ad: {
              business_name: businessName, // Business name
              marketing_images: marketingImages.map((image) => ({ asset: image })),
              square_marketing_images: squareMarketingImages.map((image) => ({ asset: image })),
              square_logo_images: logoImages.map((image) => ({ asset: image })),
              headlines: headlines.map((text) => ({ text })), // Headlines
              descriptions: descriptions.map((text) => ({ text })), // Descriptions
              youtube_videos: [
                { asset: videoAssetResourceName },
              ],
              long_headline: { text: headlines[0] },
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
  private cleanBase64(base64: string): string {
    return base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  }
  private async createImageAsset(images: string[], assetName: string): Promise<string[]> {
    try {
      let result = [];
      images.forEach(async (image, index) => {
        console.log('Uploading image asset...');
        const response = await this.googleAdsClient.assets.create([
          {
            name: assetName + index,
            type: 'IMAGE',
            image_asset: {
              data: this.cleanBase64(image),
            },
          },
        ]);
        const resourceName = response.results[0]?.resource_name;
        console.log('Image asset created:', resourceName);
        result.push(resourceName)
      })
      return result;
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
  public async getYoutubeVideosSuggestions(
    query: string,
    maxResults: number = 10,
    pageToken?: string,
  ): Promise<{
    videos: any[];
    nextPageToken?: string;
    prevPageToken?: string;
  }> {

    if (!query) {
      throw new HttpException('Search query is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.youtube.search.list({
        key: this.youtubeApiKey,
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'], // Only search for videos
        pageToken, // Pass the pageToken for pagination
      });

      return {
        videos: response.data.items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.default.url,
          publishedAt: item.snippet.publishedAt,
        })),
        nextPageToken: response.data.nextPageToken,
        prevPageToken: response.data.prevPageToken,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch YouTube videos',
        error,
      );
    }
  }

}