/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
    base64Video: string,
    accessToken: string,
    advertiserId: string,
    flawDetect: boolean = false,
    autoFixEnabled: boolean = false,
    autoBindEnabled: boolean = false,
  ): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/file/video/ad/upload/`;
    const formData = new FormData();

    // Decode the Base64 string to a Buffer
    const videoBuffer = this.decodeBase64ToBuffer(base64Video);

    formData.append('advertiser_id', advertiserId);
    formData.append('file_name', `video_${Date.now()}.mp4`);
    formData.append('upload_type', 'UPLOAD_BY_FILE');
    formData.append('video_file', videoBuffer, { filename: `video_${Date.now()}.mp4` });
    formData.append('video_signature', await this.computeFileHash(videoBuffer));
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
    base64Image: string,
    accessToken: string,
    advertiserId: string,
  ): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/file/image/ad/upload/`;
    const formData = new FormData();

    // Decode the Base64 string to a Buffer
    const imageBuffer = this.decodeBase64ToBuffer(base64Image);

    formData.append('advertiser_id', advertiserId);
    formData.append('file_name', `image_${Date.now()}.jpg`, {
      filename: `image_${Date.now()}.jpg`,
    });
    formData.append('upload_type', 'UPLOAD_BY_FILE');
    formData.append('image_file', imageBuffer, {
      filename: `image_${Date.now()}.jpg`,
    });
    formData.append('image_signature', await this.computeFileHash(imageBuffer));

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

  async CreateFeed(
    userId: string,
    walletId: string,
    campaignName: string,
    objectiveType: string,
    ageGroups: string[],
    gender: string,
    spendingPower: string,
    languages: string[],
    locationIds: string[],
    operatingSystems: string[],
    budget: number,
    scheduleType: string,
    scheduleStartTime: string,
    base64Logo: string,
    appName: string,
    ads: {
      [key: string]: {
        adText: string,
        callToAction: string,
        url: string,
        base64Video: string,
        base64Cover: string,
      }
    },
    // interestCategoryIds?: string[],
    scheduleEndTime?: string,
  ) {
    try {
      scheduleType = "SCHEDULE_START_END"
      const accessToken = "96d622792f5a94483bf9221ad36b92a817e27ee5";
      const advertiserId = "7447785412501946386";
      // await this.orderService.checkPayAbility(userId, budget, 25, 1000);
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

      // Step 2: Upload Logo
      this.logger.log('Uploading logo...');
      const logoUpload = await this.uploadImageByFile(
        base64Logo,
        accessToken,
        advertiserId,
      );
      const logoId = logoUpload?.image_id;
      if (!logoId) throw new Error('logo upload failed: Missing logo ID.');
      this.logger.log(`logo uploaded successfully with ID: ${logoId}`);

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
        languages,
        ageGroups,
        operatingSystems,
        spendingPower,
        optimizationGoal: 'CLICK',
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
        identityId,
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

      // Step 5: Create Ads
      this.logger.log('Step 5: Creating ads...');
      const adsData = [];
      for (const [key, ad] of Object.entries(ads)) {
        this.logger.log(`Creating ad ${key}...`);

        // Upload video
        this.logger.log('Uploading video...');
        const videoUpload = await this.uploadVideoByFile(
          ad.base64Video,
          accessToken,
          advertiserId,
        );
        const videoId = videoUpload?.video_id;
        this.logger.log(JSON.stringify(videoUpload))
        if (!videoId) throw new Error('Video upload failed: Missing video ID.');
        this.logger.log(`Video uploaded successfully with ID: ${videoId}`);

        // Upload cover
        this.logger.log('Uploading cover...');
        const coverUpload = await this.uploadImageByFile(
          ad.base64Cover,
          accessToken,
          advertiserId,
        );
        const coverId = coverUpload?.image_id;
        if (!coverId) throw new Error('cover upload failed: Missing image ID.');
        this.logger.log(`cover uploaded successfully with ID: ${coverId}`);

        // Create ad
        const adPayload = {
          advertiser_id: advertiserId,
          adgroup_id: adGroupId,
          creatives: [
            {
              ad_name: campaignName,
              display_name: appName,
              app_name: appName,
              call_to_action: ad.callToAction,
              ad_text: ad.adText,
              video_id: videoId,
              identity_id: identityId,
              identity_type: 'CUSTOMIZED_USER',
              ad_format: 'SINGLE_VIDEO',
              image_ids: [coverId],
              landing_page_url: ad.url,
              url: ad.url,
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

        // Collect ad data for the order
        adsData.push({
          adId: adId,
          brandName: appName,
          headline: ad.adText,
          callToAction: ad.callToAction,
          url: ad.url,
          video: videoUpload.preview_url,
          cover: coverUpload.image_url,
          creative: createAdResponse.data.data.creatives[0],
        });
      }

      // Step 6: Create Order
      this.logger.log('Creating order...');
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'TikTok Feed',
        budget,
        {
          base: {
            campaign_id: campaignId,
            campaign_name: campaignName,
            create_time: campaign.data.create_time,
            budget_mode: budgetMode,
            schedule_start_time: scheduleStartTime,
            schedule_end_time: scheduleEndTime,
            budget: budget,
            logo:logoUpload.image_url,
          },
          ads: adsData,
          campaign,
          adGroup,
        },
      );
      this.logger.log('Order created successfully:', order._id);

      return {
        message: 'TikTok Feed created successfully!',
        data: {
          orderID: order._id,
          order,
        },
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
        auth_code: authCode,
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
    campaignName: string,
    objectiveType: string,
    gender: string,
    spendingPower: string,
    scheduleType: string,
    scheduleStartTime: string,
    budget: number,
    ageGroups: string[],
    languages: string[],
    locationIds: string[],
    // interestCategoryIds: Array<string>,
    operatingSystems: Array<string>,
    ads: {
      [key: string]: {
        authCode: string;
        callToAction: string;
        url: string;
      };
    },
    scheduleEndTime?: string,
  ) {
    try {
      const accessToken = "96d622792f5a94483bf9221ad36b92a817e27ee5";
      const advertiserId = "7447785412501946386";
      // await this.orderService.checkPayAbility(userId, budget, 25, 1000);
      const budgetMode = 'BUDGET_MODE_TOTAL';
      this.logger.log("create campaign ")
      // Step 1: Create Campaign
      const campaignDetails = {
        campaignName,
        objectiveType,
        budgetMode,
        budget,
      };
      const campaign = await this.createCampaign(
        accessToken,
        advertiserId,
        campaignDetails,
      );
      this.logger.log(campaign);
      const campaignId = campaign?.data?.campaign_id;
      if (!campaignId) {
        throw new Error('Campaign creation failed: Missing campaign ID.');
      }

      // Step 2: Create Ad Group
      this.logger.log('Creating ad group...');
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
        languages,
        ageGroups,
        operatingSystems,
        spendingPower,
        optimizationGoal: 'CLICK',
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
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
      if (!adGroupId) {
        throw new Error('Ad group creation failed: Missing ad group ID.');
      }
      this.logger.log(`Ad group created successfully with ID: ${adGroupId}`);

      // Step 3: Create Ads
      this.logger.log('Creating ads...');
      const adsData = [];
      for (const [key, ad] of Object.entries(ads)) {
        this.logger.log(`Creating ad ${key}...`);

        // Step 3.1: Authenticate and retrieve video and identity information for each ad
        let authVideo = await this.AuthVideo(
          accessToken,
          advertiserId,
          ad.authCode, // Use the unique authCode for each ad
        );
        let videoInfo = await this.getVideoInfo(
          accessToken,
          advertiserId,
        );
        this.logger.log(authVideo);
        this.logger.log(videoInfo);

        const identityId = videoInfo.data?.list?.[0]?.user_info?.identity_id;
        const itemId = videoInfo.data?.list?.[0]?.item_info?.item_id;
        if (!identityId || !itemId) {
          throw new Error('Failed to retrieve required video or identity information.');
        }
        this.logger.log(identityId);
        this.logger.log(itemId);

        // Step 3.2: Create Ad
        const adPayload = {
          advertiser_id: advertiserId,
          adgroup_id: adGroupId,
          creatives: [
            {
              ad_name: campaignName,
              identity_type: 'AUTH_CODE',
              identity_id: identityId,
              ad_format: 'SINGLE_VIDEO',
              tiktok_item_id: itemId,
              call_to_action: ad.callToAction,
              display_name: campaignName,
              app_name: campaignName,
              landing_page_url: ad.url,
              url: ad.url,
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

        // Collect ad data for the order
        adsData.push({
          adId: adId,
          brandName: campaignName,
          headline: campaignName,
          callToAction: ad.callToAction,
          url: ad.url,
          creative: createAdResponse.data.data.creatives[0],
        });
      }

      // Step 4: Create Order
      this.logger.log('Creating order...');
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'TikTok Spark',
        budget,
        {
          base: {
            campaign_id: campaignId,
            campaign_name: campaignName,
            create_time: campaign.data.create_time,
            budget_mode: budgetMode,
            schedule_start_time: scheduleStartTime,
            schedule_end_time: scheduleEndTime,
            budget: budget,
          },
          ads: adsData,
          campaign,
          adGroup,
        },
      );
      this.logger.log('Order created successfully:', order._id);

      return {
        message: 'TikTok Spark created successfully!',
        data: {
          orderID: order._id,
          order,
        },
      };
    } catch (error) {
      this.logger.error('Error during CreateSpark:', error.message);
      if (error.message === 'Campaign creation failed: Missing campaign ID.') {
        throw new BadRequestException('Campaign name already exists.');
      }
      throw error;
    }
  }

  // Fetch Campaign Report
  async getCampaignReport(orderId: string): Promise<any> {
    const endpoint = `${this.getBaseUrl()}v1.3/report/integrated/get`;
    try {
      const accessToken = "96d622792f5a94483bf9221ad36b92a817e27ee5";
      const advertiserId = "7447785412501946386";
      // Fetch the order details
      const order = await this.orderService.getOrderById(orderId);
      if (!order || !order.details || !order.details.base || !order.details.base.campaign_id) {
        throw new Error("Order details or campaign ID not found.");
      }
  
      // Get the current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];
  
      // Fetch the report for the specific campaign
      const response = await axios.get(endpoint, {
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        params: {
          advertiser_id: advertiserId,
          report_type: 'BASIC',
          start_date: '2025-01-01', // Adjust the start date as needed
          end_date: currentDate,    // Use the current date as the end date
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
            'currency',
          ]),
          filters: JSON.stringify([
            {
              field_name: 'campaign_id',
              filter_type: 'IN',
              filter_value: [order.details.base.campaign_id], // Filter by the campaign ID from the order
            },
          ]),
        },
      });
  
      // Check if the response contains data for the specified campaign
      const campaignData = response.data.data.list.find(
        (item: any) => item.dimensions.campaign_id === order.details.base.campaign_id
      );
  
      if (!campaignData) {
        throw new Error("No data found for the specified campaign.");
      }
  
      // Return the report along with order details
      return {
        serviceName: order.serviceName,
        status: order.status,
        stats: campaignData.metrics, // Only return metrics for the specified campaign
        details: order.details,
      };
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error("Error fetching campaign report:", errorDetails);
      throw error;
    }
  }

  private decodeBase64ToBuffer(base64: string): Buffer {
    // Remove the data URL prefix if present
    const base64Data = base64.split(';base64,').pop() || base64;
    return Buffer.from(base64Data, 'base64');
  }
}
