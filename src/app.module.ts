import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';

@Module({
  imports: [],
  controllers: [AppController, GoogleCampaignModule],
  providers: [AppService],
})
export class AppModule {}
