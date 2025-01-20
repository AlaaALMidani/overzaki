/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { GoogleAdsApi, Customer } from 'google-ads-api';

import { enums } from 'google-ads-api';
import { OrderService } from '../order/order.service';

@Injectable()
export class GoogleCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly googleAdsApi: GoogleAdsApi;
  private readonly logger = new Logger(GoogleCampaignService.name);

  constructor(
    private readonly orderService: OrderService,
  ) {
    this.validateEnvVariables();

    this.googleAdsApi = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    this.googleAdsClient = this.googleAdsApi.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });
  }


  async createFullSearchAd(params: {
    userId: string;
    walletId: string;
    campaignName: string;
    budgetAmount: number;
    startDate: string;
    endDate: string;
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    path1?: string;
    path2?: string;
    genders: string[];
    keywords: {
      keyword: string;
      type: string;
    }[];
    sitelinks?: { text: string; finalUrl: string }[];
    callouts?: string[];
    phoneNumbers?: string[];
    locations?: string[]
    promotions?: { discount: string; finalUrl: string }[];
    ageRanges?: string[];
    languages?: any[];

  }): Promise<any> {
    try {

      console.log('Creating Full Search Ad with params:', params);

      const {
        userId,
        walletId,
        campaignName,
        budgetAmount,
        startDate,
        endDate,
        headlines,
        descriptions,
        finalUrl,
        path1 = '',
        path2 = '',
        ageRanges,
        // genders = [],
        locations = [],
        languages = [],
        keywords,
      } = params;
      await this.orderService.checkPayAbility(userId, budgetAmount, 25, 10000);

      const budgetResourceName = await this.createCampaignBudget(campaignName, budgetAmount);
      console.log('Campaign budget created:', budgetResourceName);

      const campaignResourceName = await this.createCampaign(campaignName, budgetResourceName, startDate, endDate);
      console.log('Campaign created:', campaignResourceName);

      //await this.addCallExtension(campaignResourceName, params.phoneNumbers?.[0]);
      await this.addGeoTargeting(campaignResourceName, locations);
      if (languages.length) {
        await this.addLanguageTargeting(campaignResourceName, languages);
      }
      // if (ageRanges.length) {
      //   await this.addAgeTargeting(campaignResourceName);
      // }
      const adGroupResourceName = await this.createAdGroup(campaignName, campaignResourceName);
      await this.addKeywordsToAdGroup(adGroupResourceName, keywords)

      console.log('Ad Group created:', adGroupResourceName);

      const adResourceName = await this.createAd(adGroupResourceName, finalUrl, headlines, descriptions, path1, path2);

      const order = await this.orderService.createOrderWithTransaction(
        userId,
        walletId,
        'Google Search Ad',
        budgetAmount,
        {
          base: {
            campaign_id: campaignResourceName,
            campaign_name: campaignName,
            schedule_start_time: startDate,
            schedule_end_time: endDate,
            budget: budgetAmount,
            finalUrl,
            headlines,
            descriptions,
            languages,
            keywords,
            locations,
            ageRanges,
          },
          campaign: campaignResourceName,
          adGroup: adGroupResourceName,
          ad: adResourceName,
        },
      );
      return {
        ...order,
        details: order.details.base,
      };
      // return {
      //   message: 'Search Ad created successfully',
      //   data: {
      //     campaignBudget: budgetResourceName,
      //     campaign: campaignResourceName,
      //     adGroup: adGroupResourceName,
      //   },
      // };
    } catch (error: any) {
      console.log('Error creating Search Ad:', error);
      this.logger.error('Error creating Search Ad:', error);
      throw new BadRequestException(
        {
          message: 'Failed to create Search Ad',
          d: error?.errors || error?.message || 'Unknown error',
        },
      
      );
    }
  }
  private async createCampaignBudget(campaignName: string, budgetAmount: number): Promise<string> {
    console.log('Creating campaign budget...');
    const response = await this.googleAdsClient.campaignBudgets.create([
      {
        name: `${campaignName}_Budget`,
        amount_micros: budgetAmount * 1_000_000,
        delivery_method: 'STANDARD',
      },
    ]);

    console.log('Budget creation response:', response);
    const budgetResourceName = response.results?.[0]?.resource_name;
    if (!budgetResourceName) throw new Error('Failed to create campaign budget.');
    return budgetResourceName;
  }
  private validateEnvVariables() {
    const requiredEnvVars = [
      'GOOGLE_ADS_CLIENT_ID',
      'GOOGLE_ADS_CLIENT_SECRET',
      'GOOGLE_ADS_DEVELOPER_TOKEN',
      'GOOGLE_ADS_CUSTOMER_ID',
      'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
      'GOOGLE_ADS_REFRESH_TOKEN',
    ];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`);
      }
    }
    console.log('Environment variables validated.');
  }
  private async createCampaign(
    campaignName: string,
    budgetResourceName: string,
    startDate: string,
    endDate: string,
  ): Promise<string> {
    console.log('Creating campaign...');
    const response = await this.googleAdsClient.campaigns.create([
      {
        name: campaignName,
        status: 'PAUSED',
        advertising_channel_type: 'SEARCH',
        manual_cpc: {},
        campaign_budget: budgetResourceName,
        start_date: startDate.replace(/-/g, ''),
        end_date: endDate.replace(/-/g, ''),
      },
    ]);
    console.log('Campaign creation response:', response);

    const campaignResourceName = response.results?.[0]?.resource_name;
    if (!campaignResourceName) throw new Error('Failed to create campaign.');
    return campaignResourceName;
  }
  async getAvailableLocations(keyword: string): Promise<any> {
    try {
      console.log(keyword)
      const query = `
        SELECT
          geo_target_constant.resource_name,
          geo_target_constant.id,
          geo_target_constant.name,
          geo_target_constant.country_code,
          geo_target_constant.target_type,
          geo_target_constant.status
        FROM
          geo_target_constant
        WHERE
          geo_target_constant.status = 'ENABLED'
          AND geo_target_constant.name LIKE '%${keyword}%'
        LIMIT 8
      `;

      const rows = await this.googleAdsClient.query(query);
      return rows.map(row => ({
        resourceName: row.geo_target_constant.resource_name,
        id: row.geo_target_constant.id,
        name: row.geo_target_constant.name,
        countryCode: row.geo_target_constant.country_code,
        targetType: row.geo_target_constant.target_type,
        status: row.geo_target_constant.status,
      }));
    } catch (error: any) {
      console.error('Error fetching available locations:', error);
      this.logger.error('Error fetching available locations:', error);
      throw new HttpException(
        {
          message: 'Failed to fetch available locations',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async addGenderTargeting(campaignResourceName: string): Promise<void> {
    try {
      const genders = [
        enums.GenderType.MALE,
        enums.GenderType.FEMALE,
        enums.GenderType.UNDETERMINED,
      ];

      const operations = genders.map(gender => ({
        create: {
          campaign: campaignResourceName,
          gender: gender,
        },
      }));

      await this.googleAdsClient.campaignCriteria.create((operations as any));

      console.log('Gender targeting added:', genders);
    } catch (error: any) {
      console.error('Error adding gender targeting:', error);
      this.logger.error('Error adding gender targeting:', error);
      throw new HttpException(
        {
          message: 'Failed to add gender targeting',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  public async addKeywordsToAdGroup(adGroupResourceName: string, keywords: {
    keyword: string;
    type: string;
  }[]) {
    console.log('Adding static keywords to ad group...');

    // Map static keywords to ad group criteria
    const adGroupCriteria = keywords.map(keyword => ({
      ad_group: adGroupResourceName,
      status: 'ENABLED',
      keyword: keyword,
    }));

    try {
      // Use the 'create' method to add the criteria
      const response = await this.googleAdsClient.adGroupCriteria.create((adGroupCriteria as any));
      console.log('Keywords added successfully:', response);
    } catch (error) {
      console.error('Failed to add keywords:', error);
      throw error;
    }
  }
  private async createAdGroup(campaignName: string, campaignResourceName: string): Promise<string> {
    console.log('Creating ad group...');
    const response = await this.googleAdsClient.adGroups.create([
      {
        name: `${campaignName}_AdGroup`,
        campaign: campaignResourceName,
        type: 'SEARCH_STANDARD',
        status: 'ENABLED',
      },
    ]);
    console.log('Ad group creatio n response:', response);

    const adGroupResourceName = response.results?.[0]?.resource_name;
    if (!adGroupResourceName) throw new Error('Failed to create ad group.');
    return adGroupResourceName;
  }
  private async createAd(
    adGroupResourceName: string,
    finalUrl: string,
    headlines: string[],
    descriptions: string[],
    path1: string,
    path2: string,
  ) {
    console.log('Creating ad...');
    const adData = {
      ad_group: adGroupResourceName,
      ad: {
        final_urls: [finalUrl],
        responsive_search_ad: {
          headlines: headlines.map((headline) => ({
            text: headline,
          })),
          descriptions: descriptions.map((description) => ({
            text: description,
          })),
          path1,
          path2,
        },
      },
    };
    console.log('Ad data:', adData);

    await this.googleAdsClient.adGroupAds.create([adData]);
    console.log('Ad creation completed.');
  }
  // private async addAgeTargeting(campaignResourceName: string, ageRanges: string[]) {
  //   console.log('إضافة استهداف الفئات العمرية...');

  //   // خريطة معرفات الفئات العمرية في Google Ads
  //   const ageRangeMapping: { [key: string]: string } = {
  //     "AGE_RANGE_18_24": "503001",
  //     "AGE_RANGE_25_34": "503002",
  //     "AGE_RANGE_35_44": "503003",
  //     "AGE_RANGE_45_54": "503004",
  //     "AGE_RANGE_55_64": "503005",
  //     "AGE_RANGE_65_UP": "503006",
  //   };

  //   // إنشاء أهداف الاستهداف
  //   const ageRangeTargets = ageRanges.map(age => {
  //     const criterionId = ageRangeMapping[age];
  //     if (!criterionId) {
  //       throw new Error(`فئة عمرية غير صحيحة: ${age}`);
  //     }

  //     return {
  //       campaign: campaignResourceName,
  //       criterion_id: criterionId,
  //       status: 'ENABLED', // تفعيل الاستهداف الإيجابي
  //     };
  //   });

  //   try {
  //     // استدعاء API لإضافة الاستهداف
  //     const response = await this.googleAdsClient.campaignCriteria.create(ageRangeTargets);
  //     console.log('تمت إضافة استهداف الفئات العمرية بنجاح:', response);
  //   } catch (error) {
  //     console.error('فشل في إضافة استهداف الفئات العمرية:', error);
  //     throw error;
  //   }
  // }
  async addAgeTargeting(campaignResourceName: string): Promise<void> {
    try {
      const ageRanges = [
        "AGE_RANGE_18_24",
        "AGE_RANGE_25_34",
        "AGE_RANGE_35_44",
        "AGE_RANGE_45_54",
        "AGE_RANGE_55_64",
        "AGE_RANGE_65_UP",
      ];

      const operations = ageRanges.map(ageRange => ({
        campaign: campaignResourceName,
        age_range: ageRange,
      }));

      await this.googleAdsClient.campaignCriteria.create((operations as any));

      console.log('Age targeting added:', ageRanges);
    } catch (error: any) {
      console.error('Error adding age targeting:', error);
      this.logger.error('Error adding age targeting:', error);
      throw new HttpException(
        {
          message: 'Failed to add age targeting',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getKeywordSuggestions(keyword: string, locations: string[], language): Promise<any> {
    console.log(locations)
    try {
      const response = await this.googleAdsClient.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        keyword_plan_network: 'GOOGLE_SEARCH',
        keyword_seed: {
          keywords: [keyword],
        },
        language: this.getLanguageId(language || 'English'),
        geo_target_constants: locations,
        include_adult_keywords: false,
        page_token: '',
        page_size: 3,
        keyword_annotation: [],
        toJSON: function (): { [k: string]: any; } {
          throw new Error('Function not implemented.');
        }
      });
      console.log(response)

      const formattedResponse = (response as any).map((item: any) => ({
        text: item.text,
        competition: item.keyword_idea_metrics?.competition || null,
        avg_monthly_searches: item.keyword_idea_metrics?.avg_monthly_searches || null,
      }));

      return formattedResponse;
    } catch (error: any) {
      console.log('Error fetching keyword suggestions:', error);
      throw new HttpException(
        {
          message: 'Failed to create ad group ad.',
          details: error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  public async addLanguageTargeting(campaignResourceName: string, languages: any[]) {
    console.log('Adding language targeting...');

    // Map the languages to valid ICampaignCriterion objects
    const languageTargets = languages.map(language => ({
      campaign: campaignResourceName,
      type: 'LANGUAGE',
      language: {
        language_constant: this.getLanguageId(language),
      },
      status: 'ENABLED', // You must provide a status
    }));

    try {
      const response = await this.googleAdsClient.campaignCriteria.create((languageTargets as any));
      console.log('Language targeting added:', response);
    } catch (error) {
      console.error('Failed to add language targeting:', error);
      throw error;
    }
  }
  private getLanguageId(language: string): string {

    const languageMap: Record<string, string> = {
      'Arabic': 'languageConstants/1019',
      'Bengali': 'languageConstants/1056',
      'Bulgarian': 'languageConstants/1020',
      'Catalan': 'languageConstants/1038',
      'Chinese (simplified)': 'languageConstants/1017',
      'Chinese (traditional)': 'languageConstants/1018',
      'Croatian': 'languageConstants/1039',
      'Czech': 'languageConstants/1021',
      'Danish': 'languageConstants/1009',
      'Dutch': 'languageConstants/1010',
      'English': 'languageConstants/1000',
      'Estonian': 'languageConstants/1043',
      'Filipino': 'languageConstants/1042',
      'Finnish': 'languageConstants/1011',
      'French': 'languageConstants/1002',
      'German': 'languageConstants/1001',
      'Greek': 'languageConstants/1022',
      'Gujarati': 'languageConstants/1072',
      'Hebrew': 'languageConstants/1027',
      'Hindi': 'languageConstants/1023',
      'Hungarian': 'languageConstants/1024',
      'Icelandic': 'languageConstants/1026',
      'Indonesian': 'languageConstants/1025',
      'Italian': 'languageConstants/1004',
      'Japanese': 'languageConstants/1005',
      'Kannada': 'languageConstants/1086',
      'Korean': 'languageConstants/1012',
      'Latvian': 'languageConstants/1028',
      'Lithuanian': 'languageConstants/1029',
      'Malay': 'languageConstants/1102',
      'Malayalam': 'languageConstants/1098',
      'Marathi': 'languageConstants/1101',
      'Norwegian': 'languageConstants/1013',
      'Persian': 'languageConstants/1064',
      'Polish': 'languageConstants/1030',
      'Portuguese': 'languageConstants/1014',
      'Punjabi': 'languageConstants/1110',
      'Romanian': 'languageConstants/1032',
      'Russian': 'languageConstants/1031',
      'Serbian': 'languageConstants/1035',
      'Slovak': 'languageConstants/1033',
      'Slovenian': 'languageConstants/1034',
      'Spanish': 'languageConstants/1003',
      'Swedish': 'languageConstants/1015',
      'Tamil': 'languageConstants/1130',
      'Telugu': 'languageConstants/1131',
      'Thai': 'languageConstants/1044',
      'Turkish': 'languageConstants/1037',
      'Ukrainian': 'languageConstants/1036',
      'Urdu': 'languageConstants/1041',
      'Vietnamese': 'languageConstants/1040'
    };
    const languageConstant = languageMap[language];
    if (!languageConstant) {
      throw new Error(`Unsupported language: ${language}`);
    }

    return languageConstant;
  }

  // private async addCallExtension(campaignResourceName: string, phoneNumber: string) {
  //   console.log('Adding call extension...');

  //   // إعداد بيانات الـ Call Extension
  //   const callExtension: any = {
  //     campaign: campaignResourceName,
  //     extension_type: google.ads.googleads.v17.enums.ExtensionTypeEnum.ExtensionType.CALL,
  //     extensions: [
  //       {
  //         call_feed_item: {
  //           phone_number: phoneNumber,
  //           country_code: 'US', // غيّر رمز الدولة حسب الحاجة
  //           call_conversion_reporting_state:
  //             google.ads.googleads.v17.enums.CallConversionReportingStateEnum.CallConversionReportingState.USE_ACCOUNT_LEVEL_CALL_CONVERSION_ACTION,
  //         },
  //       },
  //     ],
  //   };

  //   try {
  //     // استخدام دالة `create` لإضافة الـ Extension
  //     const response = await this.googleAdsClient.campaignExtensionSettings.create([callExtension]);

  //     console.log('Call extension added successfully:', response);
  //   } catch (error) {
  //     console.error('Failed to add call extension:', error);
  //     throw error;
  //   }
  // }

  public async addGeoTargeting(campaignResourceName: string, locations: string[]): Promise<void> {
    console.log('Adding geo-targeting to campaign:', campaignResourceName);

    // Prepare the campaign criteria
    const campaignCriteria = locations.map((location) => ({
      campaign: campaignResourceName,
      type: enums.CriterionType.LOCATION,
      location: { geo_target_constant: location }, // Ensure location is an object
      status: enums.CampaignCriterionStatus.ENABLED,
    }));

    try {
      // Create campaign criteria
      const response = await this.googleAdsClient.campaignCriteria.create(campaignCriteria);
      console.log('Geo-targeting added successfully:', response);
    } catch (error) {
      console.error('Failed to add geo-targeting:', error);
      throw error;
    }
  }
  async getAdReport(campaignId: string , orderId: string): Promise<any> {
    try {
      console.log('Fetching ad report for campaign:', campaignId);  
      const query =  `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.all_conversions,
        metrics.cost_per_all_conversions,
        metrics.view_through_conversions
      FROM
        campaign
      WHERE
        campaign.resource_name = '${campaignId}'
    `; 
  
      const rows = await this.googleAdsClient.query(query);
  
      const report = rows.map(row => ({
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        ctr: row.metrics.ctr,
        averageCpc: row.metrics.average_cpc,
        costMicros: row.metrics.cost_micros,
        conversions: row.metrics.conversions,
        allConversions: row.metrics.all_conversions,
        costPerAllConversions: row.metrics.cost_per_all_conversions,
        viewThroughConversions: row.metrics.view_through_conversions,
      }));
      console.log(report)
      const order = await this.orderService.getOrderById(orderId);
      console.log(order);
      return { ...report['0'], details: order.details, status: order.status };
      return report;
    } catch (error: any) {
      console.log('Error fetching ad report:', error);
      this.logger.error('Error fetching ad report:', error);
      throw new HttpException(
        {
          message: 'Failed to fetch ad report',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}