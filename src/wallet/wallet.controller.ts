import { Controller, Get, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TransactionService } from '../transaction/transaction.service';

@Controller('user/wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
  ) {}

  @Get()
  async getWallet(@Req() req: any) {
    const wallet = await this.walletService.getWalletByUserId(req.user.id);
    const transactions =
      await this.transactionService.getTransactionsByWalletId(wallet._id);
    return {
      ...wallet._doc,
      transactions,
    };
  }
}
