/* eslint-disable prettier/prettier */
import { RegisterDto } from './dto/register.dto';
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED) // Ensures the status code is 201 for successful responses
    async register(@Body() createUserDto: RegisterDto) {
        try {
            const response = await this.authService.register(createUserDto);
            return {
                status: HttpStatus.CREATED,
                ok: true,
                response,
            };
        } catch (error) {

            throw error;
        }
    }
    @Post('login')
    @HttpCode(HttpStatus.OK) // Ensures the status code is 200 for successful responses
    async login(@Body() loginDto: LoginDto) {
        try {
            const response = await this.authService.login(loginDto);
            return {
                status: HttpStatus.OK,
                ok: true,
                response,
            };
        } catch (error) {
            throw error; // Let NestJS handle the error and respond with the appropriate status code

        }
    }

}





