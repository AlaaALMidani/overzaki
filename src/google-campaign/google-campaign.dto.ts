/* eslint-disable prettier/prettier */
export interface CreateSearchAdCampaignDto {
    campaignName: string;
    budgetAmountMicros: number;
    status: string;
    startDate: string;  
    endDate: string;
    adGroupName: string;
    keywords: Array<{ text: string; matchType: string; bidAmount: number }>;
    ads: Array<{ headline1: string; headline2: string; description1: string; finalUrl: string }>;
    biddingStrategyType?: string;
}

export interface CreateDisplayAdCampaignDto {
    campaignName: string;
    budgetAmountMicros: number;
    status: string;
    startDate: string;
    endDate: string;
    adGroupName: string;
    ads: Array<{ headline: string; description: string; finalUrl: string; imageUrl: string }>;
    biddingStrategyType?: string;
}

export interface CreateShoppingAdCampaignDto {
    campaignName: string;
    budgetAmountMicros: number;
    status: string;
    startDate: string;
    endDate: string;
    merchantId: string;
    salesCountry: string;
    priority: number;
    biddingStrategyType?: string;
}
