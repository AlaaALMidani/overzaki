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
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SnapchatCampaignService } from './snapchat-campaign.service';

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
  async createSnapAd(
    @Body() body: any,
    @Req() req: any,
  ) {
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
      brandName,
      headline,
      callToAction,
      url,
      file
    } = body;

    if (
      !name ||
      !minAge ||
      !countryCodes ||
      !budget ||
      !startTime ||
      !endTime ||
      !brandName ||
      !headline
    ) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file) {
      throw new HttpException('Video file is required', HttpStatus.BAD_REQUEST);
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
        countryCodesArray,
        parseFloat(budget),
        startTime,
        endTime,
        brandName,
        headline,
        languagesArray,
        osType,
        url,
        callToAction,
        file,
      );

      return {
        message: 'Snap Ad created successfully!',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating Snap Ad:', error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('CollectionAd')
  async createCollectionAd(
    @Body() body: any,
    @Req() req: any,
  ) {
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
      brandName,
      headline,
      interactionType,
      mainUrl,
      productUrls,
      callToAction,
      mainFile,
      product1,
      product2,
      product3,
      product4,
      iosAppId,
      androidAppUrl,
    } = body;

    if (
      !name ||
      !minAge ||
      !maxAge ||
      !countryCodes ||
      !budget ||
      !startTime ||
      !endTime ||
      !brandName ||
      !headline ||
      !interactionType ||
      !mainUrl ||
      !productUrls ||
      !callToAction
    ) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!mainFile) {
      throw new HttpException('Main file is required', HttpStatus.BAD_REQUEST);
    }

    if (
      !product1 ||
      !product2 ||
      !product3 ||
      !product4
    ) {
      throw new HttpException(
        'At least 4 product file is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!iosAppId && !androidAppUrl){
      throw new HttpException(
        'At least one of iosAppId or androidAppUrl is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const countryCodesArray = this.ensureArray(countryCodes);
    const languagesArray = this.ensureArray(languages);
    const productUrlsArray = this.ensureArray(productUrls);

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
        brandName,
        headline,
        interactionType,
        mainUrl,
        productUrlsArray,
        callToAction,
        mainFile,
        product1,
        product2,
        product3,
        product4,
        iosAppId,
        androidAppUrl,
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

  @Post('campaignReport')
  async getCampaignReport(
    @Body()
    body: {
      campaignId: string;
      orderId: string;
    },
  ) {
    try {
      const { campaignId, orderId } = body
      const report = await this.campaignService.generateCampaignReport(
        campaignId,
        orderId,
      );
      return {
        message: 'Report fetched successfully',
        details: report,
        status: report.status,
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
  
    // Validate query parameters
    if (!appName || !store) {
      throw new HttpException(
        'Both appName and store query parameters are required.',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    // Validate the store parameter
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
