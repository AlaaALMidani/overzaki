import { GoogleCampaignService } from './../google-campaign/google-campaign.service';
/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class YouTubeCampaignService {
  private readonly googleAdsClient: Customer;


  constructor(
    private readonly googleCampaignService: GoogleCampaignService,
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
    name: string,
    budgetAmountMicros: number,
    videoId: string,
    startDate: string,
    endDate: string,
    squareImages: string[], // Square image file
    landscapeImages: string[], // Landscape image file
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
      console.log('ageRanges:', ageRanges);
      console.log('=== Starting YouTube campaign creation process ===');
  
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
        amount_micros: amountMicros*1000000,
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
    marketingImages: string[], // Landscape image URL
    squareMarketingImages: string[], // Square image URL
    logoImages: string[],
    finalUrl: string, // Landing page URL
    videoAssetResourceName: string,
  ): Promise<string> {
    try {
      console.log('Creating Discovery Ad...');
      const payload = {
        name: 'YouTube Video Ad',
        type: 'RESPONSIVE_DISPLAY_AD',
        final_urls: [finalUrl], // Landing page URL
        responsive_display_ad: {
          business_name: businessName, // Business name
          marketing_images: marketingImages.map((image) => ({ asset:image  })),
          square_marketing_images: squareMarketingImages.map((image) => ({ asset:image  })),
          square_logo_images: logoImages.map((image) => ({ asset:image  })),
          headlines: headlines.map((text) => ({ text })), // Headlines
          descriptions: descriptions.map((text) => ({ text })), // Descriptions
          youtube_videos: [
            { asset: videoAssetResourceName },
          ],
          long_headline: { text: headlines[0] },
          call_to_action_text: 'Book Now'

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
  private  cleanBase64(base64: string): string {
    return base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  }
  private async createImageAsset(images: string[], assetName: string): Promise<string[]> {
    try {
      let result: string[];
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
        result.push(resourceName)
        console.log('Image asset created:', resourceName);
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
}

      // private async createImageAsset(file: string, assetName: string): Promise<string> {
      //   try {
      //     console.log('Uploading image asset...');
          // const absoluteImagePath = path.join(__dirname, file);
          // const image = fs.readFileSync(absoluteImagePath, { encoding: 'base64' });
    
      //     const response = await this.googleAdsClient.assets.create([
      //       {
      //         name: assetName,
      //         type: 'IMAGE', // Asset type is IMAGE
      //         image_asset: {
      //           data: image, // Convert file buffer to Base64
      //         },
      //       },
      //     ]);
    
      //     const resourceName = response.results[0]?.resource_name;
    
      //     console.log('Image asset created:', resourceName);
      //     return resourceName;
      //   } catch (error) {
      //     throw new HttpException(
      //       {
      //         message: 'Failed to upload image asset.',
      //         details: error,
      //       },
      //       HttpStatus.BAD_REQUEST,
      //     );
      //   }
      // }