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

@Injectable()
export class AuthService {
  constructor(
    public readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    console.log(user);
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

  async login(
    data: LoginDto,
  ): Promise<{ fullname: string; accessToken: string }> {
    // Validate the login data
    const loginData = data;
    await this.validateInput(loginData, LoginDto);

    // Authenticate the user
    const user = await this.validateUser(data.email, data.password);

    const payload = { email: user._doc.email, id: user._doc._id };
    return {
      fullname: user._doc.fullname,
      accessToken: this.jwtService.sign(payload),
    };
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
    const user = await this.userService.createUser({
      ...data,
      passwordHash: hashedPassword,
    });

    const { passwordHash, ...result } = user._doc;
    return result;
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
