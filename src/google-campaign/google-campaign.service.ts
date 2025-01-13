/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GoogleAdsApi, Customer, ResourceNames } from 'google-ads-api';

import { enums } from 'google-ads-api';
@Injectable()
export class GoogleCampaignService {
  private readonly googleAdsClient: Customer;
  private readonly googleAdsApi: GoogleAdsApi;
  private readonly logger = new Logger(GoogleCampaignService.name);

  constructor() {
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
    location?: {
      streetAddress: string;
      city: string;
      country: string;
      postalCode: string;
    };
    promotions?: { discount: string; finalUrl: string }[];
    ageRanges?: string[];
    languages?: any[];

  }): Promise<any> {
    try {
      console.log('Creating Full Search Ad with params:', params);

      const {
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
        languages = [],
        keywords,
      } = params;

      const budgetResourceName = await this.createCampaignBudget(campaignName, budgetAmount);
      console.log('Campaign budget created:', budgetResourceName);

      const campaignResourceName = await this.createCampaign(campaignName, budgetResourceName, startDate, endDate);
      console.log('Campaign created:', campaignResourceName);

      //await this.addCallExtension(campaignResourceName, params.phoneNumbers?.[0]);
      await this.addGeoTargeting(campaignResourceName);
      if (languages.length) {
        await this.addLanguageTargeting(campaignResourceName, languages);
      }
      if (ageRanges.length) {
        await this.addAgeTargeting(campaignResourceName);
      }
      const adGroupResourceName = await this.createAdGroup(campaignName, campaignResourceName);
      await this.addKeywordsToAdGroup(adGroupResourceName, keywords)

      console.log('Ad Group created:', adGroupResourceName);

      await this.createAd(adGroupResourceName, finalUrl, headlines, descriptions, path1, path2);

      return {
        message: 'Search Ad created successfully',
        data: {
          campaignBudget: budgetResourceName,
          campaign: campaignResourceName,
          adGroup: adGroupResourceName,
        },
      };
    } catch (error: any) {
      console.error('Error creating Search Ad:', error);
      this.logger.error('Error creating Search Ad:', error);
      throw new HttpException(
        {
          message: 'Failed to create Search Ad',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
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
        } ,
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

  private async addKeywordsToAdGroup(adGroupResourceName: string, keywords: {
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
  async getKeywordSuggestions(keyword: string, locations: string[]): Promise<any> {
    try {
      const response = await this.googleAdsClient.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        keyword_plan_network: 'GOOGLE_SEARCH',
        keyword_seed: {
          keywords: [keyword],
        },
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
      
      const formattedResponse =(response as any).map((item: any) => ({
        text: item.text,
        competition: item.keyword_idea_metrics?.competition || null,
        avg_monthly_searches: item.keyword_idea_metrics?.avg_monthly_searches || null,
      }));

      return formattedResponse ;
    } catch (error: any) {
      console.error('Error fetching keyword suggestions:', error);
      this.logger.error('Error fetching keyword suggestions:', error);
      throw new HttpException(
        {
          message: 'Failed to fetch keyword suggestions',
          error: error?.errors || error?.message || 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private async addLanguageTargeting(campaignResourceName: string, languages: any[]) {
    console.log('Adding language targeting...');

    // Map the languages to valid ICampaignCriterion objects
    const languageTargets = languages.map(language => ({
      campaign: campaignResourceName,
      type: 'LANGUAGE',
      language: {
        language_constant: this.getLanguageId(language.language),
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
      'Afrikaans': 'languageConstants/1006',
      'Albanian': 'languageConstants/1019',
      'Amharic': 'languageConstants/1020',
      'Arabic': 'languageConstants/1007',
      'Armenian': 'languageConstants/1021',
      'Azerbaijani': 'languageConstants/1022',
      'Basque': 'languageConstants/1023',
      'Belarusian': 'languageConstants/1024',
      'Bengali': 'languageConstants/1025',
      'Bosnian': 'languageConstants/1026',
      'Bulgarian': 'languageConstants/1027',
      'Catalan': 'languageConstants/1008',
      'Chinese (Simplified)': 'languageConstants/1018',
      'Chinese (Traditional)': 'languageConstants/1028',
      'Croatian': 'languageConstants/1029',
      'Czech': 'languageConstants/1003',
      'Danish': 'languageConstants/1009',
      'Dutch': 'languageConstants/1010',
      'English': 'languageConstants/1000',
      'Estonian': 'languageConstants/1030',
      'Filipino': 'languageConstants/1011',
      'Finnish': 'languageConstants/1012',
      'French': 'languageConstants/1002',
      'Galician': 'languageConstants/1031',
      'Georgian': 'languageConstants/1032',
      'German': 'languageConstants/1001',
      'Greek': 'languageConstants/1013',
      'Gujarati': 'languageConstants/1033',
      'Hebrew': 'languageConstants/1014',
      'Hindi': 'languageConstants/1015',
      'Hungarian': 'languageConstants/1016',
      'Icelandic': 'languageConstants/1034',
      'Indonesian': 'languageConstants/1017',
      'Irish': 'languageConstants/1035',
      'Italian': 'languageConstants/1004',
      'Japanese': 'languageConstants/1010',
      'Kannada': 'languageConstants/1036',
      'Kazakh': 'languageConstants/1037',
      'Khmer': 'languageConstants/1038',
      'Korean': 'languageConstants/1018',
      'Kurdish': 'languageConstants/1039',
      'Kyrgyz': 'languageConstants/1040',
      'Lao': 'languageConstants/1041',
      'Latvian': 'languageConstants/1042',
      'Lithuanian': 'languageConstants/1043',
      'Macedonian': 'languageConstants/1044',
      'Malay': 'languageConstants/1045',
      'Malayalam': 'languageConstants/1046',
      'Maltese': 'languageConstants/1047',
      'Maori': 'languageConstants/1048',
      'Marathi': 'languageConstants/1049',
      'Mongolian': 'languageConstants/1050',
      'Nepali': 'languageConstants/1051',
      'Norwegian': 'languageConstants/1019',
      'Persian': 'languageConstants/1052',
      'Polish': 'languageConstants/1010',
      'Portuguese': 'languageConstants/1014',
      'Punjabi': 'languageConstants/1053',
      'Romanian': 'languageConstants/1012',
      'Russian': 'languageConstants/1017',
      'Serbian': 'languageConstants/1054',
      'Slovak': 'languageConstants/1003',
      'Slovenian': 'languageConstants/1055',
      'Spanish': 'languageConstants/1003',
      'Swahili': 'languageConstants/1056',
      'Swedish': 'languageConstants/1009',
      'Tamil': 'languageConstants/1057',
      'Telugu': 'languageConstants/1058',
      'Thai': 'languageConstants/1059',
      'Turkish': 'languageConstants/1010',
      'Ukrainian': 'languageConstants/1060',
      'Urdu': 'languageConstants/1061',
      'Uzbek': 'languageConstants/1062',
      'Vietnamese': 'languageConstants/1063',
      'Welsh': 'languageConstants/1064',
      'Zulu': 'languageConstants/1065',
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

  private async addGeoTargeting(campaignResourceName: string): Promise<void> {
    console.log('Adding geo-targeting to campaign:', campaignResourceName);

    // Static list of country location IDs
    const countryLocationIds = ['1010543', '2484', '2036']; // Netherlands, Canada, Australia

    // Prepare the campaign criteria
    const campaignCriteria = countryLocationIds.map((locationId) => ({
      campaign: campaignResourceName,
      type: enums.CriterionType.LOCATION,
      location: { geo_target_constant: ResourceNames.geoTargetConstant(locationId) }, // Ensure location is an object
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
}


