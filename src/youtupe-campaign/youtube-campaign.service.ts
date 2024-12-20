import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class YouTubeCampaignService {
  private readonly googleAdsClient: Customer;

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
    biddingStrategy: string,
  ): Promise<{
    message: string;
    campaign: string;
    adGroup: string;
    ad: string;
  }> {
    try {
      console.log('=== Starting YouTube campaign creation process ===');

      const validatedVideoId = this.validateVideoId(videoId);

      const videoAssetResourceName = await this.createVideoAsset(
        name,
        validatedVideoId,
      );
      const budgetResourceName = await this.createCampaignBudget(
        name,
        budgetAmountMicros,
      );
      const campaignResourceName = await this.createCampaign(
        name,
        budgetResourceName,
        startDate,
        endDate,
        biddingStrategy,
      );
      const adGroupResourceName = await this.createAdGroup(
        name,
        campaignResourceName,
      );
      const adResourceName = await this.createAdGroupAd(
        adGroupResourceName,
        videoAssetResourceName,
      );

      console.log('=== YouTube campaign creation completed successfully ===');

      return {
        message: 'YouTube campaign created successfully',
        campaign: campaignResourceName,
        adGroup: adGroupResourceName,
        ad: adResourceName,
      };
    } catch (error) {
      console.error('Error creating YouTube campaign:', error);
      this.handleGoogleAdsError(error);
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

    // Define the bidding strategy payload
    let campaignBiddingStrategy: any;
    switch (biddingStrategy) {
      case 'MAXIMIZE_CONVERSIONS':
        campaignBiddingStrategy = { maximize_conversions: {} };
        break;
      case 'TARGET_CPA':
        campaignBiddingStrategy = {
          target_cpa: { target_cpa_micros: 1000000 },
        };
        break;
      default:
        throw new Error(`Unsupported bidding strategy: ${biddingStrategy}`);
    }
    console.log('Campaign creation payload:', {
      name,
      status: 'PAUSED',
      advertising_channel_type: 'VIDEO',
      campaign_budget: budgetResourceName,
      start_date: startDate,
      end_date: endDate,
      campaignBiddingStrategy,
    });

    // Create the campaign payload
    const response = await this.googleAdsClient.campaigns.create([
      {
        name,
        status: 'PAUSED',
        advertising_channel_type: 'VIDEO',
        campaign_budget: budgetResourceName,
        start_date: startDate,
        end_date: endDate,
        campaign_bidding_strategy: campaignBiddingStrategy, // Make sure this is included
      },
    ]);

    const resourceName = response.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error('Failed to create campaign.');
    }
    console.log('Campaign created:', resourceName);
    return resourceName;
  }

  private async createAdGroup(
    name: string,
    campaignResourceName: string,
  ): Promise<string> {
    console.log('Creating ad group...');
    const response = await this.googleAdsClient.adGroups.create([
      {
        name: `${name}_AdGroup`,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'VIDEO_TRUE_VIEW_IN_STREAM',
      },
    ]);

    const resourceName = response.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error('Failed to create ad group.');
    }
    console.log('Ad group created:', resourceName);
    return resourceName;
  }

  private async createAdGroupAd(
    adGroupResourceName: string,
    videoAssetResourceName: string,
  ): Promise<string> {
    console.log('Creating ad group ad...');
    const response = await this.googleAdsClient.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        ad: {
          video_ad: {
            video: {
              asset: videoAssetResourceName,
            },
            in_stream: {},
          },
        },
        status: 'ENABLED',
      },
    ]);

    const resourceName = response.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error('Failed to create ad group ad.');
    }
    console.log('Ad group ad created:', resourceName);
    return resourceName;
  }

  private handleGoogleAdsError(error: any): void {
    const errorDetails = error.errors?.map((err: any) => ({
      message: err.message,
      field: err.location?.field_path_elements,
      reason: err.error_code,
    }));

    throw new HttpException(
      {
        message: 'Failed to create YouTube campaign.',
        details: errorDetails || error.message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
