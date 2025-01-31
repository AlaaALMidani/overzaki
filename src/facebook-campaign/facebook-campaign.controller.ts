/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Req,Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FacebookCampaignService } from './facebook-campaign.service';

@Controller('facebook')
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
      platform,
      placements,
      mediaType,
      mediaFiles,
      url,
      caption,
      budget,
      startTime,
      endTime,
      osType,
      applicationId,
    } = body;

    return this.facebookCampaignService.createFullCampaign(
      campaignName,
      objective,
      ageMin,
      ageMax,
      gender,
      countries,
      interests,
      platform,
      placements,
      mediaFiles,
      url,
      caption,
      budget,
      startTime,
      endTime,
      osType
    );
  }
}

