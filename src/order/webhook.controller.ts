import Stripe from 'stripe';
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
import { WalletService } from '../wallet/wallet.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
    private readonly stripeService: StripeService,
    private readonly walletService: WalletService,
  ) {}
  @Post()
  async handleWebhook(
    @Req() req,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req['body'].toString();
    try {
      const event = this.stripeService.verifyWebhookSignature(
        rawBody,
        signature,
      );
      console.log('Webhook received:', event);

      this.logger.log(`Received Stripe event: ${event.type}`);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(paymentIntent);
        console.log(paymentIntent.customer);
        this.walletService.updateWalletAmountByUserStripeId(
          paymentIntent.metadata.customer,
          paymentIntent.amount,
        );

        this.logger.log(
          `Order ${paymentIntent.metadata.orderId} approved successfully.`,
        );
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // const updatedOrder = this.orderService.updateOrderStatus(
        //   paymentIntent.metadata.orderId,
        //   'rejected',
        // );

        // await this.orderService.refundOrder(updatedOrder.id);

        this.orderGateway.notifyOrderStatus(
          paymentIntent.metadata.orderId,
          'rejected',
        );
        //  this.stripeService.refundPayment(paymentIntent.id, updatedOrder.amount);

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
  //   @Post('ad-status')
  //   async handleAdStatusUpdate(
  //     @Body()
  //     body: {
  //       platform: string;
  //       orderId: string;
  //       status: 'approved' | 'rejected';
  //     },
  //   ) {
  //     const { platform, orderId, status } = body;

  //     const order = this.orderService.updateOrderStatus(orderId, status);

  //     if (status === 'rejected') {
  //       const userId = order.userId;
  //       const amount = order.amount;
  //       this.orderService.updateUserBalance(userId, amount, 'refund');
  //       // this.stripeService.refundPayment(paymentIntentId, amount);
  //       // this.orderService.refundOrder(orderId);
  //       // this.orderService.refundUser(order.paymentIntent, amount);
  //     }

  //     this.orderGateway.notifyOrderStatus(orderId, status);

  //     return {
  //       success: true,
  //       message: `Order for platform ${platform} updated to ${status}`,
  //     };
  //   }
  //   @Post('strip')
  //   async handleStripeWebhook(@Req() req, @Res() res) {
  //     const sig = req.headers['stripe-signature'];
  //     try {
  //       const event = this.stripeService.constructEvent(req.rawBody, sig);
  //       this.logger.log(`Received Stripe event: ${event.type}`);
  //       console.log('signature', sig);
  //       console.log('event', event.type);

  //       this.logger.log(`Received Stripe event: ${event.type}`);

  //       // if (event.type === 'payment_intent.succeeded') {
  //       //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
  //       //   this.orderService.updateOrderStatus(
  //       //     paymentIntent.metadata.orderId,
  //       //     'approved',
  //       //   );

  //       //   this.orderGateway.notifyOrderStatus(
  //       //     paymentIntent.metadata.orderId,
  //       //     'approved',
  //       //   );
  //       //   this.logger.log(
  //       //     `Order ${paymentIntent.metadata.orderId} approved successfully.`,
  //       //   );
  //       // }

  //       // if (event.type === 'payment_intent.payment_failed') {
  //       //   const paymentIntent = event.data.object as Stripe.PaymentIntent;
  //       //   const updatedOrder = this.orderService.updateOrderStatus(
  //       //     paymentIntent.metadata.orderId,
  //       //     'rejected',
  //       //   );

  //       //   await this.orderService.refundOrder(updatedOrder.id);

  //       //   this.orderGateway.notifyOrderStatus(
  //       //     paymentIntent.metadata.orderId,
  //       //     'rejected',
  //       //   );
  //       //   // this.stripeService.refundPayment(paymentIntent.id, updatedOrder.amount);

  //       //   this.logger.warn(
  //       //     `Order ${paymentIntent.metadata.orderId} rejected and refunded.`,
  //       //   );
  //       // }

  //       // return { received: true };
  //     } catch (err) {
  //       console.error('Error processing webhook event', err);
  //       return { error: 'Webhook error' };
  //     }
  //   }
  // }

  // Webhook received: {
  //   id: 'evt_3QcSaKFfxkp1DJee1NhTAQkG',
  //   object: 'event',
  //   api_version: '2024-10-28.acacia',
  //   created: 1735740469,
  //   data: {
  //     object: {
  //       id: 'ch_3QcSaKFfxkp1DJee1YZ4APA2',
  //       object: 'charge',
  //       amount: 500000,
  //       amount_captured: 500000,
  //       amount_refunded: 0,
  //       application: null,
  //       application_fee: null,
  //       application_fee_amount: null,
  //       balance_transaction: 'txn_3QcSaKFfxkp1DJee158S1pLy',
  //       billing_details: [Object],
  //       calculated_statement_descriptor: 'Stripe',
  //       captured: true,
  //       created: 1735740466,
  //       currency: 'usd',
  //       customer: null,
  //       description: null,
  //       destination: null,
  //       dispute: null,
  //       disputed: false,
  //       failure_balance_transaction: null,
  //       failure_code: null,
  //       failure_message: null,
  //       fraud_details: {},
  //       invoice: null,
  //       livemode: false,
  //       metadata: [Object],
  //       on_behalf_of: null,
  //       order: null,
  //       outcome: [Object],
  //       paid: true,
  //       payment_intent: 'pi_3QcSaKFfxkp1DJee1toFvjmd',
  //       payment_method: 'pm_1QcSaMFfxkp1DJeepW1j0ZcN',
  //       payment_method_details: [Object],
  //       radar_options: {},
  //       receipt_email: null,
  //       receipt_number: null,
  //       receipt_url: 'https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUU1HNnFGZnhrcDFESmVlKLWY1bsGMgbh54y79ew6LBYrhcc1B5jfzoRRE6kXCd4JiIWRc_J_qDcbNssjCD03MxnIke63PVxkywqe',
  //       refunded: false,
  //       review: null,
  //       shipping: null,
  //       source: null,
  //       source_transfer: null,
  //       statement_descriptor: null,
  //       statement_descriptor_suffix: null,
  //       status: 'succeeded',
  //       transfer_data: null,
  //       transfer_group: null
  //     },
  //     previous_attributes: {
  //       balance_transaction: null,
  //       receipt_url: 'https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUU1HNnFGZnhrcDFESmVlKLWY1bsGMgYx5McaFm86LBZw2S4VxTcqtGlmWt-i6jF-ojYq0XZSN2rBAlzAQXC835nAlHlxcYoFhnZc'
  //     }
  //   },
  //   livemode: false,
  //   pending_webhooks: 2,
  //   request: { id: null, idempotency_key: null },
  //   type: 'charge.updated'
  //
}
