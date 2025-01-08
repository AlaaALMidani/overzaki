/* eslint-disable prettier/prettier */
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleCampaignService } from './google-campaign.service';

@Controller('google-campaign')
export class GoogleCampaignController {
  constructor(private readonly googleCampaignService: GoogleCampaignService) {}

  @Post('create-search-ad')
  async createSearchAd(@Body() body: any) {
    try {
      // Validate budget amount
      if (!body.budgetAmount || body.budgetAmount <= 0) {
        throw new HttpException(
          'Invalid budget amount. Please provide a valid value greater than 0.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.googleCampaignService.createFullSearchAd({
        campaignName: body.campaignName,
        budgetAmount: body.budgetAmount,
        startDate: body.startDate,
        endDate: body.endDate,
        headlines: body.headlines,
        descriptions: body.descriptions,
        finalUrl: body.finalUrl,
        path1: body.path1,
        path2: body.path2,
        sitelinks: body.sitelinks,
        callouts: body.callouts,
        phoneNumber: body.phoneNumber,
        location: body.location,
        promotions: body.promotions,
        ageRanges: body.ageRanges, // Added ageRanges
        languages: body.languages, // Added languages
      });

      return {
        message: 'Search Ad created successfully',
        data: response,
      };
    } catch (error) {
      // throw new HttpException(
      //   {
      //     message: 'Error creating Search Ad',
      //     error: error.message || 'Unknown error',
      //   },
      //   HttpStatus.INTERNAL_SERVER_ERROR,
      // );
      throw error
    }
  }
}
