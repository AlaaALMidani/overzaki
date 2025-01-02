/* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { StripeService } from './../stripe/stripe.service';
// import { OrderService } from './order.service';

// import {
//   Body,
//   Controller,
//   HttpException,
//   HttpStatus,
//   NotFoundException,
//   Post,
// } from '@nestjs/common';

// @Controller('order')

// // OrderService
// export class OrderController {
//   constructor(
//     private readonly orderService: OrderService,
//     private readonly stripeService: StripeService,
//   ) {}

//   @Post('create')
//   async createOrder(
//     @Body()
//     body: {
//       userId: string;
//       serviceName: string;
//       amount: number;
//     },
//   ) {
//     const { userId, serviceName, amount } = body;

//     // const paymentIntent = await this.stripeService.createPaymentIntent(
//     //   amount,
//     //   'usd',
//     //   { userId: userId.toString() },
//     // );
//     const newOrder = this.orderService.createOrder(userId, serviceName, amount);
//     if (newOrder) {
//       this.orderService.updateUserBalance(userId, amount, 'purchase');

//       // return { order: newOrder, clientSecret: paymentIntent.client_secret };
//       return { order: newOrder };
//     }
//   }

//   @Post('update-status')
//   async updateOrderStatus(
//     @Body() body: { orderId: string; status: 'approved' | 'rejected' },
//   ) {
//     const { orderId, status } = body;
//     try {
//       const order = this.orderService.getOrderById(orderId);
//       if (!order) {
//         throw new NotFoundException('Order not found');
//       }
//       if (order.status !== 'pending') {
//         return {
//           success: false,
//           message: 'Order is already processed',
//         };
//       }

//       order.status = status;
//       return order;
//     } catch (err) {
//       throw new HttpException(
//         err.message || 'Failed to update order',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
//   @Post('service-response')
//   async handleServiceResponse(
//     @Body() body: { orderId: string; status: 'approved' | 'rejected' },
//   ) {
//     const { orderId, status } = body;

//     const updatedOrder = this.orderService.updateOrderStatus(orderId, status);

//     if (status === 'rejected') {
//       await this.orderService.refundOrder(orderId);
//     }

//     return {
//       success: true,
//       message: `Order status updated to ${status}`,
//       order: updatedOrder,
//     };
//   }
// }

// src/order/order.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { Order } from './order.schema';
import { StripeService } from '../stripe/stripe.service';

@Controller('user/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Create a new order along with a transaction.
   */
  @Post('')
  async createOrder(@Body() body: any): Promise<Order> {
    const { userId, serviceName, walletId, amount, details } = body;
    return this.orderService.createOrderWithTransaction(
      userId,
      walletId,
      serviceName,
      amount,
      details,
    );
  }

  /**
   * Get an order by its ID.
   */
  @Get(':orderId')
  async getOrderById(@Param('orderId') orderId: string): Promise<Order> {
    return this.orderService.getOrderById(orderId);
  }

  /**
   * Get all orders for a specific user.
   */
  @Get('user/:userId')
  async getOrdersByUserId(@Param('userId') userId: string): Promise<Order[]> {
    return this.orderService.getOrdersByUserId(userId);
  }

  /**
   * Get all orders for the authenticated user.
   */
  @Get()
  async getAllOrdersForUser(@Req() req: any): Promise<any> {
    const userId = req.user['id'];
    return this.orderService.getOrdersByUserId(userId);
  }

  /**
   * Update the status of an existing order.
   */
  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: any,
  ): Promise<Order> {
    const { status } = body;
    return this.orderService.updateOrderStatus(orderId, status);
  }

  @Post('deposit')
  async deposit(@Body() body: { amount: number }, @Req() req: any) {
    const { amount } = body;
    console.log('body', body);
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'usd',
      req.user.stripeId,
    );

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
    };
  }
}
