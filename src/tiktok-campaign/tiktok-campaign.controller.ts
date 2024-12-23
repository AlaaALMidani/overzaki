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
  Logger,
  UploadedFile,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { TiktokCampaignService } from './tiktok-campaign.service';
@Controller('tiktok-campaign')
export class TiktokCampaignController {
  private readonly logger = new Logger(TiktokCampaignController.name);
  constructor(private readonly campaignService: TiktokCampaignService) {}

  @Get('login')
  @Redirect()
  login() {
    const authUrl = this.campaignService.getAuthUrl();
    return { url: authUrl };
  }

  @Get('callback')
  async handleCallback(@Query('auth_code') auth_code: string) {
    if (!auth_code) {
      throw new HttpException(
        'Authorization code not provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.logger.log(auth_code);
    try {
      const authData = await this.campaignService.getAccessToken(auth_code);
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

  @Post('campaign-report')
  async getCampaignReport(@Body() body: any) {
    const { accessToken, advertiser_id, campaign_id, start_date, end_date } =
      body;

    if (
      !accessToken ||
      !advertiser_id ||
      !campaign_id ||
      !start_date ||
      !end_date
    ) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
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
      throw new HttpException(
        error.message || 'Failed to fetch campaign report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('setup')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'videoFile', maxCount: 1 },
      { name: 'imageFile', maxCount: 1 },
    ]),
  )
  async setupAdCampaign(
    @Body() body: any,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      imageFile?: Express.Multer.File[];
    },
  ) {
    const {
      accessToken,
      advertiserId,
      campaignName,
      budgetMode,
      locationIds: rawLocationIds,
      scheduleEndTime,
      scheduleStartTime,
      budget,
      optimizationGoal,
      displayName,
      adText,
    } = body;
    const locationIds = rawLocationIds
      .split(',')
      .map((item) => item.replace(/"/g, ''));
    // Validate required fields
    if (
      !accessToken ||
      !advertiserId ||
      !campaignName ||
      !budgetMode ||
      !locationIds ||
      !scheduleEndTime ||
      !scheduleStartTime ||
      !budget ||
      !optimizationGoal ||
      !displayName ||
      !adText
    ) {
      throw new HttpException(
        'Missing required fields for campaign setup.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !files.videoFile ||
      files.videoFile.length === 0 ||
      !files.imageFile ||
      files.imageFile.length === 0
    ) {
      throw new HttpException(
        'Both video and image files are required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const videoFile = files.videoFile[0];
    const imageFile = files.imageFile[0];
    try {
      const result = await this.campaignService.setupAdCampaign(
        accessToken,
        advertiserId,
        campaignName,
        budgetMode,
        locationIds,
        scheduleEndTime,
        scheduleStartTime,
        Number(budget),
        optimizationGoal,
        displayName,
        adText,
        videoFile,
        imageFile,
      );

      return {
        message: 'Ad campaign setup successfully.',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error setting up ad campaign', error.message);
      throw new HttpException(
        error.message || 'Failed to set up ad campaign.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('uploaded-videos')
  async fetchUploadedVideos(
    @Query() query: { accessToken: string; advertiserId: string },
  ) {
    const { accessToken, advertiserId } = query;

    if (!accessToken || !advertiserId) {
      throw new HttpException(
        'Access token and advertiser ID are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const videos = await this.campaignService.fetchUploadedVideos(
        accessToken,
        advertiserId,
      );
      return {
        message: 'Uploaded videos fetched successfully',
        data: videos,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch uploaded videos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('identity')
  async fetchIdentity(
    @Query() query: { accessToken: string; advertiserId: string },
  ) {
    const { accessToken, advertiserId } = query;

    if (!accessToken || !advertiserId) {
      throw new HttpException(
        'Access token and advertiser ID are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const identity = await this.campaignService.fetchIdentity(
        accessToken,
        advertiserId,
      );
      return {
        message: 'fetch identity successfully',
        data: identity,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch uploaded videos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload-video')
  @UseInterceptors(FileInterceptor('videoFile'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      accessToken: string;
      advertiserId: string;
      flawDetect?: boolean;
      autoFixEnabled?: boolean;
      autoBindEnabled?: boolean;
    },
  ) {
    const {
      accessToken,
      advertiserId,
      flawDetect,
      autoFixEnabled,
      autoBindEnabled,
    } = body;

    if (!accessToken || !advertiserId) {
      throw new HttpException(
        'Access token and advertiser ID are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file) {
      throw new HttpException('Video file is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const uploadResult = await this.campaignService.uploadVideoByFile(
        file,
        accessToken,
        advertiserId,
        flawDetect,
        autoFixEnabled,
        autoBindEnabled,
      );
      return {
        message: 'Video uploaded successfully',
        data: uploadResult,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Video upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('imageFile'))
  async imageVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { accessToken: string; advertiserId: string },
  ) {
    const { accessToken, advertiserId } = body;

    if (!accessToken || !advertiserId) {
      throw new HttpException(
        'Access token and advertiser ID are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file) {
      throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const uploadResult = await this.campaignService.uploadImageByFile(
        file,
        accessToken,
        advertiserId,
      );
      return {
        message: 'Image uploaded successfully',
        data: uploadResult,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Image upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private parseJson(json: any, field: string) {
    try {
      return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (error) {
      throw new HttpException(
        `Invalid JSON format for ${field}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('create-identity')
  async createIdentity(@Body() body: any) {
    const { accessToken, advertiserId, displayName } = body;
    if (!accessToken || !advertiserId || !displayName) {
      throw new HttpException(
        'Access token, advertiserId, and displayName are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const identityResult = await this.campaignService.createIdentity(
        accessToken,
        advertiserId,
        displayName,
      );
      return {
        message: 'Identity created successfully',
        data: identityResult,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Identity creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create-campaign')
  async createCampaign(@Body() body: any) {
    const { accessToken, advertiser_id, campaignDetails } = body;
    if (!accessToken || !advertiser_id || !campaignDetails) {
      throw new HttpException(
        'Access token, advertiser_id, and campaignDetails are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const parsedCampaignDetails = this.parseJson(
        campaignDetails,
        'campaignDetails',
      );
      const campaignResult = await this.campaignService.createCampaign(
        accessToken,
        advertiser_id,
        parsedCampaignDetails,
      );
      return {
        message: 'Campaign created successfully',
        data: campaignResult,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Campaign creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create-AdGroup')
  async createAdGroup(@Body() body: any) {
    const { accessToken, advertiser_id, adGroupDetails } = body;

    if (!accessToken || !advertiser_id || !adGroupDetails) {
      throw new HttpException(
        'Access token, advertiser_id, and AdGroupDetails are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const parsedAdGroupDetails = this.parseJson(
        adGroupDetails,
        'adGroupDetails',
      );
      const adGroupResult = await this.campaignService.createAdGroup(
        accessToken,
        advertiser_id,
        parsedAdGroupDetails,
      );

      return {
        message: 'AdGroup created successfully',
        data: adGroupResult,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'AdGroup creation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Post('create-feed')
  async createFeed(
    @Body()
    body: any,
  ) {
    this.logger.log('Received request to create feed...');
    const {
      accessToken,
      businessType,
      timezone,
      regionCode,
      currency,
      feedName,
    } = body;
    if (
      !accessToken ||
      !businessType ||
      !timezone ||
      !regionCode ||
      !currency ||
      !feedName
    ) {
      throw new HttpException(
        'Missing required fields for create-feed.',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const result = await this.campaignService.createFeed(
        accessToken,
        businessType,
        timezone,
        regionCode,
        currency,
        feedName,
      );

      return {
        status: 'success',
        message: 'Feed created successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating Tiktok feed:', error.message);
      return {
        status: 'error',
        message: error.message || 'Failed to create feed',
      };
    }
  }
}
