import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GoogleCampaignService {
  async createCampaign(
    name: string,
    budgetAmountMicros: number,
    startDate: string,
    endDate: string,
  ) {
    try {
      // Step 1: Get Access Token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: process.env.GOOGLE_ADS_CLIENT_ID,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        },
      );

      const accessToken = tokenResponse.data.access_token;

      // Step 2: Define Campaign Payload
      const campaignPayload = {
        campaign: {
          name,
          advertising_channel_type: 'SEARCH',
          status: 'ENABLED',
          manual_cpc: {},
          start_date: startDate,
          end_date: endDate,
          budget: {
            amount_micros: budgetAmountMicros,
            delivery_method: 'STANDARD',
          },
        },
      };

      // Step 3: Send Request to Google Ads API
      const apiResponse = await axios.post(
        `https://googleads.googleapis.com/v14/customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/campaigns:mutate`,
        {
          operations: [{ create: campaignPayload }],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
          },
        },
      );

      return apiResponse.data;
    } catch (error) {
      console.error(
        'Error creating campaign:',
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data || error.message);
    }
  }
}
