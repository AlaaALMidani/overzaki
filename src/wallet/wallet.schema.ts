import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Wallet extends Document {
  @Prop({ required: true, unique: true })
  userId: string;
  @Prop({ required: false, default: '' })
  stripeUserId: string;
  @Prop({ required: true, default: 0 })
  amount: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
