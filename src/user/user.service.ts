import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface User {
  id?: string;
  email: string;
  passwordHash: string;
  roles?: string[];
}

@Injectable()
export class UserService {
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createUser(user: {
    email: string;
    passwordHash: string;
  }): Promise<any> {
    try {
      const newUser = new this.userModel(user);
      return await newUser.save();
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }
}
