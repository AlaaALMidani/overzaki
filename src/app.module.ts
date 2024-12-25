import { YouTubeCampaignModule } from './youtupe-campaign/youtube-campaing.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';
import { TiktokCampaignModule } from './tiktok-campaign/tiktok-campaign.module';
import { FacebookCampaignModule } from './facebook-campaign/facebook-campaign.module';
import { UserModule } from './user/user.module';
import { StripeController } from './stripe/stripe.controller';
import { StripeService } from './stripe/stripe.service';
import { StripeModule } from './stripe/stripe.module';
import { OrderModule } from './order/order.module';
import { UserService } from './user/user.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    GoogleCampaignModule,
    TiktokCampaignModule,
    YouTubeCampaignModule,
    FacebookCampaignModule,
    UserModule,
    StripeModule,
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, StripeController],
  providers: [AppService, StripeService, UserService],
})
export class AppModule {}
