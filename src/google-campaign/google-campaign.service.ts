/* eslint-disable prettier/prettier */
// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { GoogleAdsApi, Customer } from 'google-ads-api';
// import * as dotenv from 'dotenv';
// import { OAuth2Client } from 'google-auth-library';

// dotenv.config();

// @Injectable()
// export class GoogleCampaignService {
//   private readonly googleAdsClient: Customer;
//   private readonly oauth2Client: OAuth2Client;
//   private readonly googleAdsApi: GoogleAdsApi;

//   constructor() {
//     // Initialize the Google Ads API Client
//     const client = new GoogleAdsApi({
//       client_id: process.env.GOOGLE_ADS_CLIENT_ID,
//       client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
//       developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
//     });

//     this.oauth2Client = new OAuth2Client(
//       process.env.GOOGLE_ADS_CLIENT_ID,
//       process.env.GOOGLE_ADS_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI,
//     );
//     //temp
//     this.googleAdsApi = new GoogleAdsApi({
//       client_id: process.env.GOOGLE_ADS_CLIENT_ID,
//       client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
//       developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
//     });

//     // Get a Customer instance for the specific customer ID
//     this.googleAdsClient = client.Customer({
//       customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
//       login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
//       refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
//     });
//   }
//   // Step 1: Verify the user's ID token
//   async verifyIdToken(idToken: string) {
//     const ticket = await this.oauth2Client.verifyIdToken({
//       idToken,
//       audience: process.env.GOOGLE_ADS_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     if (!payload) throw new Error('Invalid ID token');
//     return { userId: payload.sub, email: payload.email };
//   }

//   async createCampaign(
//     name: string,
//     budgetAmountMicros: number,
//     startDate: string,
//     endDate: string,
//   ) {
//     try {
//       // Create the Campaign Budget
//       const budgetResponse = await this.googleAdsClient.campaignBudgets.create([
//         {
//           name: `${name}_Budget`,
//           amount_micros: budgetAmountMicros,
//           delivery_method: 'STANDARD',
//         },
//       ]);

//       // Extract the resource_name of the created budget
//       const budgetResourceName = budgetResponse.results[0]?.resource_name;
//       if (!budgetResourceName) {
//         throw new Error(
//           'Failed to retrieve resource_name for the campaign budget.',
//         );
//       }

//       console.log('Campaign Budget Created:', budgetResourceName);

//       // Create the Campaign
//       const campaignResponse = await this.googleAdsClient.campaigns.create([
//         {
//           name,
//           status: 'PAUSED', // Set initial status
//           advertising_channel_type: 'SEARCH',
//           manual_cpc: {}, // Required for CPC bidding
//           campaign_budget: budgetResourceName, // Associate the budget
//           start_date: startDate,
//           end_date: endDate,
//         },
//       ]);

//       // Extract the resource_name of the created campaign
//       const campaignResourceName = campaignResponse.results[0]?.resource_name;
//       if (!campaignResourceName) {
//         throw new Error('Failed to retrieve resource_name for the campaign.');
//       }

//       console.log('Campaign Created:', campaignResourceName);

//       // Return Campaign Details
//       return {
//         campaignBudget: budgetResourceName,
//         campaign: campaignResourceName,
//       };
//     } catch (error) {
//       console.error('Error creating campaign:', error.errors);
//       throw new HttpException({ error: error.errors }, HttpStatus.BAD_REQUEST);
//     }
//   }
//   async getCampaignReport(
//     // customerId: string,
//     // refreshToken: string,
//     campaignResourceName: string,
//   ) {
//     // const customer = this.googleAdsApi.Customer({
//     //   refresh_token: refreshToken,
//     //   customer_id: customerId,
//     // });

//     try {
//       const report = await this.googleAdsClient.report({
//         entity: 'campaign',
//         attributes: [
//           'campaign.id',
//           'campaign.name',
//           'campaign.status',
//           'campaign.start_date',
//           'campaign.end_date',
//           'campaign.bidding_strategy_type',
//           'campaign.advertising_channel_type',
//           'campaign_budget.amount_micros',
//         ],
//         metrics: [
//           'metrics.impressions',
//           'metrics.clicks',
//           'metrics.ctr',
//           'metrics.cost_micros',
//           'metrics.conversions',
//           'metrics.conversions_value',
//           'metrics.average_cpc',
//           'metrics.search_impression_share',
//         ],
//         constraints: [
//           {
//             key: 'campaign.resource_name',
//             op: '=',
//             val: campaignResourceName,
//           },
//         ],
//         limit: 1000,
//       });

//       return report;
//     } catch (error) {
//       console.error('Error fetching campaign report:', error);
//       throw new Error('Failed to fetch campaign report.');
//     }
//   }
// }


// import {Injectable } from '@nestjs/common';
// import { GoogleAdsApi, Customer } from 'google-ads-api';
// import { OAuth2Client } from 'google-auth-library';
// import * as dotenv from 'dotenv';
// import { CreateDisplayAdCampaignDto, CreateSearchAdCampaignDto, CreateShoppingAdCampaignDto } from './google-campaign.dto';

// dotenv.config();

// @Injectable()
// export class GoogleCampaignService {
//   private readonly googleAdsClient: Customer;
//   private readonly oauth2Client: OAuth2Client;

//   constructor() {
//     const client = new GoogleAdsApi({
//       client_id: process.env.GOOGLE_ADS_CLIENT_ID,
//       client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
//       developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
//     });

//     this.oauth2Client = new OAuth2Client(
//       process.env.GOOGLE_ADS_CLIENT_ID,
//       process.env.GOOGLE_ADS_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI,
//     );

//     this.googleAdsClient = client.Customer({
//       customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
//       login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
//       refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
//     });
//   }

//   // Helper to create a campaign budget
//   async createBudget(name: string, amountMicros: number): Promise<string> {
//     const budgetResponse = await this.googleAdsClient.campaignBudgets.create([
//       {
//         name: `${name}_Budget`,
//         amount_micros: amountMicros,
//         delivery_method: 'STANDARD',
//       },
//     ]);
//     return budgetResponse.results[0]?.resource_name;
//   }

//   // Helper to create an ad group
//   async addKeywordsToAdGroup(
//     adGroupResourceName: string,
//     keywords: Array<{ text: string; matchType: string; bidAmount: number }>
//   ) {
//     if (!keywords?.length) return;

//     const keywordOperations = keywords.map((keyword) => ({
//       ad_group: adGroupResourceName,
//       status: 'ENABLED',
//       criterion: {
//         keyword: {
//           text: keyword.text,
//           match_type: keyword.matchType, // 'EXACT', 'PHRASE', 'BROAD'
//         },
//         cpc_bid_micros: Math.round(keyword.bidAmount * 1_000_000), // Ensure it's an integer
//       },
//     }));

//     try {
//       const response = await 
//       this.
//       googleAdsClient.
//       adGroupCriteria.
//       create(
//         keywordOperations
//       );

//       console.log('Keywords added successfully:', response.results);
//       return response;
//     } catch (error) {
//       console.error('Error adding keywords to ad group:', error);
//       throw new Error('Failed to add keywords to ad group.');
//     }
//   }




//   // Helper to add search ads
//   async addSearchAds(adGroupResourceName: string, ads: Array<{ headline1: string; headline2: string; description1: string; finalUrl: string }>) {
//     if (!ads?.length) return;

//     const adOperations = ads.map((ad) => ({
//       create: {
//         ad_group: adGroupResourceName,
//         ad: {
//           expanded_text_ad: {
//             headline_part1: ad.headline1,
//             headline_part2: ad.headline2,
//             description: ad.description1,
//           },
//           final_urls: [ad.finalUrl],
//         },
//         status: 'ENABLED',
//       },
//     }));

//     await this.googleAdsClient.mutate({
//       operations: adOperations,
//     });
//   }

//   // Helper to add display ads
//   async addDisplayAds(adGroupResourceName: string, ads: Array<{ headline: string; description: string; finalUrl: string; imageUrl: string }>) {
//     if (!ads?.length) return;

//     const adOperations = ads.map((ad) => ({
//       ad_group: adGroupResourceName,
//       ad: {
//         responsive_display_ad: {
//           headlines: [{ text: ad.headline }],
//           descriptions: [{ text: ad.description }],
//           marketing_images: [{ url: ad.imageUrl }],
//           final_urls: [ad.finalUrl],
//         },
//       },
//       status: 'ENABLED',
//     }));
//     await this.googleAdsClient.ads.create(adOperations);
//   }

//   // Create a Search Campaign
//   async createSearchCampaign(data: CreateSearchAdCampaignDto) {
//     try {
//       const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);

//       const campaignResponse = await this.googleAdsClient.campaigns.create([
//         {
//           name: data.campaignName,
//           status: data.status,
//           advertising_channel_type: 'SEARCH',
//           campaign_budget: budgetResourceName,
//           bidding_strategy_type: data.biddingStrategyType || 'MANUAL_CPC',
//           start_date: data.startDate,
//           end_date: data.endDate,
//         },
//       ]);

//       const campaignResourceName = campaignResponse.results[0]?.resource_name;
//       const adGroupResourceName = await this.createAdGroup(campaignResourceName, data.adGroupName);

//       await this.addKeywordsToAdGroup(adGroupResourceName, data.keywords);
//       await this.addSearchAds(adGroupResourceName, data.ads);

//       return { campaign: campaignResourceName, adGroup: adGroupResourceName, budget: budgetResourceName };
//     } catch (error) {
//       throw new Error(`Error creating Search campaign: ${error.message}`);
//     }
//   }

//   // Create a Display Campaign
//   async createDisplayCampaign(data: CreateDisplayAdCampaignDto) {
//     try {
//       const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);

//       const campaignResponse = await this.googleAdsClient.campaigns.create([
//         {
//           name: data.campaignName,
//           status: data.status,
//           advertising_channel_type: 'DISPLAY',
//           campaign_budget: budgetResourceName,
//           bidding_strategy_type: data.biddingStrategyType || 'MAXIMIZE_CONVERSIONS',
//           start_date: data.startDate,
//           end_date: data.endDate,
//         },
//       ]);

//       const campaignResourceName = campaignResponse.results[0]?.resource_name;
//       const adGroupResourceName = await this.createAdGroup(campaignResourceName, data.adGroupName);

//       await this.addDisplayAds(adGroupResourceName, data.ads);

//       return { campaign: campaignResourceName, adGroup: adGroupResourceName, budget: budgetResourceName };
//     } catch (error) {
//       throw new Error(`Error creating Display campaign: ${error.message}`);
//     }
//   }

//   // Create a Shopping Campaign
//   async createShoppingCampaign(data: CreateShoppingAdCampaignDto) {
//     try {
//       const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);

//       const campaignResponse = await this.googleAdsClient.campaigns.create([
//         {
//           name: data.campaignName,
//           status: data.status,
//           advertising_channel_type: 'SHOPPING',
//           campaign_budget: budgetResourceName,
//           bidding_strategy_type: data.biddingStrategyType || 'TARGET_ROAS',
//           start_date: data.startDate,
//           end_date: data.endDate,
//           shopping_setting: {
//             merchant_id: data.merchantId,
//             sales_country: data.salesCountry,
//             campaign_priority: data.priority,
//           },
//         },
//       ]);

//       const campaignResourceName = campaignResponse.results[0]?.resource_name;
//       return { campaign: campaignResourceName, budget: budgetResourceName };
//     } catch (error) {
//       throw new Error(`Error creating Shopping campaign: ${error.message}`);
//     }
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();
@Injectable()
export class GoogleCampaignService {
  private readonly logger = new Logger(GoogleCampaignService.name);
  private readonly apiVersion = 'v18';

  private async getAccessToken(): Promise<string> {
    try {
      const url = 'https://oauth2.googleapis.com/token';
      const response = await axios.post(url, {
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      });
      return response.data.access_token;
    } catch (error) {
      this.logger.error(`Error getting access token: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async makeGoogleAdsRequest(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, data?: any): Promise<any> {
    const accessToken = await this.getAccessToken();
    const url = `https://googleads.googleapis.com/<span class="math-inline">\{this\.apiVersion\}/customers/</span>{process.env.GOOGLE_ADS_CUSTOMER_ID}/${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Google Ads API request to ${url} failed: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Response status: ${error.response.status}`);
      }
      throw error;
    }
  }

  private async createBudget(name: string, amountMicros: number): Promise<string> {
    const data = {
      campaign_budget: {
        name: `${name}_Budget`,
        amount_micros: amountMicros,
        delivery_method: 'STANDARD',
      },
    };
    const response = await this.makeGoogleAdsRequest('post', 'campaignBudgets', data);
    return response.resource_name;
  }

  private async createCampaign(
    name: string, budgetResourceName: string, startDate: string, endDate: string, biddingStrategyType: string, advertisingChannelType: string
  ): Promise<string> {
    const data = {
      campaign: {
        name,
        status: 'ENABLED',
        advertising_channel_type: advertisingChannelType,
        campaign_budget: budgetResourceName,
        bidding_strategy_type: biddingStrategyType,
        start_date: startDate.replace(/-/g, ''),
        end_date: endDate.replace(/-/g, ''),
      },
    };
    const response = await this.makeGoogleAdsRequest('post', 'campaigns', data);
    return response.resource_name;
  }

  private async createAdGroup(campaignResourceName: string, name: string): Promise<string> {
    const data = {
      ad_group: {
        name,
        campaign: campaignResourceName,
        status: 'ENABLED',
      },
    };
    const response = await this.makeGoogleAdsRequest('post', 'adGroups', data);
    return response.resource_name;
  }

  private async addKeywordsToAdGroup(adGroupResourceName: string, keywords: Array<{ text: string; matchType: string; bidAmount: number }>) {
    if (!keywords?.length) return;

    const operations = keywords.map((keyword) => ({
      create: {
        ad_group: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: keyword.text,
          match_type: keyword.matchType,
        },
        cpc_bid_micros: Math.round(keyword.bidAmount * 1_000_000),
      },
    }));

    await this.makeGoogleAdsRequest('post', 'adGroupCriteria:mutate', { operations });
  }

  private async addSearchAds(adGroupResourceName: string, ads: Array<{ headline1: string; headline2: string; description1: string; finalUrl: string }>) {
    if (!ads?.length) return;

    const operations = ads.map((ad) => ({
      create: {
        ad_group: adGroupResourceName,
        ad: {
          expanded_text_ad: {
            headline_part1: ad.headline1,
            headline_part2: ad.headline2,
            description: ad.description1,
          },
          final_urls: [ad.finalUrl],
        },
        status: 'ENABLED',
      },
    }));

    await this.makeGoogleAdsRequest('post', 'adGroupAds:mutate', { operations });
  }

  private async addDisplayAds(adGroupResourceName: string, ads: Array<{ headline: string; description: string; finalUrl: string; imageUrl: string }>) {
    if (!ads?.length) return;

    const operations = ads.map((ad) => ({
      create: {
        ad_group: adGroupResourceName,
        ad: {
          responsive_display_ad: {
            headlines: [{ text: ad.headline }],
            descriptions: [{ text: ad.description }],
            marketing_images: [{ url: ad.imageUrl }],
            final_urls: [ad.finalUrl],
          },
        },
        status: 'ENABLED',
      },
    }));

    await this.makeGoogleAdsRequest('post', 'adGroupAds:mutate', { operations });
  }


  public async createSearchCampaign(data: {
    campaignName: string;
    budgetAmountMicros: number;
    startDate: string;
    endDate: string;
    biddingStrategyType: string;
    adGroupName: string;
    keywords: Array<{ text: string; matchType: string; bidAmount: number }>;
    ads: Array<{ headline1: string; headline2: string; description1: string; finalUrl: string }>;
  }) {
    try {
      const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);
      const campaignResourceName = await this.createCampaign(
        data.campaignName, budgetResourceName, data.startDate, data.endDate, data.biddingStrategyType, 'SEARCH'
      );
      const adGroupResourceName = await this.createAdGroup(campaignResourceName, data.adGroupName);
      await this.addKeywordsToAdGroup(adGroupResourceName, data.keywords);
      await this.addSearchAds(adGroupResourceName, data.ads);

      return { campaign: campaignResourceName, adGroup: adGroupResourceName, budget: budgetResourceName };
    } catch (error) {
      this.logger.error(`Error creating Search campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  public async createDisplayCampaign(data: {
    campaignName: string;
    budgetAmountMicros: number;
    startDate: string;
    endDate: string;
    biddingStrategyType: string;
    adGroupName: string;
    ads: Array<{ headline: string; description: string; finalUrl: string; imageUrl: string }>;
  }) {
    try {
      const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);
      const campaignResourceName = await this.createCampaign(
        data.campaignName, budgetResourceName, data.startDate, data.endDate, data.biddingStrategyType, 'DISPLAY'
      );
      const adGroupResourceName = await this.createAdGroup(campaignResourceName, data.adGroupName);
      await this.addDisplayAds(adGroupResourceName, data.ads);

      return { campaign: campaignResourceName, adGroup: adGroupResourceName, budget: budgetResourceName };
    } catch (error) {
      this.logger.error(`Error creating Display campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  // public async createShoppingCampaign(data: {
  //   campaignName: string;
  //   budgetAmountMicros: number;
  //   startDate: string;
  //   endDate: string;
  //   biddingStrategyType: string;
  //   merchantId: number;
  //   salesCountry: string;
  //   priority: number;
  // }) {
  //   try {
  //     const budgetResourceName = await this.createBudget(data.campaignName, data.budgetAmountMicros);
  //     const campaignResourceName = await this.createCampaign(
  //       data.campaignName, budgetResourceName, data.startDate, data.endDate, data.biddingStrategyType
  //     );

  //     const url = `https://googleads.googleapis.com/${this.apiVersion}/customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/campaigns/${campaignResourceName}`;
  //     const campaignData = {
  //       update_mask: 'shopping_setting', // Important: Specify the fields to update
  //       campaign: {
  //         resource_name: campaignResourceName,
  //         shopping_setting: {
  //           merchant_id: data.merchantId,
  //           sales_country: data.salesCountry,
  //           campaign_priority: data.priority,
  //         },
  //       },
  //     };

  //     await this.makeGoogleAdsRequest('patch', url, campaignData); // Use PATCH to update the campaign

  //     return { campaign: campaignResourceName, budget: budgetResourceName };
  //   } catch (error) {
  //     this.logger.error(`Error creating Shopping campaign: ${error.message}`, error.stack);
  //     throw error;
  //   }
  // }
}
