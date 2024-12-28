import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet } from './wallet.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
  ) {}

  async createWallet(userId: string): Promise<Wallet> {
    const wallet = new this.walletModel({ userId, amount: 0 });
    return wallet.save();
  }

  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async updateWalletAmount(userId: string, amount: number): Promise<Wallet> {
    const wallet = await this.walletModel.findOneAndUpdate(
      { userId },
      { $inc: { amount } },
      { new: true },
    );
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }
}