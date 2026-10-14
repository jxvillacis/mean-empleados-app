import { Schema, model, type Types } from 'mongoose';

// Forma del documento tal como se guarda en MongoDB.
export interface EmployeeRecord {
  _id: Types.ObjectId;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeRecord>({
  nombre: { type: String, required: true },
  cargo: { type: String, required: true },
  departamento: { type: String, required: true },
  sueldo: { type: Number, required: true }
}, {
  timestamps: true,
  versionKey: false
});

export const EmployeeModel = model<EmployeeRecord>('Empleado', employeeSchema);
