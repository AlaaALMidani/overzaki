import { Controller, Get, Param, Post, Body, Req } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async createUser(@Body() userDto: { email: string; passwordHash: string }) {
    return this.userService.createUser(userDto);
  }

  @Get('info')
  async getUserinfo(@Req() req: any) {
    return await this.userService.findById(req.user.id);
  }
}
