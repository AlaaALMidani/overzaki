import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from './order.interface';
@Injectable()
export class OrderService {
  // private readonly filePath = path.join(process.cwd(), 'data', 'data.json');
  // private data = this.readData();
  // private readData() {
  //   const rawData = fs.readFileSync(this.filePath, 'utf8');
  //   return JSON.parse(rawData);
  // }
  // private writeData(data: any) {
  //   fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  // }

  createOrder(userId: string, serviceName: string, amount: number): Order {
    const user = this.data.users.find((user: any) => user.id === userId);
    if (!user || user.walletBalance < amount) {
      throw new HttpException(
        'Insufficient balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const newOrder: Order = {
      id: (this.data.orders.length + 1).toString(),
      userId,
      serviceName,
      amount,
      status: 'pending',
      createdAt: new Date(),
    };

    this.data.orders.push(newOrder);
    this.writeData(this.data);

    return newOrder;
  }
  getOrderById(orderId: string) {
    return this.data.orders.find((order: Order) => order.id === orderId);
  }
  updateOrderStatus(orderId: string, status: 'approved' | 'rejected'): Order {
    const order = this.getOrderById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }
    if (order.status !== 'pending') {
      throw new HttpException(
        `Order is already processed`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    console.log(order.status);
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.writeData(this.data);

    return order;
  }
  updateUserBalance(
    userId: string,
    amount: number,
    type: string,
    paymentId: string,
  ) {
    const user = this.data.users.find((user: any) => user.id === userId);
    console.log('user', user);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (type === 'refund') {
      user.walletBalance += amount;
    } else {
      user.walletBalance += type === 'deposit' ? amount : -amount;
    }
    if (!this.data.transactions) {
      this.data.transactions = [];
    }
    this.data.transactions.push({
      userId,
      amount,
      type,
      timestamp: new Date().toISOString(),
    });

    this.writeData(this.data);

    return user.walletBalance;
  }
  refundOrder(orderId: string) {
    const order = this.data.orders.find((order: any) => order.id === orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    order.status = 'refunded';
    this.data.orders.push(order);
    this.writeData(this.data);

    return order;
  }
}
