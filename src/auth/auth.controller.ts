/* eslint-disable prettier/prettier */
import { RegisterDto } from './dto/register.dto';
import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() createUserDto: RegisterDto) {
        try {
            const response = await this.authService.register(createUserDto);
            return {
                status: 201,
                ok: true,
                response,
            };
        } catch (error) {
            if (error.status === 400) {
                return {
                    status: 400,
                    ok: false,
                    validation: error.response.validation,
                };
            }
            throw error;
        }
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        try {
            const response = await this.authService.login(loginDto);
            return {
                status: 200,
                ok: true,
                response,
            };
        } catch (error) {
            if (error.status === 400) {
                return {
                    status: 400,
                    ok: false,
                    validation: error.response.validation,
                };
            }
            throw error;
        }
    }
}
