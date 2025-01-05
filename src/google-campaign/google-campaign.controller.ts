// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   Controller,
//   Post,
//   Body,
//   HttpException,
//   HttpStatus,
//   Request,
// } from '@nestjs/common';
// import { GoogleCampaignService } from './google-campaign.service';
// @Controller('google-campaign')
// export class GoogleCampaignController {
//   constructor(private readonly campaignService: GoogleCampaignService) {}

//   // Route to create a campaign
//   @Post('create')
//   async createCampaign(@Request() req, @Body() body: any) {
//     const { name, budgetAmountMicros, startDate, endDate } = body;
//     console.log(req.user);
//     if (!name || !budgetAmountMicros || !startDate || !endDate) {
//       throw new HttpException(
//         'Missing required fields',
//         HttpStatus.BAD_REQUEST,
//       );
//     }
//     try {
//       const formatedStrtDate = new Date(startDate).toISOString().split('T')[0];
//       const formatedEndDate = new Date(endDate).toISOString().split('T')[0];
//       const budgetAmount = budgetAmountMicros * 1_000_000;
//       const result = await this.campaignService.createCampaign(
//         name,
//         budgetAmount,
//         formatedStrtDate,
//         formatedEndDate,
//       );
//       return {
//         message: 'Campaign created successfully',
//         data: result,
//       };
//     } catch (error) {
//       throw new HttpException(
//         error.response || 'Failed to create campaign',
//         HttpStatus.BAD_REQUEST,
//       );
//     }
//   }

//   // Route to verify the user's ID token
//   @Post('verify-token')
//   async verifyToken(@Body() body: any) {
//     const { idToken } = body;

//     if (!idToken) {
//       throw new HttpException('ID token is required', HttpStatus.BAD_REQUEST);
//     }

//     try {
//       const result = await this.campaignService.verifyIdToken(idToken);
//       return {
//         message: 'ID token verified successfully',
//         data: result,
//       };
//     } catch (error) {
//       throw new HttpException(
//         error.errors || 'Failed to verify ID token',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   // Route to get a campaign report
//   @Post('report')
//   async getCampaignReport(@Body() body: any) {
//     // const { customerId, refreshToken, campaignResourceName } = body;
//     const { campaignResourceName } = body;

//     // if (!customerId || !refreshToken || !campaignResourceName) {
//     //   throw new HttpException(
//     //     'Missing required fields in the body',
//     //     HttpStatus.BAD_REQUEST,
//     //   );
//     // }
//     console.log(body);
//     console.log(campaignResourceName);
//     if (!campaignResourceName) {
//       throw new HttpException(
//         'Missing required fields in the body',
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     try {
//       const report = await this.campaignService.getCampaignReport(
//         // customerId,
//         // refreshToken,
//         campaignResourceName,
//       );
//       return {
//         message: 'Campaign report retrieved successfully',
//         data: report,
//       };
//     } catch (error) {
//       throw new HttpException(
//         JSON.stringify(error, null, 2) || 'Failed to fetch campaign report',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }

// //cbAewMdJOXHk2czr

/* eslint-disable prettier/prettier */
// import {
//   Controller,
//   Post,
//   Body,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { GoogleCampaignService } from './google-campaign.service';

// @Controller('google-campaign')
// export class GoogleCampaignController {
//   constructor(private readonly campaignService: GoogleCampaignService) {}

//   // Create a full Search Ad
//   @Post('create-full-search-ad')
//   async createFullSearchAd(@Body() body: any) {
//     const {
//       campaignName,
//       budgetAmountMicros,
//       startDate,
//       endDate,
//       keywords,
//       headlines,
//       descriptions,
//       finalUrl,
//       path1,
//       path2,
//       sitelinks,
//       callouts,
//       phoneNumber,
//       location,
//       promotions,
//     } = body;

//     // Check required fields
//     if (
//       !campaignName ||
//       !budgetAmountMicros ||
//       !startDate ||
//       !endDate ||
//       !keywords ||
//       !headlines ||
//       !descriptions ||
//       !finalUrl
//     ) {
//       throw new HttpException(
//         'Missing required fields',
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     try {
//       const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
//       const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
//       const budgetAmount = budgetAmountMicros * 1_000_000;

//       const result = await this.campaignService.createFullSearchAd(
//         campaignName,
//         budgetAmount,
//         formattedStartDate,
//         formattedEndDate,
//         keywords,
//         headlines,
//         descriptions,
//         finalUrl,
//         path1,
//         path2,
//         sitelinks,
//         callouts,
//         phoneNumber,
//         location,
//         promotions,
//       );

//       return {
//         message: 'Full Search Ad created successfully',
//         data: result,
//       };
//     } catch (error) {
//       throw new HttpException(
//         error.response || 'Failed to create Search Ad',
//         HttpStatus.BAD_REQUEST,
//       );
//     }
//   }
// }
