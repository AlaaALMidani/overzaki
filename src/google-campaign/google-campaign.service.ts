import { Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GoogleCampaignService {
  private readonly googleAdsClient: Customer;

  constructor() {
    // Initialize the Google Ads API Client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    // Get a Customer instance for the specific customer ID
    this.googleAdsClient = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });
  }

  async createCampaign(
    name: string,
    budgetAmountMicros: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      // Step 1: Create the Campaign Budget
      const budgetResponse = await this.googleAdsClient.campaignBudgets.create([
        {
          name: `${name}_Budget`,
          amount_micros: budgetAmountMicros,
          delivery_method: 'STANDARD',
        },
      ]);

      // Extract the resource_name of the created budget
      const budgetResourceName = budgetResponse.results[0]?.resource_name;
      if (!budgetResourceName) {
        throw new Error(
          'Failed to retrieve resource_name for the campaign budget.',
        );
      }

      console.log('Campaign Budget Created:', budgetResourceName);

      // Step 2: Create the Campaign
      const campaignResponse = await this.googleAdsClient.campaigns.create([
        {
          name,
          status: 'PAUSED', // Set initial status
          advertising_channel_type: 'SEARCH',
          manual_cpc: {}, // Required for CPC bidding
          campaign_budget: budgetResourceName, // Associate the budget
          start_date: startDate,
          end_date: endDate,
        },
      ]);

      // Extract the resource_name of the created campaign
      const campaignResourceName = campaignResponse.results[0]?.resource_name;
      if (!campaignResourceName) {
        throw new Error('Failed to retrieve resource_name for the campaign.');
      }

      console.log('Campaign Created:', campaignResourceName);

      // Return Campaign Details
      return {
        campaignBudget: budgetResourceName,
        campaign: campaignResourceName,
      };
    } catch (error) {
      // Enhanced Error Handling
      console.error('Error creating campaign:', error);
      throw new Error(
        error?.response?.data?.error?.message ||
          'Failed to create campaign. Please check logs for details.',
      );
    }
  }
}
