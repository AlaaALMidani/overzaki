import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new Error('Invalid email or password'); // Add proper error handling
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const hashedPassword = await this.authService.hashPassword(body.password);
    return this.authService.userService.createUser({
      email: body.email,
      passwordHash: hashedPassword,
    });
  }
}
