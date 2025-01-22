import { Module } from '@nestjs/common';
import { GoogleCampaignController } from './google-campaign.controller';
import { GoogleCampaignService } from './google-campaign.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [GoogleCampaignController],
  providers: [GoogleCampaignService],
  exports: [GoogleCampaignService],
})
export class GoogleCampaignModule {}
