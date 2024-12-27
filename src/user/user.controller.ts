import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':email')
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new Error('User not found'); // Replace with proper exception
    }
    return user;
  }

  @Post('create')
  async createUser(@Body() userDto: { email: string; passwordHash: string }) {
    return this.userService.createUser(userDto);
  }
}
