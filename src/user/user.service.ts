import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class UserService {
  private readonly filePath = path.join(process.cwd(), 'data', 'data.json');
  private readData() {
    const rawData = fs.readFileSync(this.filePath, 'utf8');
    return JSON.parse(rawData);
  }
  private writeData(data: any) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  getUserById(userId: string) {
    const data = this.readData();
    return data.users.find((user: any) => user.id === userId);
  }
  getBalance(userId: string): number | null {
    const data = this.readData();
    const user = data.users.find((user: any) => user.id === userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user.walletBalance || 0;
  }
  updateUserBalance(
    userId: string,
    amount: number,
    type: string,
    paymentIntent?: any,
  ) {
    const data = this.readData();
    const user = data.users.find((user: any) => user.id === userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (type === 'refund') {
      user.walletBalance += amount;
    } else {
      user.walletBalance += type === 'deposit' ? amount : -amount;
    }
    if (!data.transactions) {
      data.transactions = [];
    }
    data.transactions.push({
      userId,
      amount,
      type,
      paymentIntent,
      timestamp: new Date().toISOString(),
    });

    this.writeData(data);

    return user.walletBalance;
  }
  isAdmin(userId: string): boolean {
    const data = this.readData();
    const user = data.users.find((user: any) => user.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user.role === 'admin';
  }
}
