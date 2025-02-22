import { lastValueFrom } from 'rxjs';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import * as dotenv from 'dotenv';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';

import { HttpService } from '@nestjs/axios';

dotenv.config();

@Injectable()
export class FacebookCampaignService extends PassportStrategy(
  Strategy,
  'facebook',
) {
  private readonly BASE_URL = 'https://graph.facebook.com/v21.0';
  private readonly logger = new Logger(FacebookCampaignService.name);

  constructor(private readonly httpService: HttpService) {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    return { profile, accessToken };
  }

  async getPixels(accessToken: string, adAccountId: string) {
    const url = `${this.BASE_URL}/act_${adAccountId}/owned_pixels`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch pixels: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  async getPages(accessToken: string) {
    const url = `${this.BASE_URL}/me/accounts`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch pages: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  async getPagePosts(accessToken: string, pageId: string) {
    const url = `${this.BASE_URL}/${pageId}/posts`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch posts: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  // Fetch Ad Accounts
  async fetchAdAccounts(accessToken: string) {
    const url = `${this.BASE_URL}/me/adaccounts`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      return response.data.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || 'Unknown error occurred';
      throw new Error(`Failed to fetch ad accounts: ${errorMessage}`);
    }
  }

  // Create Campaign
  async createCampaign(
    accessToken: string,
    adAccountId: string,
    campaignName: string,
    objective: string,
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/campaigns`;
    const validObjectives = [
      'OUTCOME_LEADS',
      'OUTCOME_SALES',
      'OUTCOME_ENGAGEMENT',
      'OUTCOME_AWARENESS',
      'OUTCOME_TRAFFIC',
      'OUTCOME_APP_PROMOTION',
    ];

    // if (!validObjectives.includes(objective)) {
    //   throw new Error(
    //     `Invalid objective: ${objective}. Valid objectives are: ${validObjectives.join(', ')}`,
    //   );
    // }
    const payload = {
      name: campaignName,
      objective: objective,
      special_ad_categories: ['NONE'],
      status: 'PAUSED',
      access_token: accessToken,
    };
    try {
      const response = await lastValueFrom(
        this.httpService.post(url, payload, {
          params: { access_token: accessToken },
        }),
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || 'Unknown error occurred';
      throw new Error(`Failed to create campaign: ${errorMessage}`);
    }
  }

  // Create Ad Sets
  async createAdSets(
    accessToken: string,
    adAccountId: string,
    name: string,
    campaignId: string,
    objective: string,
    budget: number,
    startTime: string,
    endTime: string,
    ageMin: number,
    ageMax: number,
    countries: string[],
    genders: number[],
    platform: 'facebook' | 'instagram',
    placement: 'feed' | 'story' | 'reels',
    osType: 'ALL' | 'IOS' | 'Android',
    interests: string[],
    languages: number[],
    applicationId?: string,
    objectStoreUrl?: string,
    pageId?: string,
    pixelId?: string,
    customConversionId?: string,
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/adsets`;

    const payload: any = {
      name,
      lifetime_budget: budget,
      campaign_id: campaignId,
      start_time: startTime,
      end_time: endTime,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: {
        age_min: ageMin,
        age_max: ageMax,
        geo_locations: { countries },
        publisher_platforms: [platform],
        user_os: osType === 'ALL' ? ['IOS', 'Android'] : [osType],
        interests: interests,
        genders: genders,
        locales: languages,
      },
      status: 'PAUSED',
      access_token: accessToken,
    };

    const objectiveMapping: Record<string, any> = {
      OUTCOME_TRAFFIC: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
      },
      OUTCOME_AWARENESS: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        frequency_control_specs: [
          { event: 'IMPRESSIONS', interval_days: 7, max_frequency: 3 },
        ],
      },
      OUTCOME_ENGAGEMENT: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'POST_ENGAGEMENT',
      },
      OUTCOME_LEADS: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LEAD_GENERATION',
        promoted_object: { page_id: pageId },
      },
      OUTCOME_SALES: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'CONVERSIONS',
        promoted_object: {
          pixel_id: pixelId,
          custom_conversion_id: customConversionId,
        },
      },
      OUTCOME_APP_PROMOTION: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'APP_INSTALLS',
        promoted_object:
          applicationId && objectStoreUrl
            ? {
                application_id: applicationId,
                object_store_url: objectStoreUrl,
              }
            : undefined,
      },
    };

    if (objective in objectiveMapping) {
      Object.assign(payload, objectiveMapping[objective]);
    } else {
      throw new Error(`Unsupported objective: ${objective}`);
    }

    const placementMapping: Record<string, any> = {
      feed: { [`${platform}_positions`]: ['feed'] },
      story: { [`${platform}_positions`]: ['story'] },
      reels: {
        [`${platform}_positions`]:
          platform === 'facebook' ? ['instream_video'] : ['reels'],
      },
    };

    if (placement in placementMapping) {
      Object.assign(payload.targeting, placementMapping[placement]);
    } else {
      throw new Error(`Invalid placement: ${placement}`);
    }

    console.log('Ad Set Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, payload, {
          params: { access_token: accessToken },
        }),
      );
      console.log(JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message || 'Unknown error occurred',
      );
    }
  }

  // Upload Media (Image or Video) using Base64
  async uploadMedia(accessToken: string, adAccountId: string, file: string) {
    const base64Data = file.split(';base64,').pop();
    if (!base64Data) {
      throw new Error('Invalid base64 file data');
    }
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fileType = file.startsWith('data:image') ? 'IMAGE' : 'VIDEO';
    const fileName = `uploaded_file_${Date.now()}.${fileType === 'IMAGE' ? 'png' : 'mp4'}`;
    const url = `${this.BASE_URL}/act_${adAccountId}/${fileType === 'IMAGE' ? 'adimages' : 'advideos'}`;

    // Convert base64 string to buffer
    const formData = new FormData();
    formData.append('access_token', accessToken);
    formData.append('file', fileBuffer, { filename: fileName });
    try {
      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
      });
      return fileType === 'IMAGE'
        ? response.data.images[Object.keys(response.data.images)[0]].hash
        : { videoId: response.data.id };
    } catch (error) {
      throw new Error(
        `Failed to upload ${fileType}: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }
  // Create Ad Creative
  async createAdCreative(
    accessToken: string,
    adAccountId: string,
    pageId: string,
    objective: string,
    creativeType: 'IMAGE' | 'VIDEO' | 'CAROUSEL',
    data: {
      callToAction?: string;
      imageHash?: string;
      videoId?: string;
      link?: string;
      caption?: string;
      carouselData?: { imageHash: string; link: string; caption: string }[];
    },
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/adcreatives`;
    const payload: any = { access_token: accessToken };

    const shouldIncludeCTA = [
      'OUTCOME_TRAFFIC',
      'OUTCOME_SALES',
      'OUTCOME_APP_PROMOTION',
      'OUTCOME_LEADS',
    ].includes(objective);

    switch (creativeType) {
      case 'IMAGE':
        payload.object_story_spec = {
          page_id: pageId,
          link_data: {
            image_hash: data.imageHash,
            link: data.link,
            message: data.caption,
            ...(shouldIncludeCTA && data.callToAction
              ? {
                  call_to_action: {
                    type: data.callToAction,
                    value: { link: data.link },
                  },
                }
              : {}),
          },
        };
        break;

      case 'VIDEO':
        payload.object_story_spec = {
          page_id: pageId,
          video_data: {
            video_id: data.videoId,
            message: data.caption,
            ...(shouldIncludeCTA && data.callToAction
              ? {
                  call_to_action: {
                    type: data.callToAction,
                    value: { link: data.link },
                  },
                }
              : {}),
          },
        };
        break;

      case 'CAROUSEL':
        payload.object_story_spec = {
          page_id: pageId,
          link_data: {
            link: data.link,
            message: data.caption,
            child_attachments: data.carouselData?.map((item) => ({
              image_hash: item.imageHash,
              link: item.link,
              message: item.caption,
            })),
            ...(shouldIncludeCTA && data.callToAction
              ? {
                  call_to_action: {
                    type: data.callToAction,
                    value: { link: data.link },
                  },
                }
              : {}),
          },
        };
        break;

      default:
        throw new Error('Invalid creative type');
    }

    try {
      const response = await axios.post(url, payload);
      return response.data.id;
    } catch (error) {
      throw new Error(
        `Failed to create ad creative: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  // Create Ad
  async createAd(
    accessToken: string,
    adAccountId: string,
    adSetId: string,
    creativeId: string,
    adName: string,
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/ads`;
    const payload = {
      name: adName,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
      access_token: accessToken,
    };
    try {
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create ad: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  // Create Full Campaign (Feed, Story, or Reel)
  async createFullCampaign(
    campaignName: string,
    objective: string,
    ageMin: number,
    ageMax: number,
    gender: 'ALL' | 'MALE' | 'FEMALE',
    countries: string[],
    interests: string[],
    languages: number[],
    platform: 'facebook' | 'instagram',
    placements: 'feed' | 'reels' | 'story',
    mediaFiles: string[],
    caption: string,
    budget: number,
    startTime: string,
    endTime: string,
    osType: 'ALL' | 'IOS' | 'Android',
    url?: string,
    callToAction?: string,
    applicationId?: string,
    objectStoreUrl?: string,
  ) {
    try {
      const accessToken =
        'EAAiBDujrpvgBOwDqGNa6nzAVr6xyyj96HfvkEeN1sz0yJ1wmeLWvtNB2C0NkdoIP4bNXHybHnVbv5oI2U3XK7mfHCMjmHmDilZCVLlvsIi178M5WRQg7yAjoEoS7r6VgRaHpmwtKB8VZAbm8K4CUecO6j7Aar5xZAlZCyEJVwr8oumqAjNUG0W6a5C7Py5TTkKqeDGlP';
      const adAccountId = '1579232156802346';
      const pageId = '509895802207941';

      // 1. Create Campaign
      const campaign = await this.createCampaign(
        accessToken,
        adAccountId,
        campaignName,
        objective,
      );
      const campaignId = campaign.id;
      console.log('campaignId :' + campaignId);
      // 2. Create Ad Set
      const adSet = await this.createAdSets(
        accessToken,
        adAccountId,
        campaignName,
        campaignId,
        objective,
        budget,
        startTime,
        endTime,
        ageMin,
        ageMax,
        countries,
        gender === 'ALL' ? [1, 2] : gender === 'MALE' ? [1] : [2],
        platform,
        placements,
        osType,
        interests,
        languages,
        applicationId,
        objectStoreUrl,
        pageId,
      );
      const adSetId = adSet.id;

      // 3. Upload Media & Create Ad Creative
      let creativeId;
      let creativeType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
      const creativeData: any = { callToAction, link: url, caption };

      if (mediaFiles.length === 1) {
        // Single media (Image or Video)
        const mediaFile = mediaFiles[0];
        const mediaResponse = await this.uploadMedia(
          accessToken,
          adAccountId,
          mediaFile,
        );
        if (mediaFile.startsWith('data:image')) {
          creativeType = 'IMAGE';
          creativeData.imageHash = mediaResponse;
        } else {
          creativeType = 'VIDEO';
          creativeData.videoId = mediaResponse.videoId;
        }
      } else if (mediaFiles.length > 1) {
        // Multiple images for Carousel
        creativeType = 'CAROUSEL';
        creativeData.carouselData = [];

        for (const mediaFile of mediaFiles) {
          const mediaResponse = await this.uploadMedia(
            accessToken,
            adAccountId,
            mediaFile,
          );
          creativeData.carouselData.push({
            imageHash: mediaResponse,
            link: url,
            caption: caption,
          });
        }
      } else {
        throw new Error('No media files provided.');
      }
      console.log(JSON.stringify(creativeData));
      // Create Ad Creative
      // creativeId = await this.createAdCreative(accessToken, adAccountId, pageId, objective, creativeType, creativeData);

      // 4. Create Ad
      const ad = await this.createAd(
        accessToken,
        adAccountId,
        adSetId,
        '3148862335245423',
        campaignName,
      );
      return { campaignId, adSetId, adId: ad.id };
    } catch (error) {
      throw error;
    }
  }
}
