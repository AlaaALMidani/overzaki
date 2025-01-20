import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { HttpService } from '@nestjs/axios';
import { OrderService } from '../order/order.service';

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
    fileBuffer: Buffer,
    accessToken: string,
    mediaId: string,
    fileName: string,
  ): Promise<any> {
    const endpoint = `https://adsapi.snapchat.com/v1/media/${mediaId}/upload`;

    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName });

    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...formData.getHeaders(),
        },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'File upload failed');
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
    interactionZoneId?: string,
    interactionType?: string,
    url?: string,
  ): Promise<any> {
    const payload: any = {
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
    if (type == 'COLLECTION') {
      payload.creatives[0].collection_properties = {
        interaction_zone_id: interactionZoneId,
        default_fallback_interaction_type: interactionType,
      };
      switch (interactionType) {
        case 'WEB_VIEW':
          payload.creatives[0].collection_properties.web_view_properties = {
            url: url,
          };
          break;
        case 'DEEP_LINK':
          payload.creatives[0].collection_properties.deep_link_properties = {
            deep_link_uri: url,
            app_name: name,
            icon_media_id: mediaId,
          };
          break;
        default:
          throw new Error(
            "Unsupported interaction type. Use 'WEB_VIEW' or 'DEEP_LINK'.",
          );
      }
    }

    const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`;
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      }
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
            objective: objective,
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
      const devices = [];
      if (osType === 'iOS' || osType === 'ANDROID') {
        devices.push({ os_type: osType });
      } else {
        devices.push(
          { os_type: 'iOS' },
          { os_type: 'ANDROID' },
          { os_type: 'WEB' },
        );
      }
      const demographics = [];
      if (gender === 'MALE' || gender === 'FEMALE') {
        demographics.push({
          gender: gender,
          min_age: minAge,
          max_age: maxAge,
          languages: languages,
        });
      } else {
        demographics.push(
          {
            gender: 'MALE',
            min_age: minAge,
            max_age: maxAge,
            languages: languages,
          },
          {
            gender: 'FEMALE',
            min_age: minAge,
            max_age: maxAge,
            languages: languages,
          },
          {
            gender: 'OTHER',
            min_age: minAge,
            max_age: maxAge,
            languages: languages,
          },
        );
      }
      const payload = {
        adsquads: [
          {
            name: name,
            status: 'PAUSED',
            campaign_id: campaignId,
            type: type,
            targeting: {
              demographics: demographics,
              geos: geos,
              devices: devices,
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
        error.response?.data?.message || 'interaction creation failed',
      );
    }
  }

  async createAd(
    accessToken: string,
    adSquadId: string,
    creativeId: string,
    name: string,
    type: string,
  ) {
    try {
      const endpoint = `https://adsapi.snapchat.com/v1/adsquads/${adSquadId}/ads`;
      const payload = {
        ads: [
          {
            ad_squad_id: adSquadId,
            creative_id: creativeId,
            name: name,
            type: type,
            status: 'PAUSED',
          },
        ],
      };
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(error.response?.data?.message || 'Ad creation failed');
    }
  }

  async createCreativeElements(
    accessToken: string,
    adAccountId: string,
    baseName: string,
    interactionType: string,
    mediaIds: string[],
    urls: string[],
    appName?: string,
  ) {
    const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creative_elements`;
    if (mediaIds.length !== urls.length) {
      throw new Error('The number of media IDs must match the number of URLs.');
    }
    const creativeElements = mediaIds.map((mediaId, index) => {
      const element: any = {
        name: `${baseName} ${index + 1}`,
        type: 'BUTTON',
        interaction_type: interactionType,
        button_properties: {
          button_overlay_media_id: mediaId,
        },
      };
      switch (interactionType) {
        case 'WEB_VIEW':
          element.web_view_properties = { url: urls[index] };
          break;
        case 'DEEP_LINK':
          element.deep_link_properties = {
            deep_link_uri: urls[index],
            app_name: appName,
            icon_media_id: mediaId,
          };
          break;
        default:
          throw new Error(
            "Unsupported interaction type. Use 'WEB_VIEW' or 'DEEP_LINK'.",
          );
      }
      return element;
    });
    const payload = {
      creative_elements: creativeElements,
    };
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to create creative elements';
      throw new Error(`Error creating creative elements: ${errorMessage}`);
    }
  }

  async createInteraction(
    accessToken: string,
    adAccountId: string,
    name: string,
    headline: string,
    creativeElementsIds: string[],
  ) {
    try {
      console.log(headline);
      const payload = {
        interaction_zones: [
          {
            name: name,
            creative_element_ids: creativeElementsIds,
            headline: headline,
          },
        ],
      };
      console.log(headline);
      const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/interaction_zones`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(
        error.response?.data?.message || 'interaction creation failed',
      );
    }
  }

  async createSnapAd(
    userId: string,
    walletId: string,
    objective: string,
    name: string,
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
    file: string, // Only base64-encoded string
  ) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';

      // Extract file type and buffer from the base64 string
      const base64Data = file.split(';base64,').pop(); // Remove the data URL prefix
      if (!base64Data) {
        throw new Error('Invalid base64 file data');
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      const fileType = file.startsWith('data:image') ? 'IMAGE' : 'VIDEO';
      const fileName = `uploaded_file_${Date.now()}.${fileType === 'IMAGE' ? 'jpg' : 'mp4'}`;

      this.logger.log(`File type: ${fileType}`);

      // Step 1: Create media
      this.logger.log('Creating media...');
      const mediaResponse = await this.createMedia(
        accessToken,
        name,
        adAccountId,
        fileType,
      );
      const mediaId = mediaResponse.media[0].media.id;
      this.logger.log(`Media created with ID: ${mediaId}`);

      // Step 2: Upload file
      this.logger.log('Uploading file...');
      const uploadedFile = await this.uploadFile(
        fileBuffer,
        accessToken,
        mediaId,
        fileName,
      );
      this.logger.log('File uploaded successfully.');

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
      this.logger.log(JSON.stringify(creativeResponse));
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
        'SNAP_ADS',
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
      this.logger.log(JSON.stringify(adSquadResponse));
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      this.logger.log(`Ad squad created with ID: ${adSquadId}`);
      // Step 6: Create ad
      this.logger.log('Creating ad...');
      const adPayload = {
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
      const response = await axios.post(endpoint, adPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const ad = response.data;
      this.logger.log(`Ad created with ID: ${ad.ads[0].ad.id}`);

      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Snapchat Snap Ad',
        budget,
        {
          base: {
            campaign_id: campaignId,
            campaign_name: campaignResponse.campaigns[0].campaign.name,
            create_time: campaignResponse.campaigns[0].campaign.created_at,
            schedule_start_time: adSquadResponse.adsquads[0].adsquad.start_time,
            schedule_end_time: adSquadResponse.adsquads[0].adsquad.end_time,
            budget: budget,
            uploadedFile,
          },
          campaign: campaignResponse.campaigns[0],
          media: mediaResponse,
          creative: creativeResponse,
          file: uploadedFile,
          adSquadResponse: adSquadResponse,
          ad: ad,
        },
      );
      this.logger.log(
        'Order created successfully:',
        order._id,
        ' ',
        campaignId,
      );

      // Step 8: Return success
      return {
        orderID: order._id,
        order,
      };
    } catch (error) {
      this.logger.error('Error during Snap Ad creation:', error.message);
      throw error;
    }
  }

  async createCollectionAd(
    userId: string,
    walletId: string,
    name: string,
    objective: string,
    minAge: string,
    maxAge: string,
    gender: string,
    languages: string[],
    countryCodes: string[],
    osType: string,
    budget: number,
    startTime: string,
    endTime: string,
    brandName: string,
    headline: string,
    interactionType: string,
    mainUrl: string,
    productUrls: string[],
    callToActoin: string,
    mainFile: string, // Base64-encoded string
    product1: string, // Base64-encoded string
    product2: string, // Base64-encoded string
    product3: string, // Base64-encoded string
    product4: string, // Base64-encoded string
  ) {
    try {
      console.log(callToActoin);
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';

      const mediaIds: string[] = [];

      const productFiles = [product1, product2, product3, product4];

      // Step 1: Create media and upload files for all products
      for (let i = 0; i < productFiles.length; i++) {
        const productFile = productFiles[i];
        if (!productFile) {
          this.logger.warn(`Product ${i + 1} file is missing. Skipping...`);
          continue;
        }

        // Extract file type and buffer from the base64 string
        const base64Data = productFile.split(';base64,').pop(); // Remove the data URL prefix
        if (!base64Data) {
          throw new Error(`Invalid base64 file data for product ${i + 1}`);
        }

        const fileBuffer = Buffer.from(base64Data, 'base64');
        const fileType = productFile.startsWith('data:image')
          ? 'IMAGE'
          : 'VIDEO';
        const fileName = `product_${i + 1}_${Date.now()}.${fileType === 'IMAGE' ? 'jpg' : 'mp4'}`;

        this.logger.log(
          `Processing product ${i + 1} with file type: ${fileType}`,
        );

        // Create media
        this.logger.log(`Creating media for product ${i + 1}...`);
        const mediaResponse = await this.createMedia(
          accessToken,
          name,
          adAccountId,
          fileType,
        );
        const mediaId = mediaResponse.media[0].media.id;
        this.logger.log(
          `Media created for product ${i + 1} with ID: ${mediaId}`,
        );

        // Upload file
        this.logger.log(`Uploading file for product ${i + 1}...`);
        await this.uploadFile(fileBuffer, accessToken, mediaId, fileName);
        this.logger.log(`File uploaded successfully for product ${i + 1}.`);

        mediaIds.push(mediaId);
      }

      this.logger.log('All media IDs:', mediaIds);

      // Step 2: Create Creative Elements
      this.logger.log(`Creating Creative Elements...`);
      const creativeElementsResponse = await this.createCreativeElements(
        accessToken,
        adAccountId,
        name,
        interactionType,
        mediaIds,
        productUrls,
        name,
      );
      console.log(creativeElementsResponse);
      this.logger.log(JSON.stringify(creativeElementsResponse));

      // Step 3: Extract Creative Element IDs
      const creativeElementsIds =
        creativeElementsResponse.creative_elements.map(
          (element) => element.creative_element.id,
        );
      this.logger.log('All Creative Element IDs:', creativeElementsIds);

      // Step 4: Create an Interaction Zone
      this.logger.log(`Creating Interaction Zone...`);
      console.log(callToActoin);
      this.logger.log(callToActoin);
      const interactionZoneResponse = await this.createInteraction(
        accessToken,
        adAccountId,
        name,
        callToActoin,
        creativeElementsIds,
      );
      console.log(interactionZoneResponse);
      this.logger.log(JSON.stringify(interactionZoneResponse));
      const interactionZoneId =
        interactionZoneResponse.interaction_zones[0].interaction_zone.id;
      this.logger.log(`Interaction zone created with ID: ${interactionZoneId}`);

      // Step 5: Handle main file
      const mainFileBase64Data = mainFile.split(';base64,').pop();
      if (!mainFileBase64Data) {
        throw new Error('Invalid base64 file data for main file');
      }

      const mainFileBuffer = Buffer.from(mainFileBase64Data, 'base64');
      const mainFileType = mainFile.startsWith('data:image')
        ? 'IMAGE'
        : 'VIDEO';
      const mainFileName = `main_file_${Date.now()}.${mainFileType === 'IMAGE' ? 'jpg' : 'mp4'}`;

      this.logger.log(`Main file type: ${mainFileType}`);

      // Step 6: Create media for main file
      this.logger.log('Creating media for main file...');
      const mainMediaResponse = await this.createMedia(
        accessToken,
        name,
        adAccountId,
        mainFileType,
      );
      const mainMediaId = mainMediaResponse.media[0].media.id;
      this.logger.log(`Media created for main file with ID: ${mainMediaId}`);

      // Step 7: Upload main file
      this.logger.log('Uploading main file...');
      const uploadedMainFile = await this.uploadFile(
        mainFileBuffer,
        accessToken,
        mainMediaId,
        mainFileName,
      );
      this.logger.log('Main file uploaded successfully.');

      // Step 8: Create creative
      this.logger.log('Creating creative...');
      const creativeResponse = await this.createCreative(
        accessToken,
        adAccountId,
        mainMediaId,
        name,
        'COLLECTION',
        brandName,
        headline,
        profileId,
        interactionZoneId,
        interactionType,
        mainUrl,
      );
      console.log(creativeResponse);
      const creativeId = creativeResponse.creatives[0].creative.id;
      this.logger.log(`Creative created with ID: ${creativeId}`);

      // Step 9: Create campaign
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

      // Step 10: Create ad squad
      this.logger.log('Creating ad squad...');
      const adSquadResponse = await this.createAdSquad(
        accessToken,
        name,
        campaignId,
        'SNAP_ADS',
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
      this.logger.log(JSON.stringify(adSquadResponse));
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      this.logger.log(`Ad squad created with ID: ${adSquadId}`);

      // Step 11: Create ad
      this.logger.log('Creating ad...');
      const adResponse = await this.createAd(
        accessToken,
        adSquadId,
        creativeId,
        name,
        'COLLECTION',
      );
      this.logger.log('Ad created with ID: ' + adResponse.ads[0].ad.id);
      this.logger.log('Creating order...');
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Snapchat Collection Ad',
        budget,
        {
          base: {
            campaign_id: campaignId,
            campaign_name: campaignResponse.campaigns[0].campaign.name,
            create_time: campaignResponse.campaigns[0].campaign.created_at,
            schedule_start_time: adSquadResponse.adsquads[0].adsquad.start_time,
            schedule_end_time: adSquadResponse.adsquads[0].adsquad.end_time,
            budget: budget,
            main_media_id: mainMediaId,
            product_media_ids: mediaIds,
          },
          campaign: campaignResponse.campaigns[0],
          adSquad: adSquadResponse.adsquads[0],
          ad: adResponse.ads[0],
          media: mainMediaResponse,
          creative: creativeResponse,
          file: uploadedMainFile,
          interactionZone: interactionZoneResponse.interaction_zones[0],
          creativeElements: creativeElementsResponse.creative_elements,
        },
      );
      this.logger.log('Order created successfully:', order);

      return {
        ...adResponse,
        order,
      };
    } catch (error) {
      this.logger.error('Error during Collection Ad creation:', error.message);
      throw error;
    }
  }

  async getCampaignStats(
    accessToken: string,
    campaignId: string,
    startTime: string,
    granularity: string,
  ) {
    const endpoint = `https://adsapi.snapchat.com/v1/campaigns/${campaignId}/stats`;

    const fields = [
      'impressions',
      'spend',
      'swipes',
      'video_views',
      'frequency',
      'quartile_1',
      'quartile_2',
      'quartile_3',
      'view_completion',
      'screen_time_millis',
      'shares',
      'saves',
      'story_opens',
    ];

    const params = {
      fields: fields.join(','),
    };

    try {
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching campaign stats:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error('Failed to fetch campaign stats');
    }
  }

  async getCampaignDetails(accessToken: string, campaignId: string) {
    const endpoint = `https://adsapi.snapchat.com/v1/campaigns/${campaignId}`;

    try {
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.campaigns[0].campaign;
    } catch (error) {
      this.logger.error('Error fetching campaign details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error('Failed to fetch campaign details');
    }
  }

  async generateCampaignReport(campaignId: string, orderId: string) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const campaignDetails = await this.getCampaignDetails(
        accessToken,
        campaignId,
      );

      const campaignStats = await this.getCampaignStats(
        accessToken,
        campaignId,
        campaignDetails.start_time,
        'DAY',
      );

      const order = await this.orderService.getOrderById(orderId);

      // Structure the report
      const report = {
        stats: campaignStats.total_stats,
        details: order.details,
        status: order.status,
        CampaignStatus: campaignDetails.status,
      };

      return report;
    } catch (error) {
      this.logger.error('Error generating campaign report:', error.message);
      throw new Error('Failed to generate campaign report');
    }
  }
}
