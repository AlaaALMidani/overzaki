/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { FacebookCampaignService } from './facebook-campaign.service';
import { FacebookController } from './facebook-campaign.controller';

@Module({
  imports: [
    HttpModule, 
    PassportModule.register({ defaultStrategy: 'facebook' }),
  ],
  controllers: [FacebookController],
  providers: [FacebookCampaignService],
})
export class FacebookCampaignModule {}
