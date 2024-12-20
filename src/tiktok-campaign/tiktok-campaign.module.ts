import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TiktokCampaignController } from './tiktok-campaign.controller';
import { TiktokCampaignService } from './tiktok-campaign.service';
import { VideoValidationMiddleware } from './tiktok-campaign.middleware';
@Module({
  controllers: [TiktokCampaignController],
  providers: [TiktokCampaignService],
})
export class TiktokCampaignModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(VideoValidationMiddleware).forRoutes('tiktok-campaign/create-campaign');
  }
}