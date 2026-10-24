import { Schema, model, type Types } from 'mongoose';

// Forma del documento de credenciales tal como se guarda en MongoDB.
export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  password: string; // hash bcrypt, nunca la contraseña en claro
  rol: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  rol: { type: String, default: 'alumno' }
}, {
  timestamps: true,
  versionKey: false
});

export const UserModel = model<UserRecord>('User', userSchema);
