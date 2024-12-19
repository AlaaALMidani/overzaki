/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GoogleCampaignService } from './google-campaign.service';
@Controller('google-campaign')
export class GoogleCampaignController {
  constructor(private readonly campaignService: GoogleCampaignService) {}

  // Route to create a campaign
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
      const formatedStrtDate = new Date(startDate).toISOString().split('T')[0];
      const formatedEndDate = new Date(endDate).toISOString().split('T')[0];
      const budgetAmount = budgetAmountMicros * 10000000;
      const result = await this.campaignService.createCampaign(
        name,
        budgetAmount,
        formatedStrtDate,
        formatedEndDate,
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

  // Route to verify the user's ID token
  @Post('verify-token')
  async verifyToken(@Body() body: any) {
    const { idToken } = body;

    if (!idToken) {
      throw new HttpException('ID token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.campaignService.verifyIdToken(idToken);
      return {
        message: 'ID token verified successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to verify ID token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Route to fetch accessible accounts using the user's refresh token
  // @Post('accounts')
  // async getAccessibleAccounts(@Body() body: any) {
  //   const { refreshToken } = body;

  //   if (!refreshToken) {
  //     throw new HttpException(
  //       'Refresh token is required',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   try {
  //     const accounts =
  //       await this.campaignService.getAccessibleAccounts(refreshToken);
  //     return {
  //       message: 'Accessible accounts retrieved successfully',
  //       data: accounts,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to fetch accessible accounts',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // Route to get a campaign report
  @Post('report')
  async getCampaignReport(@Body() body: any) {
    const { customerId, refreshToken, campaignResourceName } = body;

    if (!customerId || !refreshToken || !campaignResourceName) {
      throw new HttpException(
        'Missing required fields in the body',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const report = await this.campaignService.getCampaignReport(
        customerId,
        refreshToken,
        campaignResourceName,
      );
      return {
        message: 'Campaign report retrieved successfully',
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch campaign report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
