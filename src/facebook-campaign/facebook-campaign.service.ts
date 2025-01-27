/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import * as dotenv from 'dotenv';
dotenv.config();
@Injectable()
export class FacebookCampaignService extends PassportStrategy(
  Strategy,
  'facebook',
) {
  private readonly BASE_URL = 'https://graph.facebook.com/v21.0';

  constructor(private readonly httpService: HttpService) {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/callback', // Replace with production URL
      profileFields: ['id', 'emails', 'name'], // Fields to fetch
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // Handle user profile data
    return { profile, accessToken };
  }

  // async createCampaign(
  //   accessToken: string,
  //   adAccountId: string,
  //   campaignDetails: any,
  // ) {
  //   const url = `${this.BASE_URL}/act_${adAccountId}/campaigns`;
  //   const validObjectives = [
  //     'OUTCOME_LEADS',
  //     'OUTCOME_SALES',
  //     'OUTCOME_ENGAGEMENT',
  //     'OUTCOME_AWARENESS',
  //     'OUTCOME_TRAFFIC',
  //     'OUTCOME_APP_PROMOTION',
  //     'MESSAGES',
  //     'VIDEO_VIEWS',
  //     'APP_INSTALLS',
  //     'BRAND_AWARENESS',
  //   ];

  //   // Validate objective
  //   if (!validObjectives.includes(campaignDetails.objective)) {
  //     throw new Error(
  //       `Invalid objective: ${campaignDetails.objective}. Valid objectives are: ${validObjectives.join(', ')}`,
  //     );
  //   }
  //   const payload = {
  //     ...campaignDetails,
  //     status: campaignDetails.status || 'PAUSED',
  //   };

  //   try {
  //     const response = await lastValueFrom(
  //       this.httpService.post(url, payload, {
  //         params: { access_token: accessToken },
  //       }),
  //     );
  //     return response.data;
  //   } catch (error) {
  //     const errorMessage =
  //       error.response?.data?.error?.message || 'Unknown error occurred';
  //     throw new Error(`Failed to create campaign: ${errorMessage}`);
  //   }
  // }

  async fetchAdAccounts(accessToken: string) {
    const url = `${this.BASE_URL}/me/adaccounts`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: { access_token: accessToken },
        }),
      );
      return response.data.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || 'Unknown error occurred';
      throw new Error(`Failed to fetch ad accounts: ${errorMessage}`);
    }
  }

  async createCampaign(
    accessToken: string,
    adAccountId: string,
    campaignName: string,
    objective: string,
    budget: string,
    startTime: string,
    endTime: string,
  ) {
    const url = `${this.BASE_URL}/act_${adAccountId}/campaigns`;
    const validObjectives = [
      'OUTCOME_LEADS',
      'OUTCOME_SALES',
      'OUTCOME_ENGAGEMENT',
      'OUTCOME_AWARENESS',
      'OUTCOME_TRAFFIC',
      'OUTCOME_APP_PROMOTION',
      'MESSAGES',
      'VIDEO_VIEWS',
      'APP_INSTALLS',
      'BRAND_AWARENESS',
    ];
    const payload = {
      name: campaignName,
      objective: objective,
      special_ad_categories: [
        "NONE"
      ],
      lifetime_budget: budget,
      start_time: startTime,
      end_time: endTime,
      status: "PAUSED"
    }
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

}
