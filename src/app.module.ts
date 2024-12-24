import { YouTubeCampaignModule } from './youtupe-campaign/youtube-campaing.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';
import { TiktokCampaignModule } from './tiktok-campaign/tiktok-campaign.module';
import { FacebookCampaignModule } from './facebook-campaign/facebook-campaign.module';

@Module({
  imports: [
    GoogleCampaignModule,
    TiktokCampaignModule,
    YouTubeCampaignModule,
    FacebookCampaignModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
