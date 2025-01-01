/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TiktokCampaignController } from './tiktok-campaign.controller';
import { TiktokCampaignService } from './tiktok-campaign.service';
import { HttpModule } from '@nestjs/axios';
import { OrderModule } from '../order/order.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../order/order.schema';
import { StripeModule } from '../stripe/stripe.module';
import { TransactionModule } from '../transaction/transaction.module';
import { Transaction, TransactionSchema } from '../transaction/transaction.schema';
import { WalletModule } from '../wallet/wallet.module';
import { Wallet, WalletSchema } from '../wallet/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    StripeModule,
    TransactionModule,
    WalletModule,
    OrderModule,
    HttpModule,
  ],
  controllers: [TiktokCampaignController],
  providers: [TiktokCampaignService],
})
export class TiktokCampaignModule { }
