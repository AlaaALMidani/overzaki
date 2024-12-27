import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleCampaignModule } from './google-campaign/google-campaign.module';
import { TiktokCampaignModule } from './tiktok-campaign/tiktok-campaign.module';
import { FacebookCampaignModule } from './facebook-campaign/facebook-campaign.module';
import { YouTubeCampaignModule } from './youtupe-campaign/youtube-campaing.module';
import { StripeModule } from './stripe/stripe.module';
// import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    GoogleCampaignModule,
    TiktokCampaignModule,
    YouTubeCampaignModule,
    FacebookCampaignModule,
    StripeModule,
    AuthModule,
    // OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {
    mongoose.connection.on('connected', () => {
      console.log('✅ Successfully connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB connection disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
  }
}
