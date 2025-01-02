/* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   BadRequestException,
//   HttpException,
//   HttpStatus,
//   Injectable,
// } from '@nestjs/common';
// import * as fs from 'fs';
// import * as path from 'path';
// import { Order } from './order.interface';
// @Injectable()
// export class OrderService {
//   private readonly filePath = path.join(process.cwd(), 'data', 'data.json');
//   private data = this.readData();
//   private readData() {
//     const rawData = fs.readFileSync(this.filePath, 'utf8');
//     return JSON.parse(rawData);
//   }
//   private writeData(data: any) {
//     fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
//   }

//   createOrder(userId: string, serviceName: string, amount: number): Order {
//     const user = this.data.users.find((user: any) => user.id === userId);
//     if (!user || user.walletBalance < amount) {
//       throw new HttpException(
//         'Insufficient balance',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }

//     const newOrder: Order = {
//       id: (this.data.orders.length + 1).toString(),
//       userId,
//       serviceName,
//       amount,
//       status: 'pending',
//       createdAt: new Date(),
//     };

//     this.data.orders.push(newOrder);
//     this.writeData(this.data);

//     return newOrder;
//   }
//   getOrderById(orderId: string) {
//     return this.data.orders.find((order: Order) => order.id === orderId);
//   }
//   updateOrderStatus(orderId: string, status: 'approved' | 'rejected'): Order {
//     const order = this.getOrderById(orderId);

//     if (!order) {
//       throw new Error('Order not found');
//     }
//     if (order.status !== 'pending') {
//       throw new HttpException(
//         `Order is already processed`,
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//     console.log(order.status);
//     order.status = status;
//     order.updatedAt = new Date().toISOString();
//     this.writeData(this.data);

//     return order;
//   }
//   updateUserBalance(userId: string, amount: number, type: string) {
//     const user = this.data.users.find((user: any) => user.id === userId);
//     console.log('user', user);
//     if (!user) {
//       throw new BadRequestException('User not found');
//     }

//     if (type === 'refund') {
//       user.walletBalance += amount;
//     } else {
//       user.walletBalance += type === 'deposit' ? amount : -amount;
//     }
//     if (!this.data.transactions) {
//       this.data.transactions = [];
//     }
//     this.data.transactions.push({
//       userId,
//       amount,
//       type,
//       timestamp: new Date().toISOString(),
//     });

//     this.writeData(this.data);

//     return user.walletBalance;
//   }
//   refundOrder(orderId: string) {
//     const order = this.data.orders.find((order: any) => order.id === orderId);

//     if (!order) {
//       throw new Error('Order not found');
//     }

//     order.status = 'refunded';
//     this.data.orders.push(order);
//     this.writeData(this.data);

//     return order;
//   }
// }

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './order.schema';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly transactionService: TransactionService, // Inject the TransactionService
    private readonly walletService: WalletService,
  ) { }

  async createOrder(
    userId: string,
    serviceName: string,
    details: any,
  ): Promise<Order> {
    const order = new this.orderModel({
      userId,
      serviceName,
      status: 'pending',
      details,
    });
    return order.save();
  }

  async updateOrderStatus(orderId: string, status: 'pending' | 'done' | 'onProgress'): Promise<Order> {
    const order = await this.orderModel.findOneAndUpdate(
      { orderId },
      { status },
      { new: true },
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).exec();
  }
  async checkPayAbility(userId: string, amount: number, minAmount: number) {
    if (amount < minAmount) {
      throw new BadRequestException('Ad budget should be greater than or equal to ' + minAmount)
    }
    const wallet = await this.walletService.getWalletByUserId(userId);
    console.log('from checkPayAbility:',wallet)
    console.log('from checkPayAbility:amount',amount)
    console.log('from checkPayAbility:wallet.amount',wallet.amount)
    if (wallet.amount < amount) {
      throw new BadRequestException('There is no enough balance in your wallet, recharge it and try again.');
    }
  }
  async createOrderWithTransaction(
    userId: string,
    walletId: string,
    serviceName: string,
    amount: number,
    details: any,
  ): Promise<any> {

    const order = await this.createOrder(userId, serviceName, details);
    const transaction = await this.transactionService.createTransaction(
      userId,
      walletId,
      order._id,
      'pay',
      amount,
    );
    await this.walletService.updateWalletAmount(userId, -1 * amount)
    return {
      ...order._doc, transactions: [transaction]
    }
  }

}
