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
export class FacebookCampaignService extends PassportStrategy(Strategy, 'facebook') {
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

  // Fetch Ad Accounts
  async fetchAdAccounts(accessToken: string) {
    const url = `${this.BASE_URL}/me/adaccounts`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, { params: { access_token: accessToken } }),
      );
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Unknown error occurred';
      throw new Error(`Failed to fetch ad accounts: ${errorMessage}`);
    }
  }

  // Create Campaign
  async createCampaign(
    accessToken: string,
    adAccountId: string,
    campaignName: string,
    objective: string
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/campaigns`;
    const validObjectives = [
      'OUTCOME_LEADS',
      'OUTCOME_SALES',
      'OUTCOME_ENGAGEMENT',
      'OUTCOME_AWARENESS',
      'OUTCOME_TRAFFIC',
      'OUTCOME_APP_PROMOTION'
    ];

    if (!validObjectives.includes(objective)) {
      throw new Error(`Invalid objective: ${objective}. Valid objectives are: ${validObjectives.join(', ')}`);
    }
    const payload = {
      name: campaignName,
      objective: objective,
      special_ad_categories: ['NONE'],
      status: 'PAUSED',
      access_token: accessToken,
    };
    try {
      const response = await lastValueFrom(
        this.httpService.post(url, payload, { params: { access_token: accessToken } }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Unknown error occurred';
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
      targeting: {
        age_min: ageMin,
        age_max: ageMax,
        geo_locations: { countries },
        publisher_platforms: [platform],
        user_os: osType === 'ALL' ? ['IOS', 'Android'] : [osType],
        interests: interests,
        genders: genders,
      },
      status: 'PAUSED',
      access_token: accessToken,
    };

    const objectiveMapping: Record<string, any> = {
      'OUTCOME_TRAFFIC': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_amount: 2
      },
      'OUTCOME_AWARENESS': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'BRAND_AWARENESS',
      },
      'OUTCOME_ENGAGEMENT': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'POST_ENGAGEMENT',
      },
      'OUTCOME_LEADS': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LEAD_GENERATION',
        promoted_object: { page_id: pageId },
      },
      'OUTCOME_SALES': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'CONVERSIONS',
        promoted_object: { pixel_id: pixelId, custom_conversion_id: customConversionId },
      },
      'OUTCOME_APP_PROMOTION': {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'APP_INSTALLS',
      },
    };

    if (objective in objectiveMapping) {
      Object.assign(payload, objectiveMapping[objective]);
    } else {
      throw new Error(`Unsupported objective: ${objective}`);
    }
    if (objective == 'OUTCOME_APP_PROMOTION' && applicationId) {
      payload.promoted_object = { application_id: applicationId };
    }
    if (objective == 'OUTCOME_APP_PROMOTION' && objectStoreUrl) {
      payload.promoted_object = { object_store_url: objectStoreUrl }
    }
    const placementMapping: Record<string, any> = {
      'feed': platform === 'facebook' ? { facebook_positions: ['feed'] } : { instagram_positions: ['feed'] },
      'story': platform === 'facebook' ? { facebook_positions: ['story'] } : { instagram_positions: ['story'] },
      'reels': platform === 'facebook' ? { facebook_positions: ['instream_video'] } : { instagram_positions: ['reels'] },
    };

    if (placement in placementMapping) {
      Object.assign(payload.targeting, placementMapping[placement]);
    } else {
      throw new Error(`Invalid placement: ${placement}`);
    }

    console.log('Ad Set Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, payload, { params: { access_token: accessToken } }),
      );
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Unknown error occurred';
      throw new Error(`Failed to create ad set: ${errorMessage}`);
    }
  }

  // Upload Media (Image or Video)
  async uploadMedia(
    accessToken: string,
    adAccountId: string,
    file: string,
    fileName: string,
    type: 'image' | 'video'
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/${type === 'image' ? 'adimages' : 'advideos'}`;
    const base64Data = file.split(';base64,').pop();
    if (!base64Data) throw new Error('Invalid Base64 data');

    const fileBuffer = Buffer.from(base64Data, 'base64');
    const formData = new FormData();
    formData.append('access_token', accessToken);
    formData.append('file', fileBuffer, { filename: fileName });

    try {
      const response = await axios.post(url, formData, { headers: formData.getHeaders() });
      return type === 'image' ? response.data.images[Object.keys(response.data.images)[0]].hash : { videoId: response.data.id };
    } catch (error) {
      throw new Error(`Failed to upload ${type}: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  
  // Create Ad Creative
  async createAdCreative(
    accessToken: string,
    adAccountId: string,
    pageId: string,
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
    let payload: any = { access_token: accessToken };

    switch (creativeType) {
      case 'IMAGE':
        payload.object_story_spec = {
          page_id: pageId,
          link_data: {
            image_hash: data.imageHash,
            link: data.link,
            message: data.caption,
            call_to_action: { type: data.callToAction, value: { link: data.link } },
          },
        };
        break;

      case 'VIDEO':
        payload.object_story_spec = {
          page_id: pageId,
          video_data: {
            video_id: data.videoId,
            message: data.caption,
            call_to_action: { type: data.callToAction, value: { link: data.link } },
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
            call_to_action: { type: data.callToAction, value: { link: data.link } },
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
      throw new Error(`Failed to create ad creative: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Create Ad
  async createAd(accessToken: string, adAccountId: string, adSetId: string, creativeId: string, adName: string) {
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
      throw new Error(`Failed to create ad: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Create Full Campaign (Feed, Story, or Reel)
  async createFullCampaign(
    // accessToken: string,
    // adAccountId: string,
    campaignName: string,
    objective: string,
    ageMin: number,
    ageMax: number,
    gender: 'ALL' | 'MALE' | 'FEMALE',
    countries: string[],
    interests: string[],
    platform: 'facebook' | 'instagram',
    placements: 'feed' | 'reels' | 'story',
    mediaFiles: string[],
    url: string,
    caption: string,
    budget: number,
    startTime: string,
    endTime: string,
    osType: 'ALL' | 'IOS' | 'Android',
    callToAction: string,
    applicationId?: string,
    objectStoreUrl?: string,
  ) {
    try {
      const accessToken = 'EAAiBDujrpvgBOZBwSvnzPbspmVlWdVDcQ3e8lstlmWebDhKzzhnSYZAzWNcPBBgfkRLmfX3e8XZCPSdsAaZAHFOymS8kylYd9SWxpkOxXWqPXehC7gK8B3kgnbEHgdFHRaZAe5BxkHGs6ZCqcYqsJBSVidWOwx9DsfMAqDoHzyXwiXgIG3YSsQTGgvkYSJnmThjZA1Rf8ZAc';
      const adAccountId = '1579232156802346';
      const pageId = '509895802207941';
      // 1. Create Campaign
      const campaign = await this.createCampaign(accessToken, adAccountId, campaignName, objective);

      const campaignId = campaign.id;
      console.log('campaign ' + campaignId)
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
        applicationId,
        objectStoreUrl
      );

      console.log(JSON.stringify(adSet))
      const adSetId = adSet.id;
      let mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
      if (mediaFiles.length > 1) {
        mediaType = 'CAROUSEL';
      } else {
        const extension = mediaFiles[0].split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
          mediaType = 'IMAGE';
        } else if (['mp4', 'mov', 'avi'].includes(extension || '')) {
          mediaType = 'VIDEO';
        } else {
          throw new Error('Unsupported media file format');
        }
      }

      let creativeId;
      if (mediaType === 'IMAGE') {
        const imageHash = (await this.uploadMedia(accessToken, adAccountId, mediaFiles[0], 'image.jpg', 'image')) as string;
        creativeId = await this.createAdCreative(accessToken, adAccountId, pageId, 'IMAGE', { imageHash, link: url, caption });
      } else if (mediaType === 'VIDEO') {
        const video = (await this.uploadMedia(accessToken, adAccountId, mediaFiles[0], 'video.mp4', 'video')) as { videoId: string };
        creativeId = await this.createAdCreative(accessToken, adAccountId, pageId, 'VIDEO', { videoId: video.videoId, link: url, caption });
      } else if (mediaType === 'CAROUSEL') {
        const carouselData = await Promise.all(
          mediaFiles.map(async (file) => {
            const imageHash = (await this.uploadMedia(accessToken, adAccountId, file, 'image.jpg', 'image')) as string;
            return { imageHash, link: url, caption };
          })
        );
        creativeId = await this.createAdCreative(accessToken, adAccountId, pageId, 'CAROUSEL', { carouselData });
      }

      // 4. Create Ad
      const ad = await this.createAd(accessToken, adAccountId, adSetId, creativeId.id, campaignName);
      return { campaignId, adSetId, adId: ad.id };
    } catch (error) {
      throw new Error(`Failed to create full campaign: ${error.message}`);
    }
  }

}