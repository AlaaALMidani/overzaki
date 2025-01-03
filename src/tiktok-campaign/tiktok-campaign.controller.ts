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
  Req,
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

  @Post('FeedAd')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'videoFile', maxCount: 1 },
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  async FeedAd(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
  ) {
    const {
      accessToken,
      advertiserId,
      campaignName,
      objectiveType,
      callToAction,
      gender,
      spendingPower,
      scheduleType,
      scheduleStartTime,
      // dayparting: rawDayparting,
      budget,
      appName,
      adText,
      url,
      ageGroups: rawAgeGroups,
      languages: rawLanguages,
      locationIds: rawLocationIds,
      interestCategoryIds: rawInterestCategoryIds,
      operatingSystems: rawOperatingSystems,
      // devicePriceRanges,
      // deviceModelIds,
      // devicePriceRanges,
      // deviceModelIds,
      scheduleEndTime,
    } = body;
    console.log('request from frontend:', body);
    const locationIds = this.normalizeArray(rawLocationIds);
    const ageGroups = this.normalizeArray(rawAgeGroups);
    // const ageGroups = rawAgeGroups;
    // console.log(ageGroups);
    const languages = this.normalizeArray(rawLanguages);
    const interestCategoryIds = this.normalizeArray(rawInterestCategoryIds);
    const operatingSystems = this.normalizeArray(rawOperatingSystems);
    if (
      !accessToken ||
      !advertiserId ||
      !campaignName ||
      !locationIds ||
      !scheduleEndTime ||
      !scheduleStartTime ||
      !budget ||
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
      !files.logoFile ||
      files.logoFile.length === 0 ||
      !files.coverFile ||
      files.coverFile.length === 0
    ) {
      console.log('Both video and image files are required.');
      throw new HttpException(
        'Both video and image files are required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    // let parsedDayparting: Record<string, { start: string; end: string }>;
    // parsedDayparting = JSON.parse(rawDayparting);
    // try {
    // } catch (error) {
    //   console.log('object');
    //   throw new HttpException(
    //     'Invalid JSON format for dayparting.',
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // const processedDayparting =
    // this.convertDaypartingToString(parsedDayparting);
    const videoFile = files.videoFile[0];
    const coverFile = files.coverFile[0];
    const logoFile = files.logoFile[0];
    console.log(req.user);
    const result = await this.campaignService.CreateFeed(
      req.user.id,
      req.user.walletId,
      accessToken,
      advertiserId,
      campaignName,
      objectiveType,
      callToAction,
      gender,
      spendingPower,
      scheduleType,
      scheduleStartTime,
      // processedDayparting,
      budget,
      appName,
      adText,
      url,
      ageGroups,
      languages,
      locationIds,
      interestCategoryIds,
      operatingSystems,
      // devicePriceRanges,
      // deviceModelIds,
      videoFile,
      coverFile,
      logoFile,
      scheduleEndTime,
    );
    return result;
  }

  // private parseJson(json: any, field: string) {
  //   try {
  //     return typeof json === 'string' ? JSON.parse(json) : json;
  //   } catch (error) {
  //     throw new HttpException(
  //       `Invalid JSON format for ${field}`,
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  // }

  @Post('campaignReport')
  async campaignReport(
    @Body()
    body: {
      accessToken: string;
      advertiserId: string;
      campaignId: string;
      orderId: string;
    },
  ) {
    const { accessToken, advertiserId, campaignId, orderId } = body;
    if (!accessToken || !advertiserId || !campaignId) {
      throw new HttpException(
        'Access token, advertiser ID, and campaign ID are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const report = await this.campaignService.getReport(
        accessToken,
        advertiserId,
        orderId,
      );
      const reportCampaign = report.data.list.filter(
        (a) => a.dimensions.campaign_id == campaignId,
      );
      return {
        message: 'Report fetched successfully',
        data: reportCampaign,
        details: report.details,
        status: report.status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private normalizeArray(input: any): string[] {
    console.log('input', input);
    if (Array.isArray(input)) {
      console.log('(Array.isArray(input)', input);
      return [...new Set(input)];
    }
    if (typeof input === 'string') {
      console.log('typeof input === string', input);
      return [
        ...new Set(
          input
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((item) => item.trim().replace(/"/g, '')),
        ),
      ];
    }
    throw new Error('Invalid input type for array normalization');
  }

  // private convertDaypartingToString(
  //   dayparting: Record<string, { start: string; end: string }>,
  // ): string {
  //   const timeToSlot = (time: string): number => {
  //     const [hours, minutes] = time.split(':').map(Number);
  //     let slot = hours * 2;
  //     if (minutes >= 30) {
  //       slot += 1;
  //     }
  //     return slot;
  //   };

  //   const week = [
  //     'monday',
  //     'tuesday',
  //     'wednesday',
  //     'thursday',
  //     'friday',
  //     'saturday',
  //     'sunday',
  //   ];
  //   let fullSchedule = '';

  //   for (const day of week) {
  //     const { start, end } = dayparting[day];
  //     const startSlot = timeToSlot(start);
  //     const endSlot = timeToSlot(end);

  //     if (startSlot >= endSlot) {
  //       throw new HttpException(
  //         `Invalid schedule for ${day}: Start time (${start}) must be earlier than end time (${end})`,
  //         HttpStatus.BAD_REQUEST,
  //       );
  //     }

  //     const daySchedule = Array(48).fill('0');
  //     for (let i = startSlot; i < endSlot; i++) {
  //       daySchedule[i] = '1';
  //     }

  //     fullSchedule += daySchedule.join('');
  //   }

  //   return fullSchedule;
  // }
}
