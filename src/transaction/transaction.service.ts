import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './transaction.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async createTransaction(
    userId: string,
    walletId: string,
    type: string,
    amount: number,
  ): Promise<Transaction> {
    const transaction = new this.transactionModel({
      userId,
      walletId,
      type,
      amount,
    });
    return transaction.save();
  }

  async getTransactionsByWalletId(walletId: string): Promise<Transaction[]> {
    return this.transactionModel.find({ walletId }).exec();
  }
}
