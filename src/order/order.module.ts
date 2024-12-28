import { OrderGateway } from './order.gateway';
import { StripeModule } from './../stripe/stripe.module';
import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WebhookController } from './webhook.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [StripeModule, ConfigModule.forRoot()],
  controllers: [OrderController, WebhookController],
  providers: [OrderService, OrderGateway],
})
export class OrderModule {}
