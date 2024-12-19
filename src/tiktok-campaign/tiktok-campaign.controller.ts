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
  private readonly logger = new Logger(TiktokCampaignController.name);
  constructor(private readonly campaignService: TiktokCampaignService) { }

  @Get('login')
  @Redirect()
  login() {
    const authUrl = this.campaignService.getAuthUrl();
    return { url: authUrl };
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string) {
    if (!code) {
      throw new HttpException('Authorization code not provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const authData = await this.campaignService.getAccessToken(code);
      return {
        message: 'Authentication successful',
        data: authData,
      };
    } catch (error) {
      throw new HttpException(error.message || 'Authentication failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  @Get('fetch-videos')
  async fetchVideos(
    @Query('accessToken') accessToken: string,
    @Query('business_id') businessId: string,
    @Query('filters') filters: string | null,
    @Query('fields') fields: string,
  ) {
    if (!accessToken || !businessId) {
      throw new HttpException(
        'Access token and business_id are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const parsedFields = JSON.parse(fields || '[]');
      const videos = await this.campaignService.fetchUserVideos(accessToken, businessId, filters, parsedFields);
      return {
        message: 'Videos fetched successfully',
        data: videos,
      };
    } catch (error) {
      this.logger.error(`Error fetching videos: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch user videos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create-campaign')
  async createCampaign(@Body() body: any, @Req() req: any) {
    const { accessToken, advertiser_id, adType, campaignDetails, adDetails, video_id } = body;

    if (!accessToken || !advertiser_id || !adType) {
      throw new HttpException('Access token, advertiser_id, and adType are required', HttpStatus.BAD_REQUEST);
    }

    let parsedCampaignDetails, parsedAdDetails, uploadedVideoId = null;

    try {
      parsedCampaignDetails = this.parseJson(campaignDetails, 'campaignDetails');
      parsedAdDetails = this.parseJson(adDetails, 'adDetails');

      // Handle video selection or upload
      if (['Spark Ad', 'Feed Ad'].includes(adType)) {
        if (video_id) {
          // Use an existing video
          uploadedVideoId = video_id;
        } else if (req.file) {
          // Upload a new video
          uploadedVideoId = await this.campaignService.uploadVideoToTikTok(req.file, accessToken, advertiser_id);
        } else {
          throw new HttpException(
            'Either video_id (for existing videos) or a video file (for uploads) is required for Spark and Feed Ads',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create campaign
      const campaignResult = await this.campaignService.createCampaign(accessToken, advertiser_id, parsedCampaignDetails);
      const campaignId = campaignResult.data.campaign_id;

      let adResult;
      if (adType === 'Spark Ad') {
        if (!parsedAdDetails.post_id) {
          throw new HttpException('post_id is required for Spark Ads', HttpStatus.BAD_REQUEST);
        }
        adResult = await this.campaignService.createSparkAd(accessToken, advertiser_id, campaignId, {
          ad_name: parsedAdDetails.ad_name,
          post_id: parsedAdDetails.post_id,
        });
      } else if (adType === 'Feed Ad') {
        if (!uploadedVideoId) {
          throw new HttpException('Video selection or upload failed. Cannot create Feed Ad.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        adResult = await this.campaignService.createFeedAd(accessToken, advertiser_id, campaignId, {
          ad_name: parsedAdDetails.ad_name,
          video_id: uploadedVideoId,
        });
      } else {
        throw new HttpException('Invalid ad type', HttpStatus.BAD_REQUEST);
      }

      return { message: 'Campaign and Ad created successfully', data: { campaignResult, adResult } };
    } catch (error) {
      throw new HttpException(error.message || 'Campaign creation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private parseJson(json: any, field: string) {
    try {
      return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (error) {
      throw new HttpException(`Invalid JSON format for ${field}`, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('campaign-report')
  async getCampaignReport(@Body() body: any) {
    const { accessToken, advertiser_id, campaign_id, start_date, end_date } = body;

    if (!accessToken || !advertiser_id || !campaign_id || !start_date || !end_date) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }
    try {
      const report = await this.campaignService.getCampaignReport(
        accessToken,
        advertiser_id,
        campaign_id,
        start_date,
        end_date,
      );

      return {
        message: 'Campaign report fetched successfully',
        data: report,
      };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to fetch campaign report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}
