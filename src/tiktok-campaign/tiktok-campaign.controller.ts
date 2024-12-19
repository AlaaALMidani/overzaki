/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Redirect,
  HttpException,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { TiktokCampaignService } from './tiktok-campaign.service';

@Controller('tiktok-campaign')
export class TiktokCampaignController {
  private readonly logger = new Logger(TiktokCampaignController.name); // Initialize Logger
  constructor(private readonly campaignService: TiktokCampaignService) {}

  @Get('login')
  @Redirect()
  login() {
    const authUrl = this.campaignService.getAuthUrl();
    return { url: authUrl };
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string) {
    if (!code) {
      throw new HttpException(
        'Authorization code not provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const authData = await this.campaignService.getAccessToken(code);
      return {
        message: 'Authentication successful',
        data: authData,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Post('create-campaign')
  // async createCampaign(@Body() body: any, @Req() req: any) {
  //   const { accessToken, advertiser_id, adType, campaignDetails, adDetails } =
  //     body;

  //   if (!accessToken || !advertiser_id || !adType) {
  //     throw new HttpException(
  //       'Access token, advertiser_id, and adType are required',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   let parsedCampaignDetails,
  //     parsedAdDetails,
  //     videoId = null;

  //   try {
  //     parsedCampaignDetails = this.parseJson(
  //       campaignDetails,
  //       'campaignDetails',
  //     );
  //     parsedAdDetails = this.parseJson(adDetails, 'adDetails');

  //     if (['Spark Ad', 'Feed Ad'].includes(adType)) {
  //       if (!req.file) {
  //         throw new HttpException(
  //           'Video file is required for Spark and Feed Ads',
  //           HttpStatus.BAD_REQUEST,
  //         );
  //       }
  //       videoId = await this.campaignService.uploadVideoToTikTok(
  //         req.file,
  //         accessToken,
  //         advertiser_id,
  //       );
  //       this.logger.log(`Video uploaded successfully. Video ID: ${videoId}`);
  //     }

  //     const campaignResult = await this.campaignService.createCampaign(
  //       accessToken,
  //       advertiser_id,
  //       parsedCampaignDetails,
  //     );
  //     const campaignId = campaignResult.data.campaign_id;

  //     let adResult;
  //     if (adType === 'Spark Ad') {
  //       if (!parsedAdDetails.post_id) {
  //         throw new HttpException(
  //           'post_id is required for Spark Ads',
  //           HttpStatus.BAD_REQUEST,
  //         );
  //       }
  //       adResult = await this.campaignService.createSparkAd(
  //         accessToken,
  //         advertiser_id,
  //         campaignId,
  //         {
  //           ad_name: parsedAdDetails.ad_name,
  //           post_id: parsedAdDetails.post_id,
  //         },
  //       );
  //     } else if (adType === 'Feed Ad') {
  //       if (!videoId) {
  //         throw new HttpException(
  //           'Video upload failed. Cannot create Feed Ad.',
  //           HttpStatus.INTERNAL_SERVER_ERROR,
  //         );
  //       }
  //       adResult = await this.campaignService.createFeedAd(
  //         accessToken,
  //         advertiser_id,
  //         campaignId,
  //         {
  //           ad_name: parsedAdDetails.ad_name,
  //           video_id: videoId,
  //         },
  //       );
  //     } else {
  //       throw new HttpException('Invalid ad type', HttpStatus.BAD_REQUEST);
  //     }

  //     return {
  //       message: 'Campaign and Ad created successfully',
  //       data: { campaignResult, adResult },
  //     };
  //   } catch (error) {
  //     this.logger.error(`Error creating campaign or ad: ${error.message}`);
  //     throw new HttpException(
  //       error.message || 'Campaign creation failed',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  parseJson(json: any, field: string) {
    try {
      return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (error) {
      this.logger.error(`Invalid JSON for ${field}: ${json}`);
      throw new HttpException(
        `Invalid JSON format for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
