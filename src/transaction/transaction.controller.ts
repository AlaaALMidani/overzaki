/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async createTransaction(@Body() body: { userId: string; walletId: string; type: string; amount: number }) {
    return this.transactionService.createTransaction(
      body.userId,
      body.walletId,
      body.type,
      body.amount,
    );
  }

  @Get(':walletId')
  async getTransactions(@Param('walletId') walletId: string) {
    return this.transactionService.getTransactionsByWalletId(walletId);
  }
}
