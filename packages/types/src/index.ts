export interface Company {
  id: string;
  name: string;
  rif?: string;
}

export interface Supplier {
  id: string;
  name: string;
  rif: string;
  email?: string;
  phone?: string;
  address?: string;
  retentionISLR: number;
  paymentTerms: number;
  companyId: string;
  contactName?: string; // Editado T-01
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    stock?: number;
}

export interface PurchaseBillItem {
  id: string;
  productId: string;
  product?: Product; // Relation
  quantity: number;
  unitPrice: number;
  taxRate: number;
  islrRate: number;
  totalLine: number;
}

export interface PurchaseBill {
  id: string;
  invoiceNumber: string;
  controlNumber?: string;
  issueDate: Date | string;
  dueDate: Date | string;
  totalAmount: number;
  taxableAmount: number;
  taxAmount: number;
  exchangeRate?: number; // Editado T-01
  currencyCode?: string; // Editado T-01
  status: 'UNPAID' | 'PAID' | 'VOID' | 'PARTIAL';
  supplierId: string;
  supplier?: Supplier; // Relation
  items?: PurchaseBillItem[]; // Relation
  companyId: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  quantityReceived: number;
  unitPrice: number;
  totalLine: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  companyId: string;
  status: 'OPEN' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'; 
  totalAmount: number;
  issueDate: Date | string;
  items?: PurchaseOrderItem[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    lastPage?: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}
