/* eslint-disable @typescript-eslint/no-unused-vars */

import { Multer } from 'multer';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';


@Injectable()
export class TiktokCampaignService {
  private readonly logger = new Logger(TiktokCampaignService.name);

  constructor(private readonly httpService: HttpService) {}

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
      this.logger.log(response.data)
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
      this.logger.error('Video upload error:', errorDetails);
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
    formData.append('file_name', file.originalname);
    formData.append('upload_type', 'UPLOAD_BY_FILE');
    formData.append('image_file', file.buffer, { filename: file.originalname + Date.now() });
    formData.append('image_signature', await this.computeFileHash(file.buffer));
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'Access-Token': accessToken,
        },
      });

      return response.data?.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Image upload failed');
    }
  }


  async computeFileHash(fileBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
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
      campaign_name: string;
      objectiveType: string;
      budgetMode: string;
      budget: number;
      landingPageUrl: string;
      scheduleStartTime: number;
    },
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        campaign_name: campaignDetails.campaign_name,
        objective_type: campaignDetails.objectiveType,
        budget_mode: campaignDetails.budgetMode,
        budget: campaignDetails.budget,
        landing_page_url: campaignDetails.landingPageUrl,
        schedule_type: 'SCHEDULE_FROM_NOW',
        schedule_start_time: campaignDetails.scheduleStartTime,
      };
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
      campaignId: string,
      adgroupName: string,
      promotionType: string,
      placementType: string,
      placements: Array<string>,
      locationIds: Array<string>,
      budgetMode: string,
      budget: number,
      scheduleType: string,
      scheduleEndTime: string,
      scheduleStartTime: string,
      optimizationGoal: string,
      bidType: string,
      billingEvent: string,
      pacing: string,
      operationStatus: string
      identityId: string
    }
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
        schedule_end_time: adGroupDetails.scheduleEndTime,
        schedule_start_time: adGroupDetails.scheduleStartTime,
        optimization_goal: adGroupDetails.optimizationGoal,
        bid_type: adGroupDetails.bidType,
        billing_event: adGroupDetails.billingEvent,
        pacing: adGroupDetails.pacing,
        operation_status: adGroupDetails.operationStatus,
        identity_id: adGroupDetails.identityId
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
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Ad group creation failed',
      );
    }
  }

  async createIdentity(
    accessToken: string,
    advertiserId: string,
    displayName: string
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        display_name: displayName,
      }
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
      throw new Error(error.response?.data?.message || 'identity creation failed');
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
      }); return response.data?.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Failed to fetch');
    }
  }

  async getCampaignReport(
    accessToken: string,
    advertiserId: string,
    campaignId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      const payload = {
        advertiser_id: advertiserId,
        dimensions: ['campaign_id'],
        metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm'],
        filters: [
          {
            field: 'campaign_id',
            operator: 'EQUALS',
            value: campaignId,
          },
        ],
        start_date: startDate,
        end_date: endDate,
        page: 1,
        page_size: 20,
      };

      const response = await axios.post(
        `${this.getBaseUrl()}v1.2/report/integrated/get/`,
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
      console.error(
        'Error fetching campaign report:',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to fetch campaign report.',
      );
    }
  }


  async setupAdCampaign(
    accessToken: string,
    advertiserId: string,
    campaignName: string,
    budgetMode: string,
    locationIds: Array<string>,
    scheduleEndTime: string,
    scheduleStartTime: string,
    budget: number,
    optimizationGoal: string,
    displayName: string,
    adText: string,
    videoFile: Express.Multer.File,
    imageFile: Express.Multer.File,
  ) {
    try {
      this.logger.log('Starting ad campaign setup...');

      // Step 1: Create Campaign
      this.logger.log('Creating campaign...');
      const campaignDetails = {
        campaign_name: campaignName,
        objectiveType: 'TRAFFIC',
        budgetMode,
        budget,
        landingPageUrl: 'https://www.example.com/',
        scheduleStartTime: Number(scheduleStartTime),
      };
      const campaign = await this.createCampaign(accessToken, advertiserId, campaignDetails);
      const campaignId = campaign?.data?.campaign_id;
      if (!campaignId) throw new Error('Campaign creation failed: Missing campaign ID.');
      this.logger.log(`Campaign created successfully with ID: ${campaignId}`);

      // Step 2: Upload Media Files
      this.logger.log('Uploading media files...');
      const videoUpload = await this.uploadVideoByFile(videoFile, accessToken, advertiserId);
      const videoId = videoUpload?.video_id;
      if (!videoId) throw new Error('Video upload failed: Missing video ID.');
      this.logger.log(`Video uploaded successfully with ID: ${videoId}`);

      const imageUpload = await this.uploadImageByFile(imageFile, accessToken, advertiserId);
      const imageId = imageUpload?.image_id;
      if (!imageId) throw new Error('Image upload failed: Missing image ID.');
      this.logger.log(`Image uploaded successfully with ID: ${imageId}`);

      // Step 3: Create Identity
      this.logger.log('Creating identity...');
      const existingIdentity = await this.fetchIdentity(accessToken, advertiserId);
      let identityId = existingIdentity?.[0]?.identity_id;
      if (!identityId) {
        const identity = await this.createIdentity(accessToken, advertiserId, displayName);
        identityId = identity?.data?.identity_id;
      }
      if (!identityId) throw new Error('Identity creation failed: Missing identity ID.');
      this.logger.log(`Identity created successfully with ID: ${identityId}`);

      // Step 4: Create Ad Group
      this.logger.log('Creating ad group...');
      const adGroupDetails = {
        adgroupName: campaignName,
        campaignId,
        promotionType: 'WEBSITE',
        placementType: 'PLACEMENT_TYPE_NORMAL',
        placements: ['PLACEMENT_TIKTOK'],
        locationIds,
        budgetMode,
        budget,
        scheduleType: 'SCHEDULE_START_END',
        scheduleEndTime,
        scheduleStartTime,
        optimizationGoal,
        bidType: 'BID_TYPE_NO_BID',
        billingEvent: 'CPC',
        pacing: 'PACING_MODE_SMOOTH',
        operationStatus: 'ENABLE',
        identityId,
      };
      const adGroup = await this.createAdGroup(accessToken, advertiserId, adGroupDetails);
      const adGroupId = adGroup?.data?.adgroup_id;
      if (!adGroupId) throw new Error('Ad group creation failed: Missing ad group ID.');
      this.logger.log(`Ad group created successfully with ID: ${adGroupId}`);

      // Step 5: Create Ad
      this.logger.log('Creating ad...');
      const adPayload = {
        advertiser_id: advertiserId,
        adgroup_id: adGroupId,
        creatives: [{
          ad_name:campaignName,
          display_name:displayName,
          app_name:"OverZaki",
          call_to_action:"WATCH_NOW",
          ad_text:adText,
          video_id:videoId,
          identity_id:identityId,
          identity_type: "CUSTOMIZED_USER",
          ad_format: "SINGLE_VIDEO",
          image_ids: [imageId],
          landing_page_url: "https://www.overzaki.com",
        }]
      };

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
        throw new Error(`Ad creation failed: ${createAdResponse?.data?.message || 'Unknown error'}`);
      }
      

      // Return all created entities
      return {
        campaign,
        adGroup,
        identity: existingIdentity || { data: { identity_id: identityId } },
        ad: createAdResponse.data,
      };
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      this.logger.error(`Failed to set up ad campaign: ${JSON.stringify(errorDetails)}`);
      throw new Error(errorDetails?.message || 'Failed to set up ad campaign.');
    }
  }





}



