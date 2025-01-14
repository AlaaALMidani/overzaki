// /* eslint-disable prettier/prettier */
// /* eslint-disable prettier/prettier */
// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { GoogleAdsApi, Customer } from 'google-ads-api';
// import * as dotenv from 'dotenv';

// dotenv.config();

// @Injectable()
// export class YouTubeCampaignService {
//   private readonly googleAdsClient: Customer;

//   constructor() {
//     this.validateEnvVariables();

//     const googleAdsApi = new GoogleAdsApi({
//       client_id: process.env.GOOGLE_ADS_CLIENT_ID,
//       client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
//       developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
//     });

//     this.googleAdsClient = googleAdsApi.Customer({
//       customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
//       login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
//       refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
//     });
//   }

//   private validateEnvVariables() {
//     const requiredEnvVars = [
//       'GOOGLE_ADS_CLIENT_ID',
//       'GOOGLE_ADS_CLIENT_SECRET',
//       'GOOGLE_ADS_DEVELOPER_TOKEN',
//       'GOOGLE_ADS_CUSTOMER_ID',
//       'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
//       'GOOGLE_ADS_REFRESH_TOKEN',
//     ];

//     for (const varName of requiredEnvVars) {
//       if (!process.env[varName]) {
//         throw new Error(`Missing environment variable: ${varName}`);
//       }
//     }
//   }

//   async createYouTubeCampaign(
//     name: string,
//     budgetAmountMicros: number,
//     videoId: string,
//     startDate: string,
//     endDate: string,
//     biddingStrategy: string, // Use 'TARGET_CPA' or 'MANUAL_CPV'
//   ): Promise<{
//     message: string;
//     campaign: string;
//     adGroup: string;
//     ad: string;
//   }> {
//     try {

//       console.log('=== Starting YouTube campaign creation process ===');
//       const videoAssetResourceName = await this.createVideoAsset(name, videoId);
//       const budgetResourceName = await this.createCampaignBudget(name, budgetAmountMicros);
//       const campaignResourceName = await this.createCampaign(name, budgetResourceName, startDate, endDate, biddingStrategy);
//       const adGroupResourceName = await this.createAdGroup(name, campaignResourceName);
//       const adResourceName = await this.createAdGroupAd(adGroupResourceName, videoAssetResourceName);
//       console.log('=== YouTube campaign creation completed successfully ===');

//       return {
//         message: 'YouTube campaign created successfully',
//         campaign: campaignResourceName,
//         adGroup: adGroupResourceName,
//         ad: adResourceName,
//       };

//     } catch (error) {
//       this.handleGoogleAdsError(error);
//     }
//   }

//   private validateVideoId(videoId: string): string {
//     if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
//       throw new HttpException(
//         'Invalid YouTube video ID. It must be exactly 11 characters long.',
//         HttpStatus.BAD_REQUEST,
//       );
//     }
//     return videoId;
//   }

//   private async createVideoAsset(
//     name: string,
//     videoId: string,
//   ): Promise<string> {
//     console.log('Uploading video asset...');
//     const response = await this.googleAdsClient.assets.create([
//       {
//         youtube_video_asset: {
//           youtube_video_id: videoId,
//         },
//         name: `${name}_VideoAsset`,
//         type: 'YOUTUBE_VIDEO',
//       },
//     ]);

//     const resourceName = response.results[0]?.resource_name;
//     if (!resourceName) {
//       throw new Error('Failed to upload video asset.');
//     }
//     console.log('Video asset created:', resourceName);
//     return resourceName;
//   }

//   private async createCampaignBudget(
//     name: string,
//     amountMicros: number,
//   ): Promise<string> {
//     console.log('Creating campaign budget...');
//     const response = await this.googleAdsClient.campaignBudgets.create([
//       {
//         name: `${name}_Budget`,
//         amount_micros: amountMicros,
//         delivery_method: 'STANDARD',
//         explicitly_shared: false, // Ensure the budget is not shared
//       },
//     ]);

//     const resourceName = response.results[0]?.resource_name;
//     if (!resourceName) {
//       throw new Error('Failed to create campaign budget.');
//     }
//     console.log('Campaign budget created:', resourceName);
//     return resourceName;
//   }

//   private async createCampaign(
//     name: string,
//     budgetResourceName: string,
//     startDate: string,
//     endDate: string,
//     biddingStrategy: string,
//   ): Promise<string> {
//     console.log('Creating campaign...');

//     const payload: any = {
//       start_date: startDate,
//       end_date: endDate,
//       name,
//       status: 'PAUSED',
//       advertising_channel_type: 'VIDEO',
//       advertising_channel_sub_type: 'VIDEO_ACTION',
//       campaign_budget: budgetResourceName,
//       bidding_strategy_type: 'TARGET_CPA', // Or 'MAXIMIZE_CONVERSIONS'
//       target_cpa: { target_cpa_micros: 2000000 }, // Only if using TARGET_CPA
//       // Remove target_cpm
//       network_settings: {
//           target_youtube_watch: true, // Typically for Video Action
//       },
//     };

//     // Handle bidding strategy
//     // switch (biddingStrategy) {
//     //   case 'MAXIMIZE_CONVERSIONS':
//     //     payload.bidding_strategy_type = 'MAXIMIZE_CONVERSIONS';
//     //     payload.maximize_conversions = {};
//     //     break;
//     //   case 'MANUAL_CPM':
//     //     payload.bidding_strategy_type = 'MANUAL_CPM';
//     //     payload.manual_cpm = {};
//     //     break;
//     //   case 'TARGET_CPA':
//     //     payload.bidding_strategy_type = 'TARGET_CPA';
//     //     payload.target_cpa = { target_cpa_micros: 2000000 }; // Example value - set appropriately
//     //     break;
//     //   default:
//     //     throw new Error(`Unsupported bidding strategy: ${biddingStrategy}`);
//     // }

//     const response = await this.googleAdsClient.campaigns.create([payload]);
//     const resourceName = response.results[0]?.resource_name;

//     if (!resourceName) {
//       throw new Error('Failed to create campaign.');
//     }

//     console.log('Campaign created:', resourceName);
//     return resourceName;
//   }

//   private async createAdGroup(
//     name: string,
//     campaignResourceName: string,
//   ): Promise<string> {
//     console.log('Creating ad group...');
//     const response = await this.googleAdsClient.adGroups.create([
//       {
//         name: `${name}_AdGroup`,
//         campaign: campaignResourceName,
//         status: 'ENABLED',
//         type: 'VIDEO_TRUE_VIEW_IN_STREAM',
//       },
//     ]);

//     const resourceName = response.results[0]?.resource_name;
//     if (!resourceName) {
//       throw new Error('Failed to create ad group.');
//     }
//     console.log('Ad group created:', resourceName);
//     return resourceName;
//   }

//   private async createAdGroupAd(
//     adGroupResourceName: string,
//     videoAssetResourceName: string,
//   ): Promise<string> {
//     console.log('Creating ad group ad...');
//     const response = await this.googleAdsClient.adGroupAds.create([
//       {
//         ad_group: adGroupResourceName,
//         ad: {
//           video_ad: {
//             video: {
//               asset: videoAssetResourceName,
//             },
//             in_stream: {},
//           },
//         },
//         status: 'ENABLED',
//       },
//     ]);

//     const resourceName = response.results[0]?.resource_name;
//     if (!resourceName) {
//       throw new Error('Failed to create ad group ad.');
//     }
//     console.log('Ad group ad created:', resourceName);
//     return resourceName;
//   }

//   private handleGoogleAdsError(error: any): void {
//     const errorDetails = error.errors?.map((err: any) => ({
//       message: err.message,
//       field: err.location?.field_path_elements,
//       reason: err.error_code,
//     }));

//     console.error('Google Ads API Error:', errorDetails);

//     throw new HttpException(
//       {
//         message: 'Failed to create YouTube campaign.',
//         details: errorDetails || error.message,
//       },
//       HttpStatus.BAD_REQUEST,
//     );
//   }
// }

// // import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
// // import { GoogleAdsApi, Customer, enums } from 'google-ads-api';

// // @Injectable()
// // export class YouTubeAdService {
// //   private readonly googleAdsClient: Customer;
// //   private readonly googleAdsApi: GoogleAdsApi;
// //   private readonly logger = new Logger(YouTubeAdService.name);

// //   constructor() {
// //     this.validateEnvVariables();

// //     this.googleAdsApi = new GoogleAdsApi({
// //       client_id: process.env.GOOGLE_ADS_CLIENT_ID,
// //       client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
// //       developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
// //     });

// //     this.googleAdsClient = this.googleAdsApi.Customer({
// //       customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
// //       login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
// //       refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
// //     });
// //   }

// //   async createYouTubeAd(params: {
// //     campaignName: string;
// //     budgetAmount: number;
// //     startDate: string;
// //     endDate: string;
// //     videoUrl: string;
// //     headline: string;
// //     description: string;
// //     callToAction: string;
// //     targetAudience: {
// //       demographics: string[];
// //       interests: string[];
// //       behaviors: string[];
// //     };
// //   }): Promise<any> {
// //     try {
// //       console.log('Creating YouTube Ad with params:', params);

// //       const {
// //         campaignName,
// //         budgetAmount,
// //         startDate,
// //         endDate,
// //         videoUrl,
// //         headline,
// //         description,
// //         callToAction,
// //         targetAudience,
// //       } = params;

// //       const budgetResourceName = await this.createCampaignBudget(
// //         campaignName,
// //         budgetAmount,
// //       );
// //       console.log('Campaign budget created:', budgetResourceName);

// //       const campaignResourceName = await this.createCampaign(
// //         campaignName,
// //         budgetResourceName,
// //         startDate,
// //         endDate,
// //       );
// //       console.log('Campaign created:', campaignResourceName);

// //       await this.addTargetAudience(campaignResourceName, targetAudience);

// //       const adGroupResourceName = await this.createAdGroup(
// //         campaignName,
// //         campaignResourceName,
// //       );
// //       console.log('Ad Group created:', adGroupResourceName);

// //       await this.createVideoAd(
// //         adGroupResourceName,
// //         videoUrl,
// //         headline,
// //         description,
// //         callToAction,
// //       );

// //       return {
// //         message: 'YouTube Ad created successfully',
// //         data: {
// //           campaignBudget: budgetResourceName,
// //           campaign: campaignResourceName,
// //           adGroup: adGroupResourceName,
// //         },
// //       };
// //     } catch (error: any) {
// //       console.error('Error creating YouTube Ad:', error);
// //       this.logger.error('Error creating YouTube Ad:', error);
// //       throw new HttpException(
// //         {
// //           message: 'Failed to create YouTube Ad',
// //           error: error?.errors || error?.message || 'Unknown error',
// //         },
// //         HttpStatus.INTERNAL_SERVER_ERROR,
// //       );
// //     }
// //   }

// //   private validateEnvVariables() {
// //     if (
// //       !process.env.GOOGLE_ADS_CLIENT_ID ||
// //       !process.env.GOOGLE_ADS_CLIENT_SECRET ||
// //       !process.env.GOOGLE_ADS_DEVELOPER_TOKEN ||
// //       !process.env.GOOGLE_ADS_CUSTOMER_ID ||
// //       !process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ||
// //       !process.env.GOOGLE_ADS_REFRESH_TOKEN
// //     ) {
// //       throw new Error(
// //         'Missing required environment variables for Google Ads API',
// //       );
// //     }
// //   }

// //   // Implement the methods createCampaignBudget, createCampaign, addTargetAudience, createAdGroup, and createVideoAd

// //   async createCampaignBudget(campaignName: string, budgetAmount: number): Promise<string> {
// //     try {
// //       const response = await this.googleAdsClient.campaignBudgets.create({
// //         customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
// //         operations: [
// //           {
// //             create: {
// //               name: `${campaignName} Budget`,
// //               amount_micros: budgetAmount * 1_000_000, // Convert to micros
// //               delivery_method: enums.BudgetDeliveryMethod.STANDARD,
// //             },
// //           },
// //         ],
// //       });

// //       const budgetResourceName = response.results[0].resource_name;
// //       console.log('Campaign budget created:', budgetResourceName);
// //       return budgetResourceName;
// //     } catch (error: any) {
// //       console.error('Error creating campaign budget:', error);
// //       this.logger.error('Error creating campaign budget:', error);
// //       throw new HttpException(
// //         {
// //           message: 'Failed to create campaign budget',
// //           error: error?.errors || error?.message || 'Unknown error',
// //         },
// //         HttpStatus.INTERNAL_SERVER_ERROR,
// //       );
// //     }
// //   }

// //   async createCampaign(campaignName: string, budgetResourceName: string, startDate: string, endDate: string): Promise<string> {
// //     try {
// //       const response = await this.googleAdsClient.campaigns.create({
// //         customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
// //         operations: [
// //           {
// //             create: {
// //               name: campaignName,
// //               campaign_budget: budgetResourceName,
// //               advertising_channel_type: enums.AdvertisingChannelType.VIDEO,
// //               status: enums.CampaignStatus.PAUSED,
// //               start_date: startDate.replace(/-/g, ''),
// //               end_date: endDate.replace(/-/g, ''),
// //               video_campaign: {
// //                 bidding_strategy_type: enums.BiddingStrategyType.MAXIMIZE_CONVERSIONS,
// //               },
// //             },
// //           },
// //         ],
// //       });

// //       const campaignResourceName = response.results[0].resource_name;
// //       console.log('Campaign created:', campaignResourceName);
// //       return campaignResourceName;
// //     } catch (error: any) {
// //       console.error('Error creating campaign:', error);
// //       this.logger.error('Error creating campaign:', error);
// //       throw new HttpException(
// //         {
// //           message: 'Failed to create campaign',
// //           error: error?.errors || error?.message || 'Unknown error',
// //         },
// //         HttpStatus.INTERNAL_SERVER_ERROR,
// //       );
// //     }
// //   }

// //   async addTargetAudience(campaignResourceName: string, targetAudience: { demographics: string[]; interests: string[]; behaviors: string[] }): Promise<void> {
// //     try {
// //       const operations = [];

// //       // Add demographic targeting
// //       targetAudience.demographics.forEach(demographic => {
// //         operations.push({
// //           create: {
// //             campaign: campaignResourceName,
// //             demographic: enums.DemographicType[demographic],
// //           },
// //         });
// //       });

// //       // Add interest targeting
// //       targetAudience.interests.forEach(interest => {
// //         operations.push({
// //           create: {
// //             campaign: campaignResourceName,
// //             interest: enums.InterestType[interest],
// //           },
// //         });
// //       });

// //       // Add behavior targeting
// //       targetAudience.behaviors.forEach(behavior => {
// //         operations.push({
// //           create: {
// //             campaign: campaignResourceName,
// //             behavior: enums.BehaviorType[behavior],
// //           },
// //         });
// //       });

// //       await this.googleAdsClient.campaignCriteria.create({
// //         customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
// //         operations,
// //       });

// //       console.log('Target audience added:', targetAudience);
// //     } catch (error: any) {
// //       console.error('Error adding target audience:', error);
// //       this.logger.error('Error adding target audience:', error);
// //       throw new HttpException(
// //         {
// //           message: 'Failed to add target audience',
// //           error: error?.errors || error?.message || 'Unknown error',
// //         },
// //         HttpStatus.INTERNAL_SERVER_ERROR,
// //       );
// //     }
// //   }

// //   async createVideoAd(adGroupResourceName: string, videoUrl: string, headline: string, description: string, callToAction: string): Promise<void> {
// //     try {
// //       const response = await this.googleAdsClient.adGroupAds.create({
// //         customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
// //         operations: [
// //           {
// //             create: {
// //               ad_group: adGroupResourceName,
// //               status: enums.AdGroupAdStatus.PAUSED,
// //               ad: {
// //                 final_urls: [videoUrl],
// //                 video_ad: {
// //                   in_stream: {
// //                     action_button_label: callToAction,
// //                     action_headline: headline,
// //                     action_description: description,
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         ],
// //       });

// //       console.log('Video ad created:', response.results[0].resource_name);
// //     } catch (error: any) {
// //       console.error('Error creating video ad:', error);
// //       this.logger.error('Error creating video ad:', error);
// //       throw new HttpException(
// //         {
// //           message: 'Failed to create video ad',
// //           error: error?.errors || error?.message || 'Unknown error',
// //         },
// //         HttpStatus.INTERNAL_SERVER_ERROR,
// //       );
// //     }
// //   }

// // }

/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
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
    biddingStrategy: string, // Use 'TARGET_CPA' or 'MANUAL_CPV'
  ): Promise<{
    message: string;
    campaign: string;
    adGroup: string;
    ad: string;
  }> {
    try {
      console.log('=== Starting YouTube campaign creation process ===');
      //const videoAssetResourceName = await this.createVideoAsset(name, videoId);
      const budgetResourceName = await this.createCampaignBudget(name, budgetAmountMicros);
      const biddingStrategy = await this.createBiddingStrategy(name, budgetAmountMicros)
      const campaignResourceName = await this.createCampaign(name, budgetResourceName, startDate, endDate, biddingStrategy);
      const adGroupResourceName = await this.createAdGroup(name, campaignResourceName);
      const adResourceName = await this.createAdGroupAd(adGroupResourceName, 'customers/5522941096/assets/194392630367');
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
      advertising_channel_type: 'VIDEO',
      campaign_budget: budgetResourceName,
      bidding_strategy: biddingStrategy,
    };

    console.log(payload);
    try {
      const response = await this.googleAdsClient.campaigns.create([(payload as any)]); // Wrap payload in an array
      const resourceName = response.results[0]?.resource_name;
      console.log(response);
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
          type: 'VIDEO_TRUE_VIEW_IN_STREAM', // Use 'VIDEO' instead of 'VIDEO_TRUE_VIEW_IN_STREAM'
          cpc_bid_micros: 1000000, // Optional: Set a bid amount (1 USD in micros)
        },
      ]);

      const resourceName = response.results[0]?.resource_name;
      if (!resourceName) {
        throw new Error('Failed to create ad group.');
      }
      console.log('Ad group created:', resourceName);
      return resourceName;
    }
    catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create campaign.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async createAdGroupAd(
    adGroupResourceName: string,
    videoAssetResourceName: string,
  ): Promise<string> {
    try {
      console.log('Creating ad group ad...');

      const response = await this.googleAdsClient.adGroupAds.create([
        {
          ad_group: adGroupResourceName,
          ad: {
            name: 'YouTube Video Ad',
            final_urls: ['https://www.overzaki.com'], // Replace with your landing page URL
            video_responsive_ad: {
              headlines: [
                { text: 'Check out this video!' },
              ],
              descriptions: [
                { text: 'Learn more about our amazing product.' },
              ],
              videos: [
                { asset: videoAssetResourceName },
              ],
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
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create ad group ad.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private handleGoogleAdsError(error: any): void {
    const errorDetails = error.errors?.map((err: any) => ({
      message: err.message,
      field: err.location?.field_path_elements,
      reason: err.error_code,
    }));

    console.error('Google Ads API Error:', errorDetails);
    throw error
    throw new HttpException(
      {
        message: 'Failed to create YouTube campaign.',
        details: errorDetails || error.message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
