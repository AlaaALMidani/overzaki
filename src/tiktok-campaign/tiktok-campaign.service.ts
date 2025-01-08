import { BadRequestException, ConsoleLogger, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { OrderService } from '../order/order.service';

@Injectable()
export class TiktokCampaignService {
  private readonly logger = new Logger(TiktokCampaignService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly orderService: OrderService,
  ) { }

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
  async getAccessToken(authCode: string) {
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

  // Upload Image to TikTok
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
      objectiveType: string;
      budget: number;
    },
  ) {
    try {
      const payload: any = {
        advertiser_id: advertiserId,
        campaign_name: campaignDetails.campaignName,
        objective_type: campaignDetails.objectiveType,
        budget_mode: 'BUDGET_MODE_TOTAL',
        budget: campaignDetails.budget,
      };
      if (campaignDetails.objectiveType === 'APP_PROMOTION') {
        payload.app_promotion_type = 'APP_PREREGISTRATION ';
      }
      if (campaignDetails.objectiveType === 'PRODUCT_SALES') {
        payload.campaign_product_source = 'CATALOG';
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
      tiktok_subplacements?: Array<string>;
      placementType: string;
      placements: Array<string>;
      locationIds: Array<string>;
      budgetMode: string;
      budget: number;
      gender: string;
      scheduleType: string;
      scheduleStartTime: string;
      // dayparting: string;
      languages: Array<string>;
      ageGroups: Array<string>;
      interestCategoryIds: Array<string>;
      operatingSystems: Array<string>;
      // devicePriceRanges: Array<number>;
      spendingPower: string;
      optimizationGoal: string;
      bidType: string;
      billingEvent: string;
      pacing: string;
      identityId: string;
      // deviceModelIds: Array<string>;
      shoppingAdsType?: string;
      scheduleEndTime?: string;
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
        schedule_type: adGroupDetails.scheduleType,
        schedule_end_time: adGroupDetails?.scheduleEndTime,
        schedule_start_time: adGroupDetails.scheduleStartTime,
        // dayparting: adGroupDetails.dayparting,
        optimization_goal: adGroupDetails.optimizationGoal,
        bid_type: adGroupDetails.bidType,
        billing_event: adGroupDetails.billingEvent,
        pacing: adGroupDetails.pacing,
        languages: adGroupDetails.languages,
        gender: adGroupDetails.gender,
        age_groups: adGroupDetails.ageGroups,
        spending_power: adGroupDetails.spendingPower,
        interest_category_ids: adGroupDetails.interestCategoryIds,
        operating_systems: adGroupDetails.operatingSystems,
        // device_price_ranges: adGroupDetails.devicePriceRanges,
        identity_id: adGroupDetails.identityId,
        shopping_ads_type: adGroupDetails?.shoppingAdsType,
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
    imageUri: string,
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        display_name: displayName,
        image_uri: imageUri,
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
    callToAction: string,
    gender: string,
    spendingPower: string,
    scheduleType: string,
    scheduleStartTime: string,
    // dayparting: string,
    budget: number,
    appName: string,
    adText: string,
    url: string,
    ageGroups: Array<string>,
    languages: Array<string>,
    locationIds: Array<string>,
    interestCategoryIds: Array<string>,
    operatingSystems: Array<string>,
    // devicePriceRanges: Array<number>,
    // deviceModelIds: Array<string>,
    videoFile: Express.Multer.File,
    coverFile: Express.Multer.File,
    logoFile: Express.Multer.File,
    scheduleEndTime?: string,
  ) {
    try {
      await this.orderService.checkPayAbility(userId, budget, 25);
      const budgetMode = 'BUDGET_MODE_TOTAL';
      // Step 1: Create Campaign
      this.logger.log('Step 1: Creating campaign...');
      const campaignDetails = {
        campaignName,
        objectiveType,
        budgetMode,
        budget,
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
      this.logger.log('Uploading logo...');
      const logoUpload = await this.uploadImageByFile(
        logoFile,
        accessToken,
        advertiserId,
      );
      const logoId = logoUpload?.image_id;
      if (!logoId) throw new Error('logo upload failed: Missing logo ID.');
      this.logger.log(`Image uploaded successfully with ID: ${logoId}`);

      // Step 3: Create Identity
      this.logger.log('Creating new identity...');
      const identity = await this.createIdentity(
        accessToken,
        advertiserId,
        appName,
        logoUpload.image_id,
      );
      this.logger.log(`Identity response: ${JSON.stringify(identity)}`);
      const identityId = identity.data.identity_id;

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
        gender,
        scheduleType,
        scheduleStartTime,
        // dayparting,
        languages,
        ageGroups,
        interestCategoryIds,
        operatingSystems,
        // devicePriceRanges,
        spendingPower,
        optimizationGoal: 'CLICK',
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
        identityId,
        // deviceModelIds,
        scheduleEndTime,
      };
      if (objectiveType === 'PRODUCT_SALES') {
        adGroupDetails.shoppingAdsType = 'LIVE';
      }
      if (scheduleType == 'SCHEDULE_START_END ') {
        adGroupDetails.scheduleEndTime = scheduleEndTime;
      }
      if (
        objectiveType === 'REACH' ||
        objectiveType === 'VIDEO_VIEWS' ||
        objectiveType === 'ENGAGEMENT'
      ) {
        adGroupDetails.tiktok_subplacements = ['IN_FEED'];
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

      this.logger.log('Uploading cover...');
      const coverUpload = await this.uploadImageByFile(
        coverFile,
        accessToken,
        advertiserId,
      );
      const coverId = coverUpload?.image_id;
      if (!coverId) throw new Error('cover upload failed: Missing image ID.');
      this.logger.log(`cover uploaded successfully with ID: ${coverId}`);

      // Step 5: Create Ad
      this.logger.log('Step 5: Creating ad...');
      const adPayload = {
        advertiser_id: advertiserId,
        adgroup_id: adGroupId,
        creatives: [
          {
            ad_name: campaignName,
            display_name: appName,
            app_name: appName,
            call_to_action: callToAction,
            ad_text: adText,
            video_id: videoId,
            identity_id: identityId,
            identity_type: 'CUSTOMIZED_USER',
            ad_format: 'SINGLE_VIDEO',
            image_ids: [coverId],
            landing_page_url: url,
            url: url,
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
          base: {
            campaign_id: campaign.data.campaign_id,
            campaign_name: campaign.data.campaign_name,
            create_time: campaign.data.create_time,
            budget_mode: campaign.data.budget_mode,
            schedule_start_time: adGroup.data.schedule_start_time,
            schedule_end_time: adGroup.data.schedule_end_time,
            budget: budget,
            videoUpload,
            coverUpload,
            logoUpload,
          },
          campaign,
          adGroup,
          // identity: existingIdentity || { data: { identity_id: identityId } },
          ...createAdResponse.data.data.creatives[0],
        },
      );
      return {
        ...order, details: order.details.base
      };
    } catch (error) {
      this.logger.error('Error during setupAdCampaign:', error.message);
      if (error.message === 'Campaign creation failed: Missing campaign ID.') {
        throw new BadRequestException('Campaign name is already exist.');
      }
      throw error;
    }
  }

  async AuthVideo(accessToken: string, advertiserId: string, authCode: string) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        auth_code: authCode
      };
      const response = await axios.post(
        `https://business-api.tiktok.com/open_api/v1.3/tt_video/authorize/`,
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

  async getVideoInfo(accessToken: string, advertiserId: string) {
    const endpoint = `https://business-api.tiktok.com/open_api/v1.3/tt_video/list/`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': accessToken,
        },
        params: { advertiser_id: advertiserId },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Failed to fetch');
    }
  }

  async CreateSpark(
    userId: string,
    walletId: string,
    accessToken: string,
    advertiserId: string,
    authCode: string,
    campaignName: string,
    objectiveType: string,
    callToAction: string,
    gender: string,
    spendingPower: string,
    scheduleType: string,
    scheduleStartTime: string,
    // dayparting: string,
    budget: number,
    appName: string,
    adText: string,
    url: string,
    ageGroups: Array<string>,
    languages: Array<string>,
    locationIds: Array<string>,
    interestCategoryIds: Array<string>,
    operatingSystems: Array<string>,
    // devicePriceRanges: Array<number>,
    // deviceModelIds: Array<string>,
    scheduleEndTime?: string,
  ) {
    try {
      await this.orderService.checkPayAbility(userId, budget, 25);
      const budgetMode = 'BUDGET_MODE_TOTAL';
      // Step 1: Create Campaign
      let authVideo = await this.AuthVideo("1548a753b674f01b55dbfb056ab18ed8653780f6", "7447536677184372754", authCode);
      let videoInfo = await this.getVideoInfo("1548a753b674f01b55dbfb056ab18ed8653780f6", "7447536677184372754");
      this.logger.log(authVideo)
      this.logger.log(videoInfo)
      const identityId = videoInfo.data?.list?.[0]?.user_info?.identity_id;
      const itemId = videoInfo.data?.list?.[0]?.item_info?.item_id;

      if (!identityId || !itemId) {
        throw new Error('Failed to retrieve required video or identity information.');
      }


      this.logger.log(identityId)
      this.logger.log(itemId)
      const campaignDetails = {
        campaignName,
        objectiveType,
        budgetMode: 'BUDGET_MODE_TOTAL',
        budget,
      };
      const campaign = await this.createCampaign(accessToken, advertiserId, campaignDetails);
      this.logger.log(campaign)
      const campaignId = campaign?.data?.campaign_id;

      if (!campaignId) {
        throw new Error('Campaign creation failed: Missing campaign ID.');
      }

      //  Create Ad Group
      this.logger.log(' Creating ad group...');
      const adGroupDetails: any = {
        adgroupName: campaignName,
        campaignId,
        promotionType: 'WEBSITE',
        placementType: 'PLACEMENT_TYPE_NORMAL',
        placements: ['PLACEMENT_TIKTOK'],
        locationIds,
        budgetMode,
        budget,
        gender,
        scheduleType,
        scheduleStartTime,
        // dayparting,
        languages,
        ageGroups,
        interestCategoryIds,
        operatingSystems,
        // devicePriceRanges,
        spendingPower,
        optimizationGoal: 'CLICK',
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
        identityId,
        // deviceModelIds,
        scheduleEndTime,
      };
      if (objectiveType === 'PRODUCT_SALES') {
        adGroupDetails.shoppingAdsType = 'LIVE';
      }
      if (scheduleType == 'SCHEDULE_START_END ') {
        adGroupDetails.scheduleEndTime = scheduleEndTime;
      }
      if (
        objectiveType === 'REACH' ||
        objectiveType === 'VIDEO_VIEWS' ||
        objectiveType === 'ENGAGEMENT'
      ) {
        adGroupDetails.tiktok_subplacements = ['IN_FEED'];
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
            identity_type: "AUTH_CODE",
            identity_id: identityId,
            ad_format: 'SINGLE_VIDEO',
            tiktok_item_id: itemId,
            call_to_action: callToAction,
            display_name: appName,
            app_name: appName,
            ad_text: adText,   
            landing_page_url: url,
            url: url,
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
        throw new BadRequestException(
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
          base: {
            campaign_id: campaign.data.campaign_id,
            campaign_name: campaign.data.campaign_name,
            create_time: campaign.data.create_time,
            budget_mode: campaign.data.budget_mode,
            schedule_start_time: adGroup.data.schedule_start_time,
            schedule_end_time: adGroup.data.schedule_end_time,
            budget: budget,
          },
          campaign,
          adGroup,
          // identity: existingIdentity || { data: { identity_id: identityId } },
          ...createAdResponse.data.data.creatives[0],
        },
      );
      return {
        ...order, details: order.details.base
      };
    } catch (error) {
      this.logger.error('Error during setupAdCampaign:', error.message);
      if (error.message === 'Campaign creation failed: Missing campaign ID.') {
        throw new BadRequestException('Campaign name is already exist.');
      }

      throw error;
    }
  }


  // Fetch Campaign Report
  async getReport(access_token: string, advertiser_id: string, orderId: string): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/report/integrated/get`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        params: {
          advertiser_id: advertiser_id,
          report_type: 'BASIC',
          start_date: '2025-01-01',
          end_date: '2025-01-10',
          dimensions: JSON.stringify(['campaign_id']),
          service_type: 'AUCTION',
          data_level: 'AUCTION_CAMPAIGN',
          metrics: JSON.stringify([
            'spend',
            'impressions',
            'ctr',
            'cpm',
            'clicks',
            'conversion',
            'cost_per_conversion',
            'conversion_rate',
            'conversion_rate_v2',
            'currency'
          ]),
        },
      });
      console.log(orderId)
      const order = await this.orderService.getOrderById(orderId)
      console.log(order)
      return { ...response.data, details: order.details, status: order.status };
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.log(error)
      throw error
    }
  }
}
