import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  walletId: string;

  @Prop({ required: true })
  type: string; // e.g., 'credit' or 'debit'

  @Prop({ required: true })
  amount: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
