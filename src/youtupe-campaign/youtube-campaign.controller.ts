import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { YouTubeCampaignService } from './youtube-campaign.service';
import { CreateYouTubeCampaignDto } from './create-youtube-campaign.dto';

@Controller('youtube-campaign')
export class YouTubeCampaignController {
  constructor(
    private readonly youtubeCampaignService: YouTubeCampaignService,
  ) {}

  @Post('create')
  async createCampaign(@Body() body: CreateYouTubeCampaignDto) {
    try {
      console.log('=== Received request to create YouTube campaign ===');

      const result = await this.youtubeCampaignService.createYouTubeCampaign(
        body.name,
        body.budgetAmountMicros,
        body.videoId,
        new Date(body.startDate).toISOString().split('T')[0], // Convert to YYYY-MM-DD
        new Date(body.endDate).toISOString().split('T')[0],
        body.biddingStrategy,
      );

      console.log('=== YouTube campaign created successfully ===');
      return result;
    } catch (error) {
      console.error('Error in YouTubeCampaignController:', error);

      const message =
        error.response?.message || 'Failed to create YouTube campaign';
      const details = error.response?.details || error.message;

      throw new HttpException(
        {
          message,
          details,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
