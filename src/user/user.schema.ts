import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // Enable timestamps here
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;
  @Prop({ type: String, required: true })
  stripeUserId: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  fullname: string;

  @Prop({ type: [String], default: ['user'] })
  roles: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
