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
    @Body('biddingStrategy') biddingStrategy: string,
  ) {
    try {
      const result = await this.youtubeCampaignService.createYouTubeCampaign(
        name,
        budgetAmountMicros,
        videoId,
        startDate,
        endDate,
        biddingStrategy,
      );
      return result;
    } catch (error) {
      throw error;
      throw new HttpException(
        {
          message: 'Failed to create YouTube campaign.',
          details: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
