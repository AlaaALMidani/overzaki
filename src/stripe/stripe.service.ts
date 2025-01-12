/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  static refunds: any;
  constructor() {
    this.stripe = new Stripe(process.env.STRIP_SECRET_KEY, {
      apiVersion: null,
    });
  }
  // استرداد معلومات PaymentIntent من Stripe
  //  const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
  async createPaymentIntent(
    amount: number,
    currency: string,
    customer: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    if (!amount || !currency) {
      throw new Error(
        'Amount and currency are required to create a PaymentIntent',
      );
    }
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100,
        currency,
        customer,
        payment_method_types: ['card'],
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating PaymentIntent:', error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    return await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? amount : undefined,
    });
  }
  public constructEvent(payload: any, signature: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret,
    );
  }
  public verifyWebhookSignature(rawBody: Buffer, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
      return event;
    } catch (err) {
      console.error('Webhook Signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }
  }
  public async createCustomer(userEmail: string) {
    const customer = await this.stripe.customers.create({
      email: userEmail,
    });

    console.log('Customer Created:', customer.id);
    return customer.id;
  }
}
