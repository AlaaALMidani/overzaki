import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { Multer } from 'multer';
@Injectable()
export class TiktokCampaignService {
  private readonly logger = new Logger(TiktokCampaignService.name);

  private getBaseUrl(): string {
    return process.env.NODE_ENV === 'production'
      ? 'https://business-api.tiktok.com/open_api/'
      : process.env.TIKTOK_BASE_URL ||
          'https://sandbox-ads.tiktok.com/open_api/';
  }

  // Generate TikTok OAuth URL
  getAuthUrl() {
    const state = Math.random().toString(36).substring(2, 15);
    return `https://ads.tiktok.com/marketing_api/auth?app_id=${process.env.TIKTOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      process.env.TIKTOK_REDIRECT_URI,
    )}&state=${state}&scope=advertiser_management`;
  }

  // Exchange Authorization Code for Access Token
  async getAccessToken(code: string) {
    try {
      const response = await axios.post(
        `${this.getBaseUrl()}v1.2/oauth2/access_token/`,
        {
          app_id: process.env.TIKTOK_CLIENT_ID,
          secret: process.env.TIKTOK_CLIENT_SECRET,
          auth_code: code,
          grant_type: 'authorization_code',
        },
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        'Error exchanging authorization code for access token',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to retrieve access token',
      );
    }
  }

  async uploadVideoToTikTok(
    file: Multer.File,
    accessToken: string,
    advertiserId: string,
  ): Promise<string> {
    if (!file?.path) {
      throw new Error('Invalid file or file path not provided');
    }

    const videoPath = file.path;
    const videoSignature = crypto
      .createHash('sha256')
      .update(fs.readFileSync(videoPath))
      .digest('hex');

    const formData = new FormData();
    formData.append('advertiser_id', advertiserId);
    formData.append('video_file', fs.createReadStream(videoPath));
    formData.append('video_signature', videoSignature);

    try {
      this.logger.log(`Uploading video with signature: ${videoSignature}`);

      // Ensure that the base URL is correct and the endpoint is correct
      const uploadUrl = `${this.getBaseUrl()}v1.2/file/video/ad/upload/`;

      // Upload the video to TikTok
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Access-Token': accessToken,
          ...formData.getHeaders(),
        },
      });

      // Log the full response for debugging purposes
      this.logger.log(
        `TikTok video upload response: ${JSON.stringify(response.data)}`,
      );

      // Check the response and ensure we have the expected data
      const { data } = response.data;
      if (!data?.video_id) {
        throw new Error('Video upload succeeded, but no video_id returned.');
      }

      // Return the video_id
      return data.video_id;
    } catch (error) {
      // Log detailed error information
      const errorDetails = error.response?.data || error.message;
      this.logger.error(`Video upload failed: ${JSON.stringify(errorDetails)}`);

      // If there's an error message, throw it back
      if (errorDetails?.message) {
        throw new Error(errorDetails.message);
      }

      // If no message, throw a generic error
      throw new Error('Video upload failed for an unknown reason');
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

      this.logger.log(
        `Creating Campaign in TikTok - Payload: ${JSON.stringify(payload)}`,
      );

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
      this.logger.error(
        'Error creating campaign',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Campaign creation failed',
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

      this.logger.log(`Feed Ad Payload: ${JSON.stringify(payload)}`);

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
      this.logger.error(
        'Error creating Feed Ad',
        error.response?.data || error.message,
      );
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

      this.logger.log(`Spark Ad Payload: ${JSON.stringify(payload)}`);

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
      this.logger.error(
        'Error creating Spark Ad',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Spark Ad creation failed',
      );
    }
  }
}
