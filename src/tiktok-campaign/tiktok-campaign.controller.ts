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
  Req,
} from '@nestjs/common';
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

  @Post('FeedAd')
  async FeedAd(@Body() body: any, @Req() req: any) {
    const {
      campaignName,
      objectiveType,
      ageGroups,
      gender,
      spendingPower,
      languages,
      locationIds,
      operatingSystems,
      budget,
      scheduleType,
      scheduleStartTime,
      base64Logo,
      appName,
      ads,
      scheduleEndTime,
    } = body;

    if (
      !campaignName ||
      !locationIds ||
      !scheduleEndTime ||
      !scheduleStartTime ||
      !budget ||
      !base64Logo ||
      !ads
    ) {
      throw new HttpException(
        'Missing required fields for campaign setup.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ageGroupsArray=this.ensureArray(ageGroups);
    const languagesArray=this.ensureArray(languages);
    const locationIdsArray=this.ensureArray(locationIds);
    const operatingSystemsArray = this.ensureArray(operatingSystems);
     

    try {
      const result = await this.campaignService.CreateFeed(
        req.user.id,
        req.user.walletId,
        campaignName,
        objectiveType,
        ageGroupsArray,
        gender,
        spendingPower,
        languagesArray,
        locationIdsArray,
        operatingSystemsArray,
        parseFloat(budget),
        scheduleType,
        scheduleStartTime,
        base64Logo,
        appName,
        ads,
        scheduleEndTime
      ); return {
        message: 'In Feed Ads created successfully!',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create Feed Ad',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('SparkAd')
  async SparkAd(@Body() body: any, @Req() req: any) {
    const {
      campaignName,
      objectiveType,
      gender,
      spendingPower,
      scheduleType,
      scheduleStartTime,
      scheduleEndTime,
      budget,
      ageGroups,
      languages,
      locationIds,
      operatingSystems,
      ads,
      
    } = body;

    if (
      !campaignName ||
      !locationIds ||
      !scheduleEndTime ||
      !scheduleStartTime ||
      !budget ||
      !ads
    ) {
      throw new HttpException(
        'Missing required fields for campaign setup.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ageGroupsArray=this.ensureArray(ageGroups);
    const languagesArray=this.ensureArray(languages);
    const locationIdsArray=this.ensureArray(locationIds);
    const operatingSystemsArray = this.ensureArray(operatingSystems);
     


    try {
      const result = await this.campaignService.CreateSpark(
        req.user.id,
        req.user.walletId,
        campaignName,
        objectiveType,
        gender,
        spendingPower,
        scheduleType,
        scheduleStartTime,
        budget,
        ageGroupsArray,
        languagesArray,
        locationIdsArray,
        operatingSystems,
        ads,
        scheduleEndTime
      );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create Spark Ad',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('campaignReport')
  async campaignReport(
    @Body()
    body: {
      orderId: string;
    },
  ) {
    const { orderId } = body;
    if (!orderId) {
      throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const report = await this.campaignService.getCampaignReport(orderId);
      return {
        message: 'Report fetched successfully',
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper function to ensure the input is an array.
   * @param input - The input value (string, array, or undefined).
   * @returns An array of strings.
   */
  ensureArray(input: string | string[] | undefined): string[] {
    if (!input) {
      return [];
    }
    if (Array.isArray(input)) {
      // If it's already an array, return it directly
      return input;
    }
    if (typeof input === 'string') {
      // Handle comma-separated strings like "ar,us"
      return input.split(',').map((item) => item.trim());
    }
    // Fallback for unexpected types
    return [input];
  }
}