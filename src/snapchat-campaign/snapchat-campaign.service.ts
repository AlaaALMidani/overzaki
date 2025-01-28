import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { HttpService } from '@nestjs/axios';
import { OrderService } from '../order/order.service';
import gplay, { app } from 'google-play-scraper';
import * as appStoreScraper from 'app-store-scraper';
@Injectable()
export class SnapchatCampaignService {
  private readonly logger = new Logger(SnapchatCampaignService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly orderService: OrderService,
  ) { }

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
     console.log(JSON.stringify(response.data))
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      throw new Error(errorDetails?.message || 'File upload failed');
    }
  }

  private buildWebViewCreativePayload(
    adAccountId: string,
    mediaId: string,
    name: string,
    type: string,
    brandName: string,
    headline: string,
    profileId: string,
    callToAction: string,
    url: string,
  ): any {
    const payload = {
      creatives: [
        {
          ad_account_id: adAccountId,
          top_snap_media_id: mediaId,
          name: name,
          type: 'WEB_VIEW',
          brand_name: brandName,
          call_to_action: callToAction,
          headline: headline,
          shareable: true,
          profile_properties: {
            profile_id: profileId,
          },
          web_view_properties: {
            url: url,
          },
        },
      ],
    };

    return payload;
  }

  private buildCollectionCreativePayload(
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
    iosAppId?: string,
    androidAppUrl?: string,
    icon?: string,
    appName?: string,
  ): any {
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
          collection_properties: {
            interaction_zone_id: interactionZoneId,
            default_fallback_interaction_type: interactionType,
          },
        },
      ],
    };

    if (interactionType === 'WEB_VIEW') {
      payload.creatives[0].collection_properties.web_view_properties = { url: url };
    } else if (interactionType === 'DEEP_LINK') {
      payload.creatives[0].collection_properties.deep_link_properties = {
        deep_link_uri: url,
        app_name: appName,
        icon_media_id: icon,
      };

      if (iosAppId) {
        payload.creatives[0].collection_properties.deep_link_properties.ios_app_id = iosAppId;
      }
      if (androidAppUrl) {
        payload.creatives[0].collection_properties.deep_link_properties.android_app_url = androidAppUrl;
      }
    }

    return payload;
  }

  private buildPreviewCreativePayload(
    adAccountId: string,
    mediaId: string,
    name: string,
    type: string,
    brandName: string,
    headline: string,
    profileId: string,
    logoMediaId?: string,
    previewHeadline?: string,
  ): any {
    return {
      creatives: [
        {
          ad_account_id: adAccountId,
          name: name,
          type: type,
          brand_name: brandName,
          headline: headline,
          shareable: true,
          profile_properties: {
            profile_id: profileId,
          },
          render_type: 'STATIC',
          preview_properties: {
            preview_media_id: mediaId,
            logo_media_id: logoMediaId,
            preview_headline: previewHeadline,
          },
        },
      ],
    };
  }

  private buildSnapAdCreativePayload(
    adAccountId: string,
    mediaId: string,
    name: string,
    type: string,
    brandName: string,
    headline: string,
    profileId: string,
  ): any {
    return {
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
  }

  private getCreativePayloadBuilder(type: string): Function {
    const payloadBuilders = {
      COLLECTION: this.buildCollectionCreativePayload,
      PREVIEW: this.buildPreviewCreativePayload,
      SNAP_AD: this.buildSnapAdCreativePayload,
      WEB_VIEW: this.buildWebViewCreativePayload,
    };

    const builder = payloadBuilders[type];
    if (!builder) {
      throw new Error(`Unsupported creative type: ${type}`);
    }

    return builder.bind(this);
  }
  private async createDeepLinkCreative(
    accessToken: string,
    adAccountId: string,
    mediaId: string,
    name: string,
    brandName: string,
    headline: string,
    profileId: string,
    deepLinkUrl: string,
    callToAction: string,
    iosAppId?: string,
    androidAppUrl?: string,
    icon?: string,
    appName?: string,
  ): Promise<any> {
    try {
      // Build the payload for the DEEP_LINK creative
      let payload: any = {
        creatives: [
          {
            ad_account_id: adAccountId,
            top_snap_media_id: mediaId,
            name: name,
            type: 'DEEP_LINK',
            brand_name: brandName,
            headline: headline,
            shareable: true,
            call_to_action: callToAction,
            profile_properties: {
              profile_id: profileId,
            },
            deep_link_properties: {
              deep_link_uri: deepLinkUrl,
              app_name: appName,
              icon_media_id: icon,
            },
          },
        ],
      };
      if (iosAppId) {
        payload.creatives[0].deep_link_properties.ios_app_id = iosAppId;
      }
      if (androidAppUrl) {
        payload.creatives[0].deep_link_properties.android_app_url = androidAppUrl;
      }

      console.log('Deep Link Creative Payload:', JSON.stringify(payload, null, 2));

      // Make the API request to create the DEEP_LINK creative
      const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Deep Link Creative Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating DEEP_LINK creative:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(error.response?.data?.message || 'DEEP_LINK creative creation failed');
    }
  }
  private async createCompositeCreative(
    accessToken: string,
    adAccountId: string,
    mediaId: string,
    name: string,
    brandName: string,
    headline: string,
    profileId: string,
    creativeIds: string[],
    previewCreativeId?: string
  ): Promise<any> {
    try {
      // Build the payload directly
      let payload: any = {
        creatives: [
          {
            ad_account_id: adAccountId,
            name: name,
            type: 'COMPOSITE',
            headline: headline,
            brand_name: brandName,
            shareable: true,
            render_type: 'STATIC',
            profile_properties: {
              profile_id: profileId,
            },
            composite_properties: {
              creative_ids: creativeIds, // Use creativeIds
            },
          },
        ],
      };

      // Add preview_creative_id if provided
      if (previewCreativeId) {
        payload.creatives[0].preview_creative_id = previewCreativeId;
      }

      console.log('Composite Creative Payload:', payload);

      // Make the API request to create the composite creative
      const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Composite Creative Response:', response.data);
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(errorDetails?.message || 'Composite creative creation failed');
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
    callToAction?: string,
    interactionZoneId?: string,
    interactionType?: string,
    url?: string,
    iosAppId?: string,
    androidAppUrl?: string,
    icon?: string,
    appName?: string,
    logoMediaId?: string,
    previewHeadline?: string,
    creativeIds?: string[],
    previewCreativeId?: string,
  ): Promise<any> {
    try {
      const payloadBuilder = this.getCreativePayloadBuilder(type);
      const payload = payloadBuilder(
        adAccountId,
        mediaId,
        name,
        type,
        brandName,
        headline,
        profileId,
        callToAction,
        interactionZoneId,
        interactionType,
        url,
        iosAppId,
        androidAppUrl,
        icon,
        appName,
        logoMediaId,
        previewHeadline,
        creativeIds,
        previewCreativeId,
      );
      console.log(payload)
      const endpoint = `https://adsapi.snapchat.com/v1/adaccounts/${adAccountId}/creatives`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log(response.data)
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
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
    placement?: string
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
      let payload: any = {
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

      if (placement && placement == 'FEED') {
        payload.adsquads[0].placement_v2 = {
          snapchat_positions: [
            "FEED"
          ]
        }
      }
      const endpoint = `https://adsapi.snapchat.com/v1/campaigns/${campaignId}/adsquads`;
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log(response.data)
      return response.data;
    } catch (error) {
      console.log(' Error', error.response?.data?.message);
      throw new Error(
        error.response?.data?.message || 'Ad Squad creation failed',
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
      let payload: any = {
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
      if (type == 'STORY') {
        payload.ads[0].render_type = 'STATIC'
      }
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
    iosAppId?: string, // Optional iOS App ID
    androidAppUrl?: string,
    icon?: string,
  ): Promise<any> {
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

          // Add iOS App ID if provided
          if (iosAppId) {
            element.deep_link_properties.ios_app_id = iosAppId;
          }

          // Add Android App URL if provided
          if (androidAppUrl) {
            element.deep_link_properties.android_app_url = androidAppUrl;
          }

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
    languages: string[],
    countryCodes: string[],
    osType: string,
    budget: number,
    startTime: string,
    endTime: string,
    ads: {
      [key: string]: {
        brandName: string;
        headline: string;
        callToAction: string;
        url: string;
        file: string
      }
    }
  ) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';

      // Step 1: Create campaign
      this.logger.log('Creating campaign...');
      const campaignResponse = await this.createCampaign(
        accessToken,
        name,
        adAccountId,
        startTime,
        objective
      );
      const campaignId = campaignResponse.campaigns[0].campaign.id;
      this.logger.log(`Campaign created with ID: ${campaignId}`);

      // Step 2: Create ad squad
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
        osType
      );
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      this.logger.log(`Ad squad created with ID: ${adSquadId}`);

      // Step 3: Create ads and collect their data
      const adsData = [];
      for (const adKey in ads) {
        const ad = ads[adKey];

        // Step 3.1: Create and upload media
        const { mediaResponse, downloadLink } = await this.createAndUploadMedia(
          accessToken,
          adAccountId,
          ad.file,
          ad.brandName
        );
        this.logger.log(`Media uploaded for ad ${adKey}: ${downloadLink}`);

        // Step 3.2: Create creative
        this.logger.log('Creating creative...');
        const creativeResponse = await this.createCreative(
          accessToken,
          adAccountId,
          mediaResponse.media[0].media.id,
          ad.brandName,
          'SNAP_AD',
          ad.brandName,
          ad.headline,
          profileId
        );
        const creativeId = creativeResponse.creatives[0].creative.id;
        this.logger.log(`Creative created with ID: ${creativeId}`);

        // Step 3.3: Create ad using the `createAd` function
        this.logger.log('Creating ad...');
        const createdAd = await this.createAd(
          accessToken,
          adSquadId,
          creativeId,
          ad.brandName,
          'SNAP_AD'
        );
        this.logger.log(`Ad created with ID: ${createdAd.ads[0].ad.id}`);

        // Collect ad data for the order
        adsData.push({
          adId: createdAd.ads[0].ad.id,
          brandName: ad.brandName,
          headline: ad.headline,
          callToAction: ad.callToAction,
          url: ad.url,
          mediaFile: downloadLink,
          creative: creativeResponse.creatives[0].creative,
          media: mediaResponse.media[0].media,
        });
      }

      // Step 4: Create order with all ad data
      this.logger.log('Creating order...');
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
            maxAge,
            minAge,
          },
          ads: adsData,
          campaign: campaignResponse.campaigns[0].campaign,
          adSquad: adSquadResponse.adsquads[0].adsquad,
        }
      );
      this.logger.log('Order created successfully:', order._id);

      return {
        message: 'Snap Ads created successfully!',
        data: {
          orderID: order._id,
          order,
        },
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
    interactionType: string,
    ads: {
      [key: string]: {
        brandName: string;
        headline: string;
        mainFile: string;
        mainUrl: string;
        productUrls: string[];
        productsImages: string[];
        callToAction: string;
        iosAppId?: string;
        androidAppUrl?: string;
        icon?: string,
        appName?: string,
      };
    }
  ) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';

      // Step 1: Create campaign
      this.logger.log('Creating campaign...');
      const campaignResponse = await this.createCampaign(
        accessToken,
        name,
        adAccountId,
        startTime,
        objective
      );
      const campaignId = campaignResponse.campaigns[0].campaign.id;
      this.logger.log(`Campaign created with ID: ${campaignId}`);

      // Step 2: Create ad squad
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
        osType
      );
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      this.logger.log(`Ad squad created with ID: ${adSquadId}`);

      // Step 3: Create ads and collect their data
      const adsData = [];
      for (const adKey in ads) {
        const ad = ads[adKey];

        // Step 3.1: Handle product files for the ad
        const { mediaIds, productsMedia } = await this.handleProductMedia(
          accessToken,
          adAccountId,
          ad.productsImages,
          ad.brandName
        );
        this.logger.log(`Product media uploaded for ad ${adKey}: ${mediaIds}`);

        // Step 3.2: Create Creative Elements
        this.logger.log(`Creating Creative Elements for ad ${adKey}...`);
        this.logger.log('Creating creative for ad...');
        this.logger.log('Uploading icon media...');
        const { mediaResponse: iconMediaResponse, downloadLink: iconDownloadLink } =
          await this.createAndUploadMedia(
            accessToken,
            adAccountId,
            ad.icon,
            `${name}_icon`,
          );
        const iconMediaId = iconMediaResponse.media[0].media.id;
        this.logger.log(`icon media created with ID: ${iconMediaId}`);

        const creativeElementsResponse = await this.createCreativeElements(
          accessToken,
          adAccountId,
          ad.brandName,
          interactionType,
          mediaIds,
          ad.productUrls,
          ad.appName,
          ad.iosAppId,
          ad.androidAppUrl,
          iconMediaId
        );
        this.logger.log(JSON.stringify(creativeElementsResponse));

        // Step 3.3: Extract Creative Element IDs
        const creativeElementsIds = creativeElementsResponse.creative_elements.map(
          (element) => element.creative_element.id
        );
        this.logger.log(`Creative Element IDs for ad ${adKey}: ${creativeElementsIds}`);

        // Step 3.4: Create an Interaction Zone
        this.logger.log(`Creating Interaction Zone for ad ${adKey}...`);
        const interactionZoneResponse = await this.createInteraction(
          accessToken,
          adAccountId,
          ad.brandName,
          ad.callToAction,
          creativeElementsIds
        );
        const interactionZoneId =
          interactionZoneResponse.interaction_zones[0].interaction_zone.id;
        this.logger.log(`Interaction zone created with ID: ${interactionZoneId}`);

        // Step 3.5: Handle main file for the ad
        const { mediaResponse: mainMediaResponse, downloadLink: mainDownloadLink } =
          await this.createAndUploadMedia(
            accessToken,
            adAccountId,
            ad.mainFile,
            ad.brandName
          );
        this.logger.log(`Main media uploaded for ad ${adKey}: ${mainDownloadLink}`);

        // Step 3.6: Create creative for the ad
        this.logger.log('Creating creative for ad...');
        const creativeResponse = await this.createCreative(
          accessToken,
          adAccountId,
          mainMediaResponse.media[0].media.id,
          ad.brandName,
          'COLLECTION',
          ad.brandName,
          ad.headline,
          profileId,
          interactionZoneId,
          interactionType,
          ad.mainUrl,
          ad.iosAppId,
          ad.androidAppUrl,
          iconMediaId,
          ad.appName,
        );
        const creativeId = creativeResponse.creatives[0].creative.id;
        this.logger.log(`Creative created with ID: ${creativeId}`);

        // Step 3.7: Create ad using the `createAd` function
        this.logger.log('Creating ad...');
        const createdAd = await this.createAd(
          accessToken,
          adSquadId,
          creativeId,
          ad.brandName,
          'COLLECTION'
        );
        this.logger.log(`Ad created with ID: ${createdAd.ads[0].ad.id}`);

        // Collect ad data for the order
        adsData.push({
          adId: createdAd.ads[0].ad.id,
          brandName: ad.brandName,
          headline: ad.headline,
          callToAction: ad.callToAction,
          mainUrl: ad.mainUrl,
          mainMediaFile: mainDownloadLink,
          productsMedia,
          creative: creativeResponse.creatives[0].creative,
          media: mainMediaResponse.media[0].media,
          interactionZone: interactionZoneResponse.interaction_zones[0],
          creativeElements: creativeElementsResponse.creative_elements[0],
          ...(ad.appName && { app: { appName: ad.appName, icon: iconDownloadLink } })
        });
      }

      // Step 4: Create order with all ad data
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
            maxAge,
            minAge,
          },
          ads: adsData,
          campaign: campaignResponse.campaigns[0].campaign,
          adSquad: adSquadResponse.adsquads[0].adsquad,
        }
      );
      this.logger.log('Order created successfully:', order._id);

      return {
        message: 'Collection Ads created successfully!',
        data: {
          orderID: order._id,
          order,
        },
      };
    } catch (error) {
      this.logger.error('Error during Collection Ad creation:', error.message);
      throw error;
    }
  }

  async createExploreAd(
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
    ads: {
      [key: string]: {
        brandName: string,
        headline: string,
        logo: string,
        cover: string,
        coverHeadline: string,
        images: string[],
        mainUrl: string,
        interactionType: string,
        callToAction: string,
        iosAppId?: string,
        androidAppUrl?: string,
        icon?: string,
        appName?: string,
      }
    }
  ) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);

      const adAccountId = '993c271d-05ce-4c6a-aeeb-13b62b657ae6';
      const profileId = 'aca22c35-6fee-4912-a3ad-9ddc20fd21b7';

      // Step 1: Create campaign
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

      // Step 2: Create ad squad
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
        'FEED'
      );
      const adSquadId = adSquadResponse.adsquads[0].adsquad.id;
      // Step 3: Create ads and collect their data
      const adsData = [];
      for (const adKey in ads) {
        let imagesDownloadLinks = []
        const ad = ads[adKey];
        // Step 1: Upload logo media
        this.logger.log('Uploading logo media...');
        const { mediaResponse: logoMediaResponse, downloadLink: logoDownloadLink } =
          await this.createAndUploadMedia(
            accessToken,
            adAccountId,
            ad.logo,
            `${name}_logo`,
          );
        const logoMediaId = logoMediaResponse.media[0].media.id;
        this.logger.log(`Logo media created with ID: ${logoMediaId}`);

        // Step 2: Upload cover media
        this.logger.log('Uploading cover media...');
        const { mediaResponse: coverMediaResponse, downloadLink: coverDownloadLink } =
          await this.createAndUploadMedia(
            accessToken,
            adAccountId,
            ad.cover,
            `${name}_cover`,
          );
        const coverMediaId = coverMediaResponse.media[0].media.id;
        this.logger.log(`Cover media created with ID: ${coverMediaId}`);

        // Step 3: Create creative
        this.logger.log('Creating creative...');
        const creativeResponse = await this.createCreative(
          accessToken,
          adAccountId,
          coverMediaId,
          name,
          'PREVIEW',
          ad.brandName,
          ad.headline,
          profileId,
          logoMediaId,
          ad.coverHeadline
        );
        console.log(creativeResponse)
        const PreviewCreativeId = creativeResponse.creatives[0].creative.id;
        this.logger.log(`Creative created with ID: ${PreviewCreativeId}`);
        // Step 4: Create non-dynamic creatives for each image
        this.logger.log('Creating non-dynamic creatives...');
        const nonDynamicCreativeIds: string[] = [];
        let iconMediaId;
        let iconDownloadLink;
        if (ad.icon) {
          this.logger.log('Uploading icon media...');
          const { mediaResponse: iconMediaResponse, downloadLink: iconDownloadLinkTemp } =
            await this.createAndUploadMedia(
              accessToken,
              adAccountId,
              ad.icon,
              `${name}_icon`,
            );
          iconMediaId = iconMediaResponse.media[0].media.id;
          iconDownloadLink = iconDownloadLinkTemp;
          this.logger.log(`icon media created with ID: ${iconMediaId}`);
        }

        for (let i = 0; i < ad.images.length; i++) {
          const image = ad.images[i];
          // Step 4.1: Create and upload media for the image
          const { mediaResponse: imageMediaResponse, downloadLink: imageDownloadLink } =
            await this.createAndUploadMedia(
              accessToken,
              adAccountId,
              image,
              `${name}_image_${i + 1}`,
            );
          const imageMediaId = imageMediaResponse.media[0].media.id;
          this.logger.log(`Image media created with ID: ${imageMediaId}`);
          imagesDownloadLinks.push({
            imageId: imageMediaId,
            downloadLink: imageDownloadLink
          })
          // Step 4.2: Create a non-dynamic creative
          let nonDynamicCreativeResponse;
          switch (ad.interactionType) {
            case 'WEB_VIEW':
              nonDynamicCreativeResponse = await this.createCreative(
                accessToken,
                adAccountId,
                imageMediaId,
                `${name}_non_dynamic_${i + 1}`,
                'WEB_VIEW',
                ad.brandName,
                ad.headline,
                profileId,
                ad.callToAction,
                ad.mainUrl,
              );
              break;

            case 'DEEP_LINK':
              nonDynamicCreativeResponse = await this.createDeepLinkCreative(
                accessToken,
                adAccountId,
                imageMediaId,
                `${name}_non_dynamic_${i + 1}`,
                ad.brandName,
                ad.headline,
                profileId,
                ad.mainUrl,
                ad.callToAction,
                ad.iosAppId,
                ad.androidAppUrl,
                iconMediaId,
                ad.appName
              );
              console.log('Deep Link Creative Response:', nonDynamicCreativeResponse);
              break;
            default:
              throw new Error(`Unsupported interaction type: ${ad.interactionType}`);
          }
          const nonDynamicCreativeId =
            nonDynamicCreativeResponse.creatives[0].creative.id;
          nonDynamicCreativeIds.push(nonDynamicCreativeId);
          this.logger.log(
            `Non-dynamic creative created with ID: ${nonDynamicCreativeId}`,
          );
        }
        // Step 5: Create Composite Creative
        this.logger.log('Creating composite creative...');
        console.log('Non-dynamic creative IDs:', nonDynamicCreativeIds);
        console.log('Preview creative ID:', PreviewCreativeId);

        const compositeCreativeResponse = await this.createCompositeCreative(
          accessToken,
          adAccountId,
          coverMediaId, // Media ID for the composite creative
          `${name}_composite`, // Name of the composite creative
          ad.brandName, // Brand name
          ad.headline, // Headline
          profileId, // Profile ID
          nonDynamicCreativeIds, // Array of creative IDs for the composite
          PreviewCreativeId
        );

        const compositeCreativeId = compositeCreativeResponse.creatives[0].creative.id;
        this.logger.log(`Composite creative created with ID: ${compositeCreativeId}`);

        // Step 8: Create ad
        this.logger.log('Creating ad...');
        const adResponse = await this.createAd(
          accessToken,
          adSquadId,
          compositeCreativeId,
          name,
          'STORY',
        );
        this.logger.log(JSON.stringify(adResponse))
        this.logger.log('Ad created with ID: ' + adResponse.ads[0].ad.id);
        adsData.push({
          adId: adResponse.ads[0].ad.id,
          brandName: ad.brandName,
          headline: ad.headline,
          callToAction: ad.callToAction,
          mainUrl: ad.mainUrl,
          logo: logoDownloadLink,
          cover: coverDownloadLink,
          images: imagesDownloadLinks,
          creative: creativeResponse.creatives[0].creative,
          ...(ad.appName && { app: { appName: ad.appName, icon: iconDownloadLink } })

        });
      }
      // Step 9: Create order (commented out for now)
      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Snapchat Explore Ad',
        budget,
        {
          base: {
            campaign_id: campaignId,
            campaign_name: campaignResponse.campaigns[0].campaign.name,
            create_time: campaignResponse.campaigns[0].campaign.created_at,
            schedule_start_time: adSquadResponse.adsquads[0].adsquad.start_time,
            schedule_end_time: adSquadResponse.adsquads[0].adsquad.end_time,
            budget: budget,
            maxAge,
            minAge,
          },
          ads: adsData,
          campaign: campaignResponse.campaigns[0].campaign,
          adSquadResponse: adSquadResponse.adsquads[0].adsquad,
        },
      );
      this.logger.log('Order created successfully:', order);

      return {
        orderID: order._id,
        order: order
      };
    } catch (error) {
      this.logger.error('Error during Explore Ad creation:', error.message);
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

  async generateCampaignReport(orderId: string) {
    try {
      this.logger.log('Refreshing access token...');
      const accessToken = await this.refreshAccessToken();
      this.logger.log('Access token refreshed successfully: ' + accessToken);
      const order = await this.orderService.getOrderById(orderId);
      const campaignId = order.details.base.campaign_id;
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

      // Structure the report
      const report = {
        serviceName: order.serviceName,
        status: order.status,
        CampaignStatus: campaignDetails.status,
        stats: campaignStats.total_stats[0].total_stat.stats,
        details: order.details,
      };

      return report;
    } catch (error) {
      this.logger.error('Error generating campaign report:', error.message);
      throw new Error('Failed to generate campaign report');
    }
  }

  private async handleProductMedia(
    accessToken: string,
    adAccountId: string,
    productFiles: string[],
    name: string,
  ): Promise<{ mediaIds: string[]; productsMedia: string[] }> {
    const mediaIds: string[] = [];
    const productsMedia: string[] = [];

    for (let i = 0; i < productFiles.length; i++) {
      const productFile = productFiles[i];
      if (!productFile) {
        this.logger.warn(`Product ${i + 1} file is missing. Skipping...`);
        continue;
      }

      // Use the existing helper method to create and upload media
      const { mediaResponse, downloadLink } = await this.createAndUploadMedia(
        accessToken,
        adAccountId,
        productFile,
        name,
      );

      mediaIds.push(mediaResponse.media[0].media.id);
      productsMedia.push(`product${i + 1}` + downloadLink);
    }

    return { mediaIds, productsMedia };
  }

  private async createAndUploadMedia(
    accessToken: string,
    adAccountId: string,
    file: string,
    name: string,
  ): Promise<{ mediaResponse: any; downloadLink: string }> {
    try {
      // Extract file type and buffer from the base64 string
      const base64Data = file.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid base64 file data');
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      const fileType = file.startsWith('data:image') ? 'IMAGE' : 'VIDEO';
      const fileName = `uploaded_file_${Date.now()}.${fileType === 'IMAGE' ? 'png' : 'mp4'}`;

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
      console.log(uploadedFile)
      this.logger.log('File uploaded successfully.');

      return {
        mediaResponse,
        downloadLink: uploadedFile.result.download_link,
      };
    } catch (error) {
      this.logger.error('Error in createAndUploadMedia:', error.message);
      throw error;
    }
  }

  private async getAppleAppStoreId(
    appName: string,
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      const results = await appStoreScraper.search({
        term: appName,
        num: 10,
      });

      const apps = [];

      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          apps.push({
            appId: results[i].id,
            title: results[i].title,
            icon: results[i].icon,
          });
        }
        return apps;
      } else {
        this.logger.warn(
          `No results found for app name: ${appName} in Apple App Store`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching Apple App Store ID:', error.message);
      throw new Error(`Failed to fetch Apple App Store ID: ${error.message}`);
    }
  }

  private async getGooglePlayAppId(
    appName: string,
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      const results = await gplay.search({
        term: appName,
        num: 10,
      });

      const apps = [];

      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          apps.push({
            appId: results[i].appId,
            title: results[i].title,
            icon: results[i].icon,
          });
        }
        return apps;
      } else {
        this.logger.warn(
          `No results found for app name: ${appName} in Google Play Store`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error('Error fetching Google Play app ID:', error.message);
      throw new Error(`Failed to fetch Google Play app ID: ${error.message}`);
    }
  }

  async getAppId(
    appName: string,
    store: 'google' | 'apple',
  ): Promise<Array<{ appId: string; title: string; icon: string }> | null> {
    try {
      if (store === 'google') {
        return await this.getGooglePlayAppId(appName);
      } else if (store === 'apple') {
        return await this.getAppleAppStoreId(appName);
      } else {
        throw new Error('Invalid store parameter. Use "google" or "apple".');
      }
    } catch (error) {
      this.logger.error('Error fetching app ID:', error.message);
      throw new Error(`Failed to fetch app ID: ${error.message}`);
    }
  }

}
