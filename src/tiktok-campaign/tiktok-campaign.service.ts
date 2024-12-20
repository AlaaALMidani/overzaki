import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import * as crypto from 'crypto';

@Injectable()
export class TiktokCampaignService {
  private readonly logger = new Logger(TiktokCampaignService.name);

  private getBaseUrl(): string {
    return process.env.NODE_ENV === 'production'
      ? 'https://business-api.tiktok.com/open_api/'
      : process.env.TIKTOK_BASE_URL || 'https://sandbox-ads.tiktok.com/open_api/';
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
      throw new Error(errorDetails?.message || 'Failed to retrieve access token');
    }
  }

  async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  // Upload Video to TikTok
  
  async uploadVideo(
    accessToken: string,
    advertiserId: string,
    videoUrl: string,
    fileName: string,
  ): Promise<any> {
    const url = `${this.getBaseUrl()}v1.2/file/video/ad/upload/`;
    const payload = {
      advertiser_id: advertiserId,
      upload_type: 'UPLOAD_BY_URL',
      video_url: videoUrl,
      file_name: fileName,
    };
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`Video uploaded successfully: ${JSON.stringify(response.data)}`);
      return response.data?.data;
    } catch (error) {
      this.logger.error(`Error uploading video: ${error.response?.data?.message || error.message}`);
      throw new Error(error.response?.data?.message || 'Video upload to TikTok failed.');
    }
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
        `${this.getBaseUrl()}v1.2/campaign/create/`,
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
      throw new Error(error.response?.data?.message || 'Campaign creation failed');
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
      throw new Error(error.response?.data?.message || 'Feed Ad creation failed');
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
      throw new Error(error.response?.data?.message || 'Spark Ad creation failed');
    }
  }


  async fetchUploadedVideos(accessToken: string, advertiserId: string): Promise<any> {
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
      this.logger.error(`Error fetching uploaded videos: ${errorDetails?.message || error.message}`);
      throw new Error(errorDetails?.message || 'Failed to fetch uploaded videos');
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
        dimensions: ["campaign_id"],
        metrics: ["spend", "impressions", "clicks", "ctr", "cpc", "cpm"],
        filters: [
          {
            field: "campaign_id",
            operator: "EQUALS",
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
            "Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching campaign report:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch campaign report.");
    }
  }

}
