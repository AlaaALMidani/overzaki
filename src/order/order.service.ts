import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

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

  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'done' | 'onProgress',
  ): Promise<Order> {
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
    const orders = await this.orderModel.find({ userId }).exec();
    const newOrders = [];
    for (let i = 0; i < orders.length; i++) {
      newOrders.push({ ...orders[i], details: orders[i].details.base });
    }
    return newOrders;
  }
  async checkPayAbility(userId: string, amount: number, minAmount: number) {
    if (amount < minAmount) {
      throw new BadRequestException(
        'Ad budget should be greater than or equal to ' + minAmount,
      );
    }
    const wallet = await this.walletService.getWalletByUserId(userId);
    console.log('from checkPayAbility:', wallet);
    console.log('from checkPayAbility:amount', amount);
    console.log('from checkPayAbility:wallet.amount', wallet.amount);
    if (wallet.amount < amount) {
      throw new BadRequestException(
        'There is no enough balance in your wallet, recharge it and try again.',
      );
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
    await this.walletService.updateWalletAmount(userId, -1 * amount);
    return {
      ...order._doc,
      transactions: [transaction],
    };
  }
}
