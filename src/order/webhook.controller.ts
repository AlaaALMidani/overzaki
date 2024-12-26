import { StripeService } from '../stripe/stripe.service';
import { OrderGateway } from './order.gateway';
import { OrderService } from './order.service';
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Logger,
  Res,
} from '@nestjs/common';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
    private readonly stripeService: StripeService,
  ) {}
  @Post()
  async handleWebhook(
    @Req() req,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('Webhook Received!');
    console.log('stripeSignature:', signature);
    console.log(
      this.stripeService.verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
      ),
    );
    // const rawBody =
    //   req.body instanceof Buffer
    //     ? req.body.toString('utf-8')
    //     : JSON.stringify(req.body);
    // console.log('Raw Body:', rawBody);
    // const isValid = this.stripeService.verifyWebhookSignature(
    //   rawBody,
    //   signature,
    // );
    // if (!isValid) {
    //   return { error: 'Webhook signature verification failed' };
    // }
    try {
      // const event = JSON.parse(rawBody);
      // console.log('Event Received:', event);

      // const payload = req.rawBody;
      // console.log('payload', payload);
      // const event = this.stripeService.constructEvent(payload, stripeSignature);
      // this.logger.log(`Received Stripe event: ${event.type}`);
      // console.log('event', event.type);

      // this.logger.log(`Received Stripe event: ${event.type}`);

      // if (event.type === 'payment_intent.succeeded') {
      //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
      //   this.orderService.updateOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'approved',
      //   );

      //   this.orderGateway.notifyOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'approved',
      //   );
      //   this.logger.log(
      //     `Order ${paymentIntent.metadata.orderId} approved successfully.`,
      //   );
      // }

      // if (event.type === 'payment_intent.payment_failed') {
      //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
      //   const updatedOrder = this.orderService.updateOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'rejected',
      //   );

      //   await this.orderService.refundOrder(updatedOrder.id);

      //   this.orderGateway.notifyOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'rejected',
      //   );
      //   // this.stripeService.refundPayment(paymentIntent.id, updatedOrder.amount);

      //   this.logger.warn(
      //     `Order ${paymentIntent.metadata.orderId} rejected and refunded.`,
      //   );
      // }

      return { received: true };
    } catch (err) {
      console.error('Error processing webhook event', err);
      return { error: 'Webhook error' };
    }
  }
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
  @Post('strip')
  async handleStripeWebhook(@Req() req, @Res() res) {
    const sig = req.headers['stripe-signature'];
    try {
      const event = this.stripeService.constructEvent(req.rawBody, sig);
      this.logger.log(`Received Stripe event: ${event.type}`);
      console.log('signature', sig);
      console.log('event', event.type);

      this.logger.log(`Received Stripe event: ${event.type}`);

      // if (event.type === 'payment_intent.succeeded') {
      //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
      //   this.orderService.updateOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'approved',
      //   );

      //   this.orderGateway.notifyOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'approved',
      //   );
      //   this.logger.log(
      //     `Order ${paymentIntent.metadata.orderId} approved successfully.`,
      //   );
      // }

      // if (event.type === 'payment_intent.payment_failed') {
      //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
      //   const updatedOrder = this.orderService.updateOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'rejected',
      //   );

      //   await this.orderService.refundOrder(updatedOrder.id);

      //   this.orderGateway.notifyOrderStatus(
      //     paymentIntent.metadata.orderId,
      //     'rejected',
      //   );
      //   // this.stripeService.refundPayment(paymentIntent.id, updatedOrder.amount);

      //   this.logger.warn(
      //     `Order ${paymentIntent.metadata.orderId} rejected and refunded.`,
      //   );
      // }

      // return { received: true };
    } catch (err) {
      console.error('Error processing webhook event', err);
      return { error: 'Webhook error' };
    }
  }
}
