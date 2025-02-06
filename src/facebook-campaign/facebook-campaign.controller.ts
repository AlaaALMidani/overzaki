/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Req, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FacebookCampaignService } from './facebook-campaign.service';
import {
  Query,
  Redirect,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
@Controller('meta')
export class FacebookController {
  constructor(private readonly facebookCampaignService: FacebookCampaignService) { }

  // Redirect to Facebook for login
  @Get('login')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {
    // Facebook login endpoint
  }

  // Facebook callback
  @Get('callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req) {
    return req.user; // User profile and access token
  }

  // Fetch ad accounts
  @Get('adaccounts')
  async getAdAccounts(@Req() req) {
    const accessToken = req.user.accessToken;
    return this.facebookCampaignService.fetchAdAccounts(accessToken);
  }

  // Create campaign
  @Post('full-campaign')
  async createFullCampaign(@Body() body) {
    const {
      campaignName,
      objective,
      ageMin,
      ageMax,
      gender,
      countries,
      interests,
      languages,
      platform,
      placements,
      mediaFiles,
      url,
      caption,
      budget,
      startTime,
      endTime,
      osType,
      callToAction,
      applicationId,
      objectStoreUrl,
    } = body;

    return this.facebookCampaignService.createFullCampaign(
      campaignName,
      objective,
      ageMin,
      ageMax,
      gender,
      countries,
      interests,
      languages,
      platform,
      placements,
      mediaFiles,
      caption,
      budget,
      startTime,
      endTime,
      osType,
      url,
      callToAction,
      applicationId,
      objectStoreUrl,
    );
  }

  @Post('create-feed')
  async createFeedCampaign(@Body() body: any) {
    try {
      const {
        campaignName,
        objective,
        ageMin,
        ageMax,
        gender,
        countries,
        interests,
        languages,
        mediaFiles,
        caption,
        budget,
        startTime,
        endTime,
        osType,
        url,
        callToAction,
        applicationId,
        objectStoreUrl,
      } = body;

      // Call createFullCampaign with fixed placement and platform
      const result = await this.facebookCampaignService.createFullCampaign(
        campaignName,
        objective,
        ageMin,
        ageMax,
        gender,
        countries,
        interests,
        languages,
        'facebook', // Fixed platform
        'feed', // Fixed placement
        mediaFiles,
        caption,
        budget,
        startTime,
        endTime,
        osType,
        url,
        callToAction,
        applicationId,
        objectStoreUrl,
      );

      return { message: 'Facebook feed campaign created successfully', result };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  
}



