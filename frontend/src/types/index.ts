export type Role = "DOCTEUR" | "ASSISTANTE";

export interface UserSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  passwordChangeRequired: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserSummary;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  cin?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  address?: string;
  city?: string;
  birthDate?: string;
  sex?: string;
  email?: string;
  coverageType: string;
  membershipNumber?: string;
  allergies?: string;
  medicalHistory?: string;
  observations?: string;
  fileStatus: string;
  verificationStatus: string;
  lastVisitAt?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  phone: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  treatmentType?: string;
  status: string;
  observations?: string;
  verificationStatus: string;
  cancellationReason?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  invoiceNumber: string;
  type: string;
  invoiceDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  verificationStatus: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id?: string;
  description: string;
  tooth?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface Laboratory {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  taxIdentifier?: string;
  observations?: string;
  active: boolean;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  patientIncome: number;
  supplierOutflow: number;
  expenses: number;
  theoreticalBalance: number;
  actualClosingBalance?: number;
  status: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface Consultation {
  id: string;
  patientId: string;
  treatmentPlanId?: string;
  consultationAt: string;
  reason?: string;
  diagnosis?: string;
  diseaseType?: string;
  tooth?: string;
  treatmentPerformed?: string;
  observations?: string;
  prescription?: string;
  price: number;
  treatmentStatus: string;
  verificationStatus: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  planNumber: string;
  title: string;
  status: string;
  verificationStatus: string;
  startDate: string;
  completedAt?: string;
  notes?: string;
}

export interface PatientPayment {
  id: string;
  patientId: string;
  invoiceId: string;
  invoiceNumber: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  verificationStatus: string;
}

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  status: string;
  passwordChangeRequired: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Verification {
  id: string;
  entityType: string;
  entityId: string;
  patientId?: string;
  submittedBy?: string;
  status: string;
  doctorComment?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  username: string;
  userRole: string;
  action: string;
  module: string;
  entityType: string;
  description: string;
  workstation?: string;
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  laboratoryId: string;
  laboratory: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes?: string;
  verificationStatus: string;
}

export interface LaboratoryJob {
  id: string;
  laboratoryId: string;
  laboratoryName: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  jobType: string;
  tooth?: string;
  shade?: string;
  description?: string;
  sentDate?: string;
  expectedDate?: string;
  receivedDate?: string;
  laboratoryPrice: number;
  status: string;
  notes?: string;
  verificationStatus: string;
}
