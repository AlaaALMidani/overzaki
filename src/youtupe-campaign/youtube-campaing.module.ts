import { Module } from '@nestjs/common';
import { YouTubeCampaignController } from './youtube-campaign.controller';
import { YouTubeCampaignService } from './youtube-campaign.service';

@Module({
  controllers: [YouTubeCampaignController],
  providers: [YouTubeCampaignService],
})
export class YouTubeCampaignModule {}
