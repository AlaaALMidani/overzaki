import { Schema } from 'mongoose';

export const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  fullname: { type: String, required: true },
  roles: { type: [String], default: ['user'] },
});
