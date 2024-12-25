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

      // Validate and format dates
      const startDate = new Date(body.startDate).toISOString().split('T')[0];
      const endDate = new Date(body.endDate).toISOString().split('T')[0];

      // Validate request body fields
      if (!body.name || !body.budgetAmountMicros || !body.videoId) {
        throw new HttpException(
          'Missing required fields: name, budgetAmountMicros, or videoId.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.youtubeCampaignService.createYouTubeCampaign(
        body.name,
        body.budgetAmountMicros,
        body.videoId,
        startDate,
        endDate,
        body.biddingStrategy,
      );

      console.log('=== YouTube campaign created successfully ===');
      return result;
    } catch (error) {
      console.error('Error in YouTubeCampaignController:', error);

      const message =
        error.response?.message || 'Failed to create YouTube campaign';
      const details = error;

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
