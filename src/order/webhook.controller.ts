/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderGateway } from './order.gateway';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './../stripe/stripe.service';
import Stripe from 'stripe';
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
  ) {}
  @Post('ad-status')
  async handleAdStatusUpdate(
    @Body()
    body: {
      platform: string;
      orderId: string;
      status: 'approved' | 'rejected';
    },
  ) {
    const { platform, orderId, status } = body;

    const order = this.orderService.updateOrderStatus(orderId, status);

    if (status === 'rejected') {
      const userId = order.userId;
      const amount = order.amount;
      this.orderService.updateUserBalance(userId, amount, 'refund');
      // this.stripeService.refundPayment(paymentIntentId, amount);
      // this.orderService.refundOrder(orderId);
      // this.orderService.refundUser(order.paymentIntent, amount);
    }

    this.orderGateway.notifyOrderStatus(orderId, status);

    return {
      success: true,
      message: `Order for platform ${platform} updated to ${status}`,
    };
  }
  @Post()
  async handleStripeWebhook(
    @Body() eventBody: any,
    @Headers('Stripe-Signature') signature: string,
  ) {
    const endpointSecret = this.configService.get<string>(
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    let event: Stripe.Event;

    try {
      event = this.stripeService.constructEvent(
        eventBody,
        signature,
        endpointSecret,
      );
      this.logger.log(`Received Stripe event: ${event.type}`);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.orderService.updateOrderStatus(
          paymentIntent.metadata.orderId,
          'approved',
        );

        this.orderGateway.notifyOrderStatus(
          paymentIntent.metadata.orderId,
          'approved',
        );
        this.logger.log(
          `Order ${paymentIntent.metadata.orderId} approved successfully.`,
        );
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const updatedOrder = this.orderService.updateOrderStatus(
          paymentIntent.metadata.orderId,
          'rejected',
        );

        await this.orderService.refundOrder(updatedOrder.id);

        this.orderGateway.notifyOrderStatus(
          paymentIntent.metadata.orderId,
          'rejected',
        );
        // this.stripeService.refundPayment(paymentIntent.id, updatedOrder.amount);

        this.logger.warn(
          `Order ${paymentIntent.metadata.orderId} rejected and refunded.`,
        );
      }

      return { received: true };
    } catch (err) {
      console.error('Error processing webhook event', err);
      return { error: 'Webhook error' };
    }
  }
}
