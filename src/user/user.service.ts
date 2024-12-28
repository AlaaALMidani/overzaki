import { Injectable, BadRequestException } from '@nestjs/common';
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

  /**
   * Finds a user by email.
   * @param email User's email address.
   * @returns The user or null if not found.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Creates a new user.
   * @param user The user object containing email and passwordHash.
   * @returns The saved user.
   * @throws BadRequestException if the email is already in use.
   */
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
        throw new BadRequestException({
          validation: {
            email: 'Email is already in use',
          },
        });
      }
      throw error;
    }
  }
}
