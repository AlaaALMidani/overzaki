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
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('file'))
  async createSnapAd(
    @Body() body: any,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const {
      name,
      minAge,
      countryCode,
      budget,
      startTime,
      endTime,
      brandName,
      headline,
    } = body;
    if (!name || !minAge || !countryCode || !budget || !startTime || !endTime || !brandName || !headline) {
      throw new HttpException(
        'Missing required fields. Please check your input.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!file) {
      throw new HttpException('Video file is required', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log('Initiating Snap Ad creation...');
      const result = await this.campaignService.createSnapAd(
        req.user.id,
        req.user.walletId,
        name,
        "SNAP_ADS",
        minAge,
        countryCode,
        parseFloat(budget),
        startTime,
        endTime,
        brandName,
        headline,
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


}