import { Module } from '@nestjs/common';
import { YouTubeCampaignController } from './youtube-campaign.controller';
import { YouTubeCampaignService } from './youtube-campaign.service';
import { GoogleCampaignModule } from '../google-campaign/google-campaign.module';

@Module({
  imports: [GoogleCampaignModule],
  controllers: [YouTubeCampaignController],
  providers: [YouTubeCampaignService],
})
export class YouTubeCampaignModule {}
