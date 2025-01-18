import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { YouTubeCampaignService } from './youtube-campaign.service';
@Controller('youtube-campaign')
export class YouTubeCampaignController {
  constructor(
    private readonly youtubeCampaignService: YouTubeCampaignService,
  ) {}

  @Post('create')
  async createCampaign(
    @Body('name') name: string,
    @Body('budgetAmountMicros') budgetAmountMicros: number,
    @Body('videoId') videoId: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('headlines') headlines: string[],
    @Body('descriptions') descriptions: string[],
    @Body('finalUrl') finalUrl: string,
    @Body('businessName') businessName: string,
    @Body('squareImage') squareImage: string,
    @Body('landscapeImage') landscapeImage: string,
    @Body('biddingStrategy') biddingStrategy: string,
    @Body('languages') languages: string[],
    @Body('keywords')
    keywords: {
      keyword: string;
      type: string;
    }[],
    @Body('locations') locations: string[],
  ) {
    try {
      const result = await this.youtubeCampaignService.createYouTubeCampaign(
        name,
        budgetAmountMicros,
        videoId,
        startDate,
        endDate,
        squareImage,
        landscapeImage,
        finalUrl,
        businessName,
        headlines,
        descriptions,
        languages,
        keywords,
        locations,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to create YouTube campaign.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
