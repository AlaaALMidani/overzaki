import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GoogleCampaignService } from './google-campaign.service';

@Controller('campaign')
export class GoogleCampaignController {
  constructor(private readonly campaignService: GoogleCampaignService) {}

  @Post('create')
  async createCampaign(@Body() body: any) {
    const { name, budgetAmountMicros, startDate, endDate } = body;

    if (!name || !budgetAmountMicros || !startDate || !endDate) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.campaignService.createCampaign(
        name,
        budgetAmountMicros,
        startDate,
        endDate,
      );
      return {
        message: 'Campaign created successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
