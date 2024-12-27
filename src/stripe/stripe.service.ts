import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  static refunds: any;
  constructEvent: any;
  constructor() {
    this.stripe = new Stripe(process.env.STRIP_SECRET_KEY, {
      apiVersion: null,
      maxNetworkRetries: 5,
    });
  }
  // استرداد معلومات PaymentIntent من Stripe
  //  const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: any,
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
        metadata,
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
      amount: amount ? amount * 100 : undefined,
    });
  }
}

// async function createCustomer(userEmail) {
//   const customer = await stripe.customers.create({
//     email: userEmail, 
//   });

//   console.log('Customer Created:', customer.id);
//   return customer.id; 
// }


// createCustomer('user@example.com');