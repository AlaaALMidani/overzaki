/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletService } from '../wallet/wallet.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class AuthService {
  constructor(
    public readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
    private readonly stripeService: StripeService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    throw new BadRequestException({
      validation: {
        email: 'Invalid credentials',
        password: 'Invalid credentials',
      },
    });
  }

  async register(data: any): Promise<any> {
    // Validate the registration data
    await this.validateInput(data, RegisterDto);

    // Check if the user already exists
    const existingUser = await this.userService.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException({
        validation: {
          email: 'Email is already in use',
        },
      });
    }

    // Hash the password and create the user
    const hashedPassword = await this.hashPassword(data.password);
    const stripeUserId=await this.stripeService.createCustomer(data.email);
    const user = await this.userService.createUser({
      ...data,
      stripeUserId,
      passwordHash: hashedPassword,
    });

    // Create a wallet for the new user
    await this.walletService.createWallet(user._doc._id,stripeUserId);
    const { passwordHash, ...result } = user._doc;
    return result;
  }



  async login(
    data: LoginDto,
  ): Promise<{ fullname: string; accessToken: string }> {
    const loginData = data;
    await this.validateInput(loginData, LoginDto);
    const user = await this.validateUser(data.email, data.password);
    const wallet = await this.walletService.getWalletByUserId(user._doc._id)

    console.log(wallet)
    const payload = { email: user._doc.email, id: user._doc._id, stripeId: user._doc.stripeUserId,walletId: wallet._id};
    return {
      fullname: user._doc.fullname,
      accessToken: this.jwtService.sign(payload),
    };
  }


  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async validateInput(input: any, dtoClass: any): Promise<void> {
    const dtoInstance = plainToInstance(dtoClass, input);
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const validationErrors = {};
      errors.forEach((error) => {
        validationErrors[error.property] = Object.values(error.constraints)[0];
      });

      throw new BadRequestException({
        validation: validationErrors,
      });
    }
  }
}
