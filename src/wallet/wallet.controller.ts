import { Controller, Get, Param, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post(':userId')
  async createWallet(@Param('userId') userId: string) {
    return this.walletService.createWallet(userId);
  }

  @Get(':userId')
  async getWallet(@Param('userId') userId: string) {
    return this.walletService.getWalletByUserId(userId);
  }
}
