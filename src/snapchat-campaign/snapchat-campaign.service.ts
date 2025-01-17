import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { OrderService } from '../order/order.service';
import { trace } from 'console';

@Injectable()
export class SnapchatCampaignService {
  private readonly logger = new Logger(SnapchatCampaignService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly orderService: OrderService,
  ) {}

  getAuthUrl() {
    return `https://accounts.snapchat.com/accounts/oauth2/auth?response_type=code&client_id=${process.env.SNAPCHAT_CLEINT_ID}redirect_uri=https://postman-echo.com/get&scope=snapchat-marketing-api&state=unique_state_value`;
  }
  async getAccessToken(authCode: string) {
    const endpoint = 'https://accounts.snapchat.com/login/oauth2/access_token';
    const payload = {
      client_id: process.env.SNAPCHAT_CLIENT_ID,
      client_secret: process.env.SNAPCHAT_CLIENT_SECRET,
      code: authCode,
      grant_type: 'authorization_code',
    };
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log('Access Token Response:', response.data);
    } catch (error) {
      console.error(
        'Error fetching access token:',
        error.response?.data || error.message,
      );
    }
  }

  async refreshAccessToken(): Promise<string> {
    const endpoint = 'https://accounts.snapchat.com/login/oauth2/access_token';
    const payload = {
      client_id: process.env.SNAPCHAT_CLIENT_ID,
      client_secret: process.env.SNAPCHAT_CLIENT_SECRET,
      refresh_token: process.env.SNAPCHAT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;
      process.env.SNAPCHAT_REFRESH_TOKEN = newRefreshToken;
      return newAccessToken;
    } catch (error) {
      this.logger.error('Error refreshing access token:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error('Failed to refresh access token');
    }
  }
  async createMedia(
    accessToken: string,
    name: string,
    adAccountId: string,
    type: string,
  ) {
    try {
      const payload = {
        media: [
          {
            name: name,
            type: type,
            ad_account_id: adAccountId,
          },
        ],
      };
      const response = await axios.post(
        `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/media`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(error.response?.data?.message || 'media creation failed');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    accessToken: string,
    mediId: string,
  ): Promise<any> {
    const endpoint = `https://adsapi.snapchat.com/v1/media/${mediId}/upload`;
    const formData = new FormData();
    formData.append('file', file.buffer, { filename: file.originalname });
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'File  upload failed');
    }
  }

  async createCreative(
    accessToken: string,
    adAccountId: string,
    mediaId: string,
    name: string,
    type: string,
    brandName: string,
    headline: string,
    profileId: string,
  ): Promise<any> {
    const payload = {
      creatives: [
        {
          ad_account_id: adAccountId,
          top_snap_media_id: mediaId,
          name: name,
          type: type,
          brand_name: brandName,
          headline: headline,
          shareable: true,
          profile_properties: {
            profile_id: profileId,
          },
        },
      ],
    };

    // Log the payload for debugging
    this.logger.log(
      `Creating creative with the following payload: ${JSON.stringify(payload)}`,
    );

    const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`;

    try {
      // Sending POST request to create the creative
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Log the successful response
      this.logger.log(
        `Creative created successfully: ${JSON.stringify(response.data)}`,
      );

      // Return the response data
      return response.data;
    } catch (error) {
      // Detailed error handling
      const errorDetails = error.response?.data || error.message;

      // Log the error response to assist with debugging
      this.logger.error(
        `Error creating creative: ${JSON.stringify(errorDetails)}`,
      );

      // Check for specific errors
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      }

      // Throw a general error if no specific message is found
      throw new Error(errorDetails?.message || 'Creative creation failed');
    }
  }

  async createCampaign(
    accessToken: string,
    name: string,
    adAccountId: string,
    startTime: string,
    objective: string,
  ) {
    try {
      const payload = {
        campaigns: [
          {
            name: name,
            ad_account_id: adAccountId,
            status: 'PAUSED',
            start_time: startTime,
            objective,
          },
        ],
      };
      const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/campaigns`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(
        error.response?.data?.message || 'campaign creation failed',
      );
    }
  }

  async createAdSquad(
    accessToken: string,
    name: string,
    campaignId: string,
    type: string,
    minAge: string,
    maxAge: string,
    gender: string,
    countryCodes: string[],
    budget: number,
    startTime: string,
    endTime: string,
    languages: string[],
    osType: string,
  ) {
    try {
      const geos = countryCodes.map((code) => ({
        country_code: code,
      }));
      const payload = {
        adsquads: [
          {
            name: name,
            status: 'PAUSED',
            campaign_id: campaignId,
            type: 'SNAP_ADS',
            targeting: {
              demographics: [
                {
                  min_age: minAge,
                  max_age: maxAge,
                  gender: gender,
                  languages: languages,
                },
              ],
              geos: geos,
              devices: [
                {
                  os_type: osType,
                },
              ],
            },
            bid_micro: (budget / 10) * 1000000,
            lifetime_budget_micro: budget * 1000000,
            start_time: startTime,
            end_time: endTime,
          },
        ],
      };
      const endpoint = `https://adsapi.snapchat.com/v1/campaigns/${campaignId}/adsquads`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(
        error.response?.data?.message || 'ad squad creation failed',
      );
    }
  }

  async createSnapAd(
    // userId: string,
    // walletId: string,
    objective: string,
    name: string,
    type: 'SNAP_ADS',
    minAge: string,
    maxAge: string,
    gender: string,
    countryCodes: string[],
    budget: number,
    startTime: string,
    endTime: string,
    brandName: string,
    headline: string,
    languages: string[],
    osType: string,
    file: Express.Multer.File,
  ) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully.' + accessToken);
      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';
      const fileType = file.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE';
      this.logger.log(fileType);
      // Step 1: Create media
      this.logger.log('Creating media...');
      const mediaResponse = await this.createMedia(
        accessToken,
        name,
        adAccountId,
        fileType,
      );
      this.logger.log(`${JSON.stringify(mediaResponse)}`);
      const mediaId = mediaResponse.media[0].media.id;

      this.logger.log(`Media created with ID: ${mediaId}`);

      // Step 2: Upload video
      this.logger.log('Uploading file...');
      const UploadedFile = await this.uploadFile(file, accessToken, mediaId);
      this.logger.log(`${JSON.stringify(UploadedFile)}`);
      this.logger.log('file uploaded successfully.');

      // Step 3: Create creative
      this.logger.log('Creating creative...');
      const creativeResponse = await this.createCreative(
        accessToken,
        adAccountId,
        mediaId,
        name,
        'SNAP_AD',
        brandName,
        headline,
        profileId,
      );
      this.logger.log(`${JSON.stringify(creativeResponse)}`);
      const creativeId = creativeResponse.creatives[0].creative.id;
      this.logger.log(`Creative created with ID: ${creativeId}`);

      // Step 4: Create campaign
      this.logger.log('Creating campaign...');
      const campaignResponse = await this.createCampaign(
        accessToken,
        name,
        adAccountId,
        startTime,
        objective,
      );
      const campaignId = campaignResponse.campaigns[0].campaign.id;
      this.logger.log(`Campaign created with ID: ${campaignId}`);

      // Step 5: Create ad squad
      this.logger.log('Creating ad squad...');
      const adSquadResponse = await this.createAdSquad(
        accessToken,
        name,
        campaignId,
        type,
        minAge,
        maxAge,
        gender,
        countryCodes,
        budget,
        startTime,
        endTime,
        languages,
        osType,
      );
      this.logger.log(`${JSON.stringify(adSquadResponse)}`);
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      this.logger.log(`Ad squad created with ID: ${adSquadId}`);
      const payload = {
        ads: [
          {
            ad_squad_id: adSquadId,
            creative_id: creativeId,
            name: name,
            type: 'SNAP_AD',
            status: 'PAUSED',
          },
        ],
      };
      const endpoint = `https://adsapi.snapchat.com/v1/adsquads/${adSquadId}/ads`;
      const response = await axios.post(
        `https://adsapi.snapchat.com/v1/adsquads/${adSquadId}/ads`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const ad = response.data;
      // const order = await this.orderService.createOrderWithTransaction(
      //   userId,
      //   walletId,
      //   'Snapchat snap',
      //   budget,
      //   {
      //     base: {
      //       campaign_id: campaignId,
      //       campaing_name: campaignResponse.campaigns[0].campaign.name,
      //       create_time: campaignResponse.campaigns[0].campaign.created_at,
      //       schedule_start_time: adSquadResponse.adsquads[0].adsquad.start_time,
      //       schedule_end_time: adSquadResponse.adsquads[0].adsquad.end_time,
      //       budget: budget,
      //       video: video
      //     },
      //     campaignResponse,
      //     mediaResponse,
      //     video,
      //     creativeResponse,
      //     adSquadResponse,
      //     ad
      //   }
      // )
      // // Step 7: Return success
      // return {
      //   ...order,
      //   details: order.details.base,
      // };
      return ad;
    } catch (error) {
      this.logger.error('Error during Snap Ad creation:', error.message);
      throw error;
    }
  }
}
