/* eslint-disable @typescript-eslint/no-unused-vars */
import { StripeService } from './../stripe/stripe.service';
import { OrderService } from './order.service';

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';

@Controller('order')

// OrderService
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('create')
  async createOrder(
    @Body()
    body: {
      userId: string;
      serviceName: string;
      amount: number;
    },
  ) {
    const { userId, serviceName, amount } = body;

    // const paymentIntent = await this.stripeService.createPaymentIntent(
    //   amount,
    //   'usd',
    //   { userId: userId.toString() },
    // );
    const newOrder = this.orderService.createOrder(userId, serviceName, amount);
    if (newOrder) {
      this.orderService.updateUserBalance(userId, amount, 'purchase');

      // return { order: newOrder, clientSecret: paymentIntent.client_secret };
      return { order: newOrder };
    }
  }
  @Post('deposit')
  async deposit(@Body() body: { userId: string; amount: number }) {
    const { userId, amount } = body;
    console.log('body', body);
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      { userId: userId.toString() },
    );

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      balance: await this.orderService.updateUserBalance(
        userId,
        +amount,
        'deposit',
        paymentIntent.id,
      ),
    };
  }
  @Post('update-status')
  async updateOrderStatus(
    @Body() body: { orderId: string; status: 'approved' | 'rejected' },
  ) {
    const { orderId, status } = body;
    try {
      const order = this.orderService.getOrderById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.status !== 'pending') {
        return {
          success: false,
          message: 'Order is already processed',
        };
      }

      order.status = status;
      return order;
    } catch (err) {
      throw new HttpException(
        err.message || 'Failed to update order',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Post('service-response')
  async handleServiceResponse(
    @Body() body: { orderId: string; status: 'approved' | 'rejected' },
  ) {
    const { orderId, status } = body;

    const updatedOrder = this.orderService.updateOrderStatus(orderId, status);

    if (status === 'rejected') {
      await this.orderService.refundOrder(orderId);
    }

    return {
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder,
    };
  }
}
