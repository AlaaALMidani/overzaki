/* eslint-disable @typescript-eslint/no-unused-vars */

import { Multer } from 'multer';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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
    const endpoint = `${this.getBaseUrl()}${version}/oauth2/access_token/`;
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
    formData.append('file_name', file.originalname);
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

      return response.data?.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'Video upload failed');
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
      campaignId: string;
      adgroupName: string;
      promotionType: string;
      placementType: string;
      placements: Array<string>;
      locationIds: Array<string>;
      budgetMode: string;
      budget: number;
      scheduleType: string;
      scheduleEndTime: string;
      scheduleStartTime: string;
      optimizationGoal: string;
      bidType: string;
      billingEvent: string;
      pacing: string;
      operationStatus: string;
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
        schedule_end_time: adGroupDetails.scheduleEndTime,
        schedule_start_time: adGroupDetails.scheduleStartTime,
        optimization_goal: adGroupDetails.optimizationGoal,
        bid_type: adGroupDetails.bidType,
        billing_event: adGroupDetails.billingEvent,
        pacing: adGroupDetails.pacing,
        operation_status: adGroupDetails.operationStatus,
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

  // Create Feed Ad
  async createFeedAd(
    accessToken: string,
    advertiserId: string,
    campaignId: string,
    adDetails: { ad_name: string; video_id: string },
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        adgroup_id: campaignId,
        ad_name: adDetails.ad_name,
        promotion_type: 'CUSTOM_CREATIVE',
        creative: {
          video_id: adDetails.video_id,
          call_to_action: 'LEARN_MORE',
        },
      };

      const response = await axios.post(
        `${this.getBaseUrl()}v1.2/ad/create/`,
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
        error.response?.data?.message || 'Feed Ad creation failed',
      );
    }
  }

  // Create Spark Ad
  async createSparkAd(
    accessToken: string,
    advertiserId: string,
    campaignId: string,
    adDetails: { ad_name: string; post_id: string },
  ) {
    try {
      const payload = {
        advertiser_id: advertiserId,
        adgroup_id: campaignId,
        ad_name: adDetails.ad_name,
        promotion_type: 'POST',
        post_id: adDetails.post_id,
      };
      const response = await axios.post(
        `${this.getBaseUrl()}v1.2/ad/create/`,
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
        error.response?.data?.message || 'Spark Ad creation failed',
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
      return response.data?.data;
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
}
