import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';
import { TiktokCampaignModule } from './tiktok-campaign/tiktok-campaign.module';
import { YouTubeCampaignModule } from './youtupe-campaign/youtube-campaing.module';
@Module({
  imports: [GoogleCampaignModule, TiktokCampaignModule, YouTubeCampaignModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
