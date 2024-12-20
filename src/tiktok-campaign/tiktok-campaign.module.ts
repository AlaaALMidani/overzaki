import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TiktokCampaignController } from './tiktok-campaign.controller';
import { TiktokCampaignService } from './tiktok-campaign.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [TiktokCampaignController],
  providers: [TiktokCampaignService],
})
export class TiktokCampaignModule {
}