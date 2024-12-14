import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';

@Module({
  imports: [GoogleCampaignModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
