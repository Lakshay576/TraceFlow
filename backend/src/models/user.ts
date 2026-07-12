import { Schema, model } from 'mongoose';
import type { Document, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default queries — must opt in with .select('+passwordHash')
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & Document;
export const User = model<UserDoc>('User', userSchema);