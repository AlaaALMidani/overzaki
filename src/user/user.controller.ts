import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { StripeService } from '../stripe/stripe.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly stripeService: StripeService,
  ) {}
  @Get('balance/:userId')
  getBalance(@Param('userId') userId: string) {
    if (!userId) {
      return { error: 'User ID is required' };
    }

    const balance = this.userService.getBalance(userId);

    if (balance === null) {
      return { error: `User with ID ${userId} not found` };
    }

    return { userId, balance };
  }
  @Post('deposit')
  async deposit(@Body() body: { userId: string; amount: number }) {
    const { userId, amount } = body;
    console.log('body', body);
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount * 100,
      'usd',
      { userId },
    );
    console.log('paymentIntent', paymentIntent);
    const balance = await this.userService.updateUserBalance(
      userId,
      amount,
      'deposit',
    );

    return { success: true, balance, paymentIntent };
  }

  // @Post('purchase')
  // purchase(@Body() body: { userId: string; amount: number }) {
  //   const { userId, amount } = body;
  //   const balance = this.userService.updateUserBalance(
  //     userId,
  //     amount,
  //     'withdraw',
  //   );
  //   return { success: true, balance };
  // }

  // @Post('refund')
  // async refund(
  //   @Body() body: { userId: string; amount: number; paymentIntentId?: string },
  // ) {
  //   const { userId, amount, paymentIntentId } = body;
  //   if (paymentIntentId) {
  //     await this.stripeService.refundPayment(paymentIntentId, amount);
  //   }
  //   const balance = this.userService.updateUserBalance(
  //     userId,
  //     amount,
  //     'refund',
  //   );

  //   return { success: true, message: 'Refund processed successfully', balance };
  // }
}
