import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
  [x: string]: any;
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  serviceName: string;

  @Prop({ required: true, enum: ['pending', 'done', 'onProgress'] })
  status: string;

  @Prop({ type: Object, required: false }) // 'details' can be any structure
  details: any;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
