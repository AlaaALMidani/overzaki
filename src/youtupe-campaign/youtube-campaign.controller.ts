import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Req,
  Query,
  Get,
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
    @Body('squareImages') squareImages: string[],
    @Body('landscapeImages') landscapeImages: string[],
    @Body('square_logo_images') squareLogoImages: string[],
    @Body('biddingStrategy') biddingStrategy: string,
    @Body('languages') languages: string[],
    @Body('keywords')
    keywords: {
      keyword: string;
      type: string;
    }[],
    @Body('locations') locations: string[],
    @Body('gender') gender: string,
    @Body('ageRanges') ageRanges: string[],
    @Body('long_headline') longHeadline: string,
    @Body('callToAction') callToAction: string,
    @Req() req: any,
  ) {
    try {
      const result = await this.youtubeCampaignService.createYouTubeCampaign(
        req.user.id,
        req.user.walletId,
        name,
        budgetAmountMicros,
        videoId,
        startDate,
        endDate,
        squareImages,
        landscapeImages,
        squareLogoImages,
        finalUrl,
        businessName,
        headlines,
        descriptions,
        languages,
        keywords,
        locations,
        gender,
        ageRanges,
        longHeadline,
        callToAction,
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

  // @Get('search')
  // async searchVideos(
  //   @Query('query') query: string,
  //   @Query('maxResults') maxResults: number = 10,
  //   @Query('pageToken') pageToken?: string,
  // ) {
  //   if (!query) {
  //     throw new HttpException(
  //       'Query parameter is required',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   try {
  //     const { videos, nextPageToken, prevPageToken } =
  //       await this.youtubeCampaignService.getYoutubeVideosSuggestions(
  //         query,
  //         maxResults,
  //         pageToken,
  //       );

  //     return {
  //       message: 'Videos fetched successfully',
  //       data: videos,
  //       pagination: {
  //         nextPageToken,
  //         prevPageToken,
  //       },
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to fetch videos',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
