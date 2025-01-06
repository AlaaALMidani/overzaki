import { Module } from '@nestjs/common';
import { GoogleCampaignController } from './google-campaign.controller';
import { GoogleCampaignService } from './google-campaign.service';

@Module({
  controllers: [GoogleCampaignController],
  providers: [GoogleCampaignService],
})
export class GoogleCampaignModule {}
