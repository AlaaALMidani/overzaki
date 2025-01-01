import { OrderGateway } from './order.gateway';
import { StripeModule } from './../stripe/stripe.module';
import { Module } from '@nestjs/common';
// import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WebhookController } from './webhook.controller';
import { TransactionModule } from '../transaction/transaction.module';
import { WalletModule } from '../wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { Order, OrderSchema } from './order.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transaction/transaction.schema';
import { Wallet, WalletSchema } from '../wallet/wallet.schema';
import { OrderController } from './order.controller';

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
  ],
  controllers: [WebhookController, OrderController],
  providers: [OrderService, OrderGateway],
  exports: [OrderService],
})
export class OrderModule {}
