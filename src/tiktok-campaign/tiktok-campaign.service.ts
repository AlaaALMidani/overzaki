import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { OrderService } from '../order/order.service';
import { ad } from 'google-ads-api/build/src/protos/autogen/resourceNames';
@Injectable()
export class TiktokCampaignService {
  private readonly logger = new Logger(TiktokCampaignService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly orderService: OrderService,
  ) {}

  private getBaseUrl(): string {
    return process.env.NODE_ENV === 'production'
      ? 'https://business-api.tiktok.com/open_api/'
      : process.env.TIKTOK_BASE_URL ||
          'https://sandbox-ads.tiktok.com/open_api/';
  }

  // Generate TikTok OAuth URL
  getAuthUrl() {
    const state = Math.random().toString(36).substring(2, 15);
    return `https://business-api.tiktok.com/portal/auth?app_id=${process.env.TIKTOK_CLIENT_ID}&state=${state}&redirect_uri=${encodeURIComponent(
      process.env.TIKTOK_REDIRECT_URI,
    )}&scope=advertiser_management`;
  }

  // Exchange Authorization Code for Access Token
  async getAccessToken(authCode: string, version: string = 'v1.3') {
    const endpoint = `https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/`;
    const payload = {
      app_id: process.env.TIKTOK_CLIENT_ID,
      secret: process.env.TIKTOK_CLIENT_SECRET,
      auth_code: authCode,
      grant_type: 'authorization_code',
    };
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(
        errorDetails?.message || 'Failed to retrieve access token',
      );
    }
  }

  // Upload Video to TikTok
  async uploadVideoByFile(
    file: Express.Multer.File,
    accessToken: string,
    advertiserId: string,
    flawDetect: boolean = false,
    autoFixEnabled: boolean = false,
    autoBindEnabled: boolean = false,
  ): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/file/video/ad/upload/`;
    const formData = new FormData();
    formData.append('advertiser_id', advertiserId);
    formData.append('file_name', file.originalname + Date.now());
    formData.append('upload_type', 'UPLOAD_BY_FILE');
    formData.append('video_file', file.buffer, { filename: file.originalname });
    formData.append('video_signature', await this.computeFileHash(file.buffer));
    formData.append('flaw_detect', flawDetect.toString());
    formData.append('auto_fix_enabled', autoFixEnabled.toString());
    formData.append('auto_bind_enabled', autoBindEnabled.toString());
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Access-Token': accessToken,
        },
      });
      const videoData = response.data?.data?.[0];
      if (!videoData?.video_id) {
        throw new Error('Video upload failed: Missing video ID.');
      }
      return videoData;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Video upload failed');
    }
  }

  async uploadImageByFile(
    file: Express.Multer.File,
    accessToken: string,
    advertiserId: string,
  ): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/file/image/ad/upload/`;
    const formData = new FormData();
    formData.append('advertiser_id', advertiserId);
    formData.append('file_name', file.originalname, {
      filename: `${Date.now()}_${file.originalname}`,
    });
    formData.append('upload_type', 'UPLOAD_BY_FILE');
    formData.append('image_file', file.buffer, {
      filename: `${Date.now()}_${file.originalname}`,
    });
    formData.append('image_signature', await this.computeFileHash(file.buffer));
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Access-Token': accessToken,
        },
      });
      console.log('Upload response:', response.data);
      return response.data?.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error('Image upload error details:', errorDetails);
      throw new Error(errorDetails?.message || 'Image upload failed');
    }
  }

  async computeFileHash(fileBuffer: Buffer): Promise<string> {
    return new Promise((resolve) => {
      const hash = crypto.createHash('md5');
      hash.update(fileBuffer);
      resolve(hash.digest('hex'));
    });
  }

  // Create Campaign
  async createCampaign(
    accessToken: string,
    advertiserId: string,
    campaignDetails: {
      campaignName: string;
      appPromotionType?: string;
      objectiveType: string;
      budget: number;
      landingPageUrl: string;
    },
  ) {
    try {
      const payload: any = {
        advertiser_id: advertiserId,
        campaign_name: campaignDetails.campaignName,
        objective_type: campaignDetails.objectiveType,
        budget_mode: 'BUDGET_MODE_INFINITE',
        budget: campaignDetails.budget,
        landing_page_url: campaignDetails.landingPageUrl,
      };
      if (campaignDetails.objectiveType === 'APP_PROMOTION') {
        payload.app_promotion_type = campaignDetails.appPromotionType;
      }
      const response = await axios.post(
        `${this.getBaseUrl()}v1.3/campaign/create/`,
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Campaign creation failed',
      );
    }
  }

  async createAdGroup(
    accessToken: string,
    advertiserId: string,
    adGroupDetails: {
      adgroupName: string;
      campaignId: string;
      promotionType: string;
      placementType: string;
      placements: Array<string>;
      locationIds: Array<string>;
      budgetMode: string;
      budget: number;
      // gender: string;
      scheduleType: string;
      scheduleStartTime: string;
      // dayparting: string;
      // languages: Array<string>;
      // ageGroups: Array<string>;
      // interestCategoryIds: Array<string>;
      // operatingSystems: Array<string>;
      // devicePriceRanges: Array<number>;
      // spendingPower: string;
      optimizationGoal: string;
      bidType: string;
      billingEvent: string;
      pacing: string;
      operationStatus: string;
      identityId: string;
      // deviceModelIds: Array<string>;
      // shoppingAdsType?: string;
      // scheduleEndTime?: string;
    },
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        campaign_id: adGroupDetails.campaignId,
        adgroup_name: adGroupDetails.adgroupName,
        promotion_type: adGroupDetails.promotionType,
        placement_type: adGroupDetails.placementType,
        placements: adGroupDetails.placements,
        location_ids: adGroupDetails.locationIds,
        budget_mode: adGroupDetails.budgetMode,
        budget: adGroupDetails.budget,
        schedule_type:"SCHEDULE_FROM_NOW",
        // schedule_end_time: adGroupDetails?.scheduleEndTime,
        schedule_start_time: adGroupDetails.scheduleStartTime,
        // dayparting: adGroupDetails.dayparting,
        optimization_goal: adGroupDetails.optimizationGoal,
        bid_type: adGroupDetails.bidType,
        billing_event: adGroupDetails.billingEvent,
        pacing: adGroupDetails.pacing,
        operation_status: adGroupDetails.operationStatus,
        // languages: adGroupDetails.languages,
        // gender: adGroupDetails.gender,
        // age_groups: adGroupDetails.ageGroups,
        // spending_power: adGroupDetails.spendingPower,
        // interest_category_ids: adGroupDetails.interestCategoryIds,
        // operating_systems: adGroupDetails.operatingSystems,
        // device_price_ranges: adGroupDetails.devicePriceRanges,
        // identity_id: adGroupDetails?.identityId,
        // shopping_ads_type: adGroupDetails?.shoppingAdsType,
      };
      const response = await axios.post(
        `${this.getBaseUrl()}v1.3/adgroup/create/`,
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('Ad group response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ad group upload error details:', error.message);
      throw new Error(
        error.response?.data?.message || 'Ad group creation failed',
      );
    }
  }

  async createIdentity(
    accessToken: string,
    advertiserId: string,
    displayName: string,
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        display_name: displayName,
      };
      const response = await axios.post(
        `${this.getBaseUrl()}v1.3/identity/create/`,
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(
        error.response?.data?.message || 'identity creation failed',
      );
    }
  }

  async createBC(
    accessToken: string,
    bc_name: string,
    business_type: string,
    timezone: string,
  ) {
    try {
      const payload = {
        bc_name: bc_name + accessToken.slice(0, 3),
        business_type: business_type,
        timezone: timezone,
      };
      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/bc/create/',
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'BC creation failed');
    }
  }

  async createCatalog(
    accessToken: string,
    bcId: string,
    name: string,
    catalogType: string,
    regionCode: string,
    currency: string,
  ): Promise<string> {
    try {
      const payload = {
        bc_id: bcId,
        name: name,
        catalog_type: catalogType,
        catalog_conf: {
          region_code: regionCode,
          currency: currency,
        },
      };

      // Make the API call
      const response = await axios.post(
        'https://business-api.tiktok.com/open_api/v1.3/catalog/create/',
        payload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      const catalogId = response.data?.data?.catalog_id;
      if (!catalogId) {
        throw new Error(
          `Catalog creation failed: Missing catalog ID. Response: ${JSON.stringify(response.data)}`,
        );
      }

      return catalogId;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;

      throw new Error(errorDetails?.message || 'Catalog creation failed');
    }
  }

  // Get User's Videos
  async fetchUploadedVideos(
    accessToken: string,
    advertiserId: string,
  ): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/file/video/ad/search/`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        params: { advertiser_id: advertiserId },
      });

      return response.data?.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(
        errorDetails?.message || 'Failed to fetch uploaded videos',
      );
    }
  }

  async fetchIdentity(accessToken: string, advertiserId: string): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/identity/get/`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        params: { advertiser_id: advertiserId },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Failed to fetch');
    }
  }

  async CreateFeed(
    userId: string,
    walletId: string,
    accessToken: string,
    advertiserId: string,
    campaignName: string,
    objectiveType: string,
    // gender: string,
    // spendingPower: string,
    scheduleType: string,
    scheduleStartTime: string,
    // dayparting: string,
    budget: number,
    optimizationGoal: string,
    displayName: string,
    adText: string,
    // ageGroups: Array<string>,
    // languages: Array<string>,
    locationIds: Array<string>,
    // interestCategoryIds: Array<string>,
    // operatingSystems: Array<string>,
    // devicePriceRanges: Array<number>,
    // deviceModelIds: Array<string>,
    videoFile: Express.Multer.File,
    imageFile: Express.Multer.File,
    scheduleEndTime?: string,
  ) {
    try {
      await this.orderService.checkPayAbility(userId, budget, 25);
      const budgetMode = 'BUDGET_MODE_DYNAMIC_DAILY_BUDGET';
      // Step 1: Create Campaign
      this.logger.log('Step 1: Creating campaign...');
      const campaignDetails = {
        campaignName,
        objectiveType,
        budgetMode,
        budget,
        landingPageUrl: 'https://www.example.com/',
      };
      this.logger.log(`Campaign details: ${JSON.stringify(campaignDetails)}`);
      const campaign = await this.createCampaign(
        accessToken,
        advertiserId,
        campaignDetails,
      );
      const campaignId = campaign?.data?.campaign_id;
      if (!campaignId)
        throw new Error('Campaign creation failed: Missing campaign ID.');
      this.logger.log(`Campaign created successfully with ID: ${campaignId}`);

      // Step 2: Upload Media Files
      this.logger.log('Step 2: Uploading media files...');
      this.logger.log('Uploading video...');
      const videoUpload = await this.uploadVideoByFile(
        videoFile,
        accessToken,
        advertiserId,
      );
      const videoId = videoUpload?.video_id;
      if (!videoId) throw new Error('Video upload failed: Missing video ID.');
      this.logger.log(`Video uploaded successfully with ID: ${videoId}`);

      this.logger.log('Uploading image...');
      const imageUpload = await this.uploadImageByFile(
        imageFile,
        accessToken,
        advertiserId,
      );
      const imageId = imageUpload?.image_id;
      if (!imageId) throw new Error('Image upload failed: Missing image ID.');
      this.logger.log(`Image uploaded successfully with ID: ${imageId}`);

      // Step 3: Create Identity
      this.logger.log('Step 3: Checking or creating identity...');
      const existingIdentity = await this.fetchIdentity(
        accessToken,
        advertiserId,
      );
      let identityId = existingIdentity.data.identity_list[0].identity_id;
      this.logger.log(`Existing identity found: ${identityId || 'None'}`);

      if (!identityId) {
        this.logger.log('Creating new identity...');
        const identity = await this.createIdentity(
          accessToken,
          advertiserId,
          displayName,
        );
        identityId = identity.data.identity_id;
      }
      if (!identityId)
        throw new Error('Identity creation failed: Missing identity ID.');
      this.logger.log(`Identity created successfully with ID: ${identityId}`);

      // Step 4: Create Ad Group
      this.logger.log('Step 4: Creating ad group...');
      const adGroupDetails: any = {
        adgroupName: campaignName,
        campaignId,
        promotionType: 'WEBSITE',
        placementType: 'PLACEMENT_TYPE_NORMAL',
        placements: ['PLACEMENT_TIKTOK'],
        locationIds,
        budgetMode,
        budget,
        // gender,
        scheduleType,
        scheduleStartTime,
        optimizationGoal,
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
        operationStatus: 'ENABLE',
        identityId,
        // languages,
        // ageGroups,
        // spendingPower,
        // interestCategoryIds,
        // operatingSystems,
        // devicePriceRanges,
        // deviceModelIds,
      };
      if (objectiveType === 'PRODUCT_SALES') {
        adGroupDetails.shoppingAdsType = 'LIVE';
      }
      if (scheduleType == 'SCHEDULE_START_END ') {
        adGroupDetails.scheduleEndTime = scheduleEndTime;
      }
      this.logger.log(`Ad Group details: ${JSON.stringify(adGroupDetails)}`);

      const adGroup = await this.createAdGroup(
        accessToken,
        advertiserId,
        adGroupDetails,
      );
      const adGroupId = adGroup?.data?.adgroup_id;
      if (!adGroupId)
        throw new Error('Ad group creation failed: Missing ad group ID.');
      this.logger.log(`Ad group created successfully with ID: ${adGroupId}`);

      // Step 5: Create Ad
      this.logger.log('Step 5: Creating ad...');
      const adPayload = {
        advertiser_id: advertiserId,
        adgroup_id: adGroupId,
        creatives: [
          {
            ad_name: campaignName,
            display_name: displayName,
            app_name: 'OverZaki',
            call_to_action: 'WATCH_NOW',
            ad_text: adText,
            video_id: videoId,
            identity_id: identityId,
            identity_type: 'CUSTOMIZED_USER',
            ad_format: 'SINGLE_VIDEO',
            image_ids: [imageId],
            landing_page_url: 'https://www.overzaki.com',
          },
        ],
      };
      this.logger.log(`Ad details: ${JSON.stringify(adPayload)}`);

      const createAdResponse = await axios.post(
        `${this.getBaseUrl()}v1.3/ad/create/`,
        adPayload,
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );
      const adId = createAdResponse.data.data.ad_ids?.[0];
      if (!adId) {
        throw new Error(
          `Ad creation failed: ${createAdResponse?.data?.message || 'Unknown error'}`,
        );
      }
      this.logger.log(`Ad created successfully with ID: ${adId}`);
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Tiktok feed',
        budget,
        {
          campaign,
          adGroup,
          identity: existingIdentity || { data: { identity_id: identityId } },
          ad: createAdResponse.data,
        },
      );
      return order;
    
    } catch (error) {
      this.logger.error('Error during setupAdCampaign:', error.message);
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Failed to set up ad campaign.');
    }
  }

  async getBCDetails(accessToken: string) {
    try {
      const response = await axios.get(
        'https://business-api.tiktok.com/open_api/v1.3/bc/get/',
        {
          headers: {
            'Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 200) {
        console.log('BC details fetched successfully:', response.data);
        return response.data;
      } else {
        console.error('Error fetching BC details:', response);
        throw new Error('Failed to fetch BC details');
      }
    } catch (error) {
      console.error(
        'Error during BC details request:',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Error fetching BC details',
      );
    }
  }
  // Fetch Campaign Report
  async getReport(access_token: string, advertiser_id: string): Promise<any> {
    const endpoint = `https://sandbox-ads.tiktok.com/open_api/v1.3/report/integrated/get`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        params: {
          advertiser_id: advertiser_id,
          report_type: 'BASIC',
          start_date: '2024-01-02',
          end_date: '2025-01-01',
          dimensions: JSON.stringify(['campaign_id']),
          service_type: 'AUCTION',
          data_level: 'AUCTION_CAMPAIGN',
          metrics: JSON.stringify([
            'spend',
            'impressions',
            'ctr',
            'cpm',
            'clicks',
          ]),
        },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Failed to fetch');
    }
  }
}
