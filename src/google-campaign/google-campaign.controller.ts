/* eslint-disable prettier/prettier */
import { Controller, Post, Body, HttpException, HttpStatus, Get, Query, Req } from '@nestjs/common';
import { GoogleCampaignService } from './google-campaign.service';

@Controller('google-campaign')
export class GoogleCampaignController {
  constructor(private readonly googleCampaignService: GoogleCampaignService) { }

  @Post('create-search-ad')
  async createSearchAd(@Body() body: any, @Req() req: any,) {
    try {
      // Validate budget amount
      if (!body.budgetAmount || body.budgetAmount <= 0) {
        throw new HttpException(
          'Invalid budget amount. Please provide a valid value greater than 0.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.googleCampaignService.createFullSearchAd({
        userId: req.user.id,
        walletId: req.user.walletId,
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
        phoneNumbers: body.phoneNumbers,
        locations: body.locations,
        promotions: body.promotions,
        ageRanges: body.ageRanges, // Added ageRanges
        languages: body.languages,
        keywords: body.keywords,
        genders: body.gender
      });

      return {
        message: 'Search Ad created successfully',
        data: response,
      };
    } catch (error) {

      throw error
    }
  }
  @Get('available-locations') async getAvailableLocations(
    @Query('keyword') keyword: string,
  ) {

    try {
      const locations = await this.googleCampaignService.getAvailableLocations(keyword);
      return {
        message: 'Available locations fetched successfully',
        data: locations,
      };
    } catch (error: any) {
      throw new HttpException(
        { message: 'Failed to fetch available locations', error: error?.errors || error?.message || 'Unknown error', }, HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }
  @Post('keyword-suggestions')
  async getKeywordSuggestions(
    @Body('keyword') keyword: string,
    @Body('geo_target_constants') geoTargetConstants: string[],
    @Body('language') language: string,
  ) {

    const suggestions = await this.googleCampaignService.getKeywordSuggestions(keyword, geoTargetConstants, language);
    return {
      message: 'Keyword suggestions fetched successfully',
      data: suggestions,
    };

  }

  @Get('report')
  async getAdReport(
    @Query('campaignId') campaignId: string,
    @Query('orderId') orderId: string,
  ) {
    try {
      if (!campaignId) {
        throw new HttpException('Campaign ID is required', HttpStatus.BAD_REQUEST);
      }

      const report = await this.googleCampaignService.getAdReport(campaignId , orderId);
      return {
        message: 'Ad report fetched successfully',
        report,
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to fetch ad report',
          error: error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
