import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

@Injectable()
export class GoogleCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly oauth2Client: OAuth2Client;
  private readonly googleAdsApi: GoogleAdsApi;

  constructor() {
    // Initialize the Google Ads API Client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_ADS_CLIENT_ID,
      process.env.GOOGLE_ADS_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    //temp
    this.googleAdsApi = new GoogleAdsApi({
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
  // Step 1: Verify the user's ID token
  async verifyIdToken(idToken: string) {
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_ADS_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid ID token');
    return { userId: payload.sub, email: payload.email };
  }

  // Step 2: Fetch accessible customer accounts using the user's refresh token
  // async getAccessibleAccounts(refreshToken: string) {
  //   const customer = this.googleAdsApi.Customer({
  //     refresh_token: refreshToken,
  //     customer_id: '',
  //   });

  //   const response = await customer.customerClients.list({
  //     query: `
  //       SELECT customer_client.client_customer,
  //              customer_client.descriptive_name
  //       FROM customer_client
  //       WHERE customer_client.status = 'ENABLED'
  //     `,
  //   });

  //   return response.results.map((account) => ({
  //     id: account.customer_client?.client_customer,
  //     name: account.customer_client?.descriptive_name,
  //   }));
  // }

  async createCampaign(
    name: string,
    budgetAmountMicros: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      // Create the Campaign Budget
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

      // Create the Campaign
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
      console.error('Error creating campaign:', error.errors);
      throw new HttpException({ error: error.errors }, HttpStatus.BAD_REQUEST);
    }
  }
  async getCampaignReport(
    customerId: string,
    refreshToken: string,
    campaignResourceName: string,
  ) {
    // const customer = this.googleAdsApi.Customer({
    //   refresh_token: refreshToken,
    //   customer_id: customerId,
    // });

    try {
      const report = await this.googleAdsClient.report({
        entity: 'campaign',
        attributes: [
          'campaign.id',
          'campaign.name',
          'campaign.status',
          'campaign.start_date',
          'campaign.end_date',
          'campaign.bidding_strategy_type',
          'campaign.advertising_channel_type',
          'campaign_budget.amount_micros',
        ],
        metrics: [
          'metrics.impressions',
          'metrics.clicks',
          'metrics.ctr',
          'metrics.cost_micros',
          'metrics.conversions',
          'metrics.conversions_value',
          'metrics.average_cpc',
          'metrics.search_impression_share',
        ],
        constraints: [
          {
            key: 'campaign.resource_name',
            op: '=',
            val: campaignResourceName,
          },
        ],
        limit: 1000,
      });

      return report;
    } catch (error) {
      console.error('Error fetching campaign report:', error);
      throw new Error('Failed to fetch campaign report.');
    }
  }
}
