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
import { SnapchatCampaignService } from './snapchat-campaign.service';
import { url } from 'inspector';

@Controller('snapchat-campaign')
export class SnapchatCampaignController {
  private readonly logger = new Logger(SnapchatCampaignController.name);

  constructor(private readonly campaignService: SnapchatCampaignService) { }

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
    this.logger.log(code);
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

  @Post('SnapAd')
  async createSnapAd(@Body() body: any, @Req() req: any) {
    console.log(body);
    const {
      name,
      objective,
      minAge,
      maxAge,
      gender,
      languages,
      countryCodes,
      osType,
      budget,
      startTime,
      endTime,
      ads,
    } = body;

    if (
      !name ||
      !minAge ||
      !countryCodes ||
      !budget ||
      !startTime ||
      !endTime ||
      !ads
    ) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST
      );
    }

    const countryCodesArray = this.ensureArray(countryCodes);
    const languagesArray = this.ensureArray(languages);

    try {
      this.logger.log('Initiating Snap Ad creation...');
      const result = await this.campaignService.createSnapAd(
        req.user.id,
        req.user.walletId,
        objective,
        name,
        minAge,
        maxAge,
        gender,
        languagesArray,
        countryCodesArray,
        osType,
        parseFloat(budget),
        startTime,
        endTime,
        ads
      );

      return {
        message: 'Snap Ads created successfully!',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating Snap Ad:', error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('CollectionAd')
  async createCollectionAd(@Body() body: any, @Req() req: any) {
    console.log(body);
    const {
      name,
      objective,
      minAge,
      maxAge,
      gender,
      languages,
      countryCodes,
      osType,
      budget,
      startTime,
      endTime,
      interactionType,
      ads,
    } = body;

    // Validate required fields
    if (
      !name ||
      !minAge ||
      !maxAge ||
      !countryCodes ||
      !budget ||
      !startTime ||
      !endTime ||
      !ads
    ) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate ads object
    if (!ads || typeof ads !== 'object' || Object.keys(ads).length === 0) {
      throw new HttpException(
        'The `ads` object must contain at least one ad with required fields.',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const adKey in ads) {
      const ad = ads[adKey];
      if (
        !ad.brandName ||
        !ad.headline ||
        !ad.mainFile ||
        !ad.mainUrl ||
        !ad.productUrls ||
        !ad.productsImages ||
        !ad.callToAction
      ) {
        throw new HttpException(
          `Ad ${adKey} is missing required fields.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ad.productsImages || ad.productsImages.length === 0) {
        throw new HttpException(
          `Ad ${adKey} must have at least one product image.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ad.productUrls || ad.productUrls.length === 0) {
        throw new HttpException(
          `Ad ${adKey} must have at least one product URL.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }


    if (!interactionType || !['WEB_VIEW', 'DEEP_LINK'].includes(interactionType)) {
      throw new HttpException(
        'Invalid or missing interactionType. Must be either "WEB_VIEW" or "DEEP_LINK".',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (interactionType === 'DEEP_LINK') {
      for (const adKey in ads) {
        const ad = ads[adKey];
        if (!ad.iosAppId && !ad.androidAppUrl) {
          throw new HttpException(
            `Ad ${adKey} is missing both iosAppId and androidAppUrl, which are required for DEEP_LINK interaction type.`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpException(
        'Invalid startTime or endTime. Please provide valid dates.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (endDate <= startDate) {
      throw new HttpException(
        'endTime must be after startTime.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      throw new HttpException(
        'Languages must be a non-empty array.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Array.isArray(countryCodes) || countryCodes.length === 0) {
      throw new HttpException(
        'Country codes must be a non-empty array.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const countryCodesArray = this.ensureArray(countryCodes);
    const languagesArray = this.ensureArray(languages);

    try {
      this.logger.log('Initiating Collection Ad creation...');
      const result = await this.campaignService.createCollectionAd(
        req.user.id,
        req.user.walletId,
        name,
        objective,
        minAge,
        maxAge,
        gender,
        languagesArray,
        countryCodesArray,
        osType,
        parseFloat(budget),
        startTime,
        endTime,
        interactionType,
        ads
      );

      return {
        message: 'Collection Ad created successfully!',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating Collection Ad:', error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ExploreAd')
  async createExploreAd(@Body() body: any, @Req() req: any) {
  console.log(body)
    const {
      name,
      objective,
      minAge,
      maxAge,
      gender,
      languages,
      countryCodes,
      osType,
      budget,
      startTime,
      endTime,
      ads
    } = body;
  
    // Validate required fields
    if (
      !name ||
      !minAge ||
      !maxAge ||
      !countryCodes ||
      !budget ||
      !startTime ||
      !endTime ||
      !ads
    ) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    // Validate ads object
    if (!ads || typeof ads !== 'object' || Object.keys(ads).length === 0) {
      throw new HttpException(
        'The `ads` object must contain at least one ad with required fields.',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    for (const adKey in ads) {
      const ad = ads[adKey];
      if (
        !ad.brandName ||
        !ad.headline ||
        !ad.logo ||
        !ad.cover ||
        !ad.coverHeadline ||
        !ad.images ||
        !ad.mainUrl ||
        !ad.interactionType ||
        !ad.callToAction
      ) {
        throw new HttpException(
          `Ad ${adKey} is missing required fields.`,
          HttpStatus.BAD_REQUEST,
        );
      }
  
      if (!Array.isArray(ad.images) || ad.images.length <3) {
        throw new HttpException(
          'At least 3 image is required for the Explore Ad.',
          HttpStatus.BAD_REQUEST,
        );
      }
      ad.images=this.ensureArray(ad.images)
      if (ad.interactionType === 'DEEP_LINK' && !ad.iosAppId && !ad.androidAppUrl) {
        throw new HttpException(
          'At least one of iosAppId or androidAppUrl is required for DEEP_LINK interaction type.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    const countryCodesArray = this.ensureArray(countryCodes);
    const languagesArray = this.ensureArray(languages);
  
    try {
      this.logger.log('Initiating Explore Ad creation...');
      const result = await this.campaignService.createExploreAd(
        req.user.id,
        req.user.walletId,
        name,
        objective,
        minAge,
        maxAge,
        gender,
        languagesArray,
        countryCodesArray,
        osType,
        parseFloat(budget),
        startTime,
        endTime,
        ads
      );
  
      return {
        message: 'Explore Ad created successfully!',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating Explore Ad:', error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('campaignReport')
  async getCampaignReport(
    @Body()
    body: {
      orderId: string;
    },
  ) {
    try {
      const {orderId } = body;
      const report = await this.campaignService.generateCampaignReport(
        orderId,
      );
      return {
        message: 'Report fetched successfully',
        data: report
      };
    } catch (error) {
      this.logger.error('Error fetching campaign report:', error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get('app-id')
  async getAppId(
    @Query('appName') appName: string,
    @Query('store') store: 'google' | 'apple',
  ) {
    this.logger.log(`Fetching app ID for app: ${appName} from store: ${store}`);

    if (!appName || !store) {
      throw new HttpException(
        'Both appName and store query parameters are required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (store !== 'google' && store !== 'apple') {
      throw new HttpException(
        'Invalid store parameter. Use "google" or "apple".',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const appId = await this.campaignService.getAppId(appName, store);
      return { appId };
    } catch (error) {
      this.logger.error('Error fetching app ID:', error.message);
      throw new HttpException(
        error.message || 'Failed to fetch app ID',
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
