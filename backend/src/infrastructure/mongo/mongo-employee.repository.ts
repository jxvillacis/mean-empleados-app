import { isValidObjectId } from 'mongoose';
import type { CreateEmployeeData, Employee, UpdateEmployeeData } from '../../domain/employee.js';
import type { IEmployeeRepository, Page } from '../../repositories/employee.repository.js';
import { EmployeeModel, type EmployeeRecord } from './employee.model.js';

// Traduce el documento de MongoDB a la entidad de dominio (oculta _id y ObjectId).
const toEmployee = (doc: EmployeeRecord): Employee => ({
  id: doc._id.toString(),
  nombre: doc.nombre,
  cargo: doc.cargo,
  departamento: doc.departamento,
  sueldo: doc.sueldo,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

// Implementación concreta del repositorio con Mongoose.
export class MongoEmployeeRepository implements IEmployeeRepository {
  async findAll(): Promise<Employee[]> {
    const docs = await EmployeeModel.find().sort({ createdAt: 1 }).lean<EmployeeRecord[]>();
    return docs.map(toEmployee);
  }

  async findPage(page: number, limit: number): Promise<Page<Employee>> {
    // La página y el conteo total se consultan en paralelo; skip/limit los resuelve MongoDB.
    const [docs, total] = await Promise.all([
      EmployeeModel.find().sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit).lean<EmployeeRecord[]>(),
      EmployeeModel.countDocuments()
    ]);
    return { items: docs.map(toEmployee), total };
  }

  async findById(id: string): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findById(id).lean<EmployeeRecord>();
    return doc ? toEmployee(doc) : null;
  }

  async create(data: CreateEmployeeData): Promise<Employee> {
    const doc = await EmployeeModel.create(data);
    return toEmployee(doc.toObject());
  }

  async update(id: string, data: UpdateEmployeeData): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
      .lean<EmployeeRecord>();
    return doc ? toEmployee(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const doc = await EmployeeModel.findByIdAndDelete(id).lean<EmployeeRecord>();
    return doc !== null;
  }
}
