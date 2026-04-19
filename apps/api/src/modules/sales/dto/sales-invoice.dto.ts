import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsDateString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesInvoiceItemDto {
  @ValidateIf((o) => !o.serviceCategoryId)
  @IsUUID()
  productId?: string;

  @ValidateIf((o) => !o.productId)
  @IsUUID()
  serviceCategoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;
}

export class CreateSalesInvoiceDto {
  @IsUUID()
  clientId: string;

  // Si viene de un pedido
  @IsUUID()
  @IsOptional()
  salesOrderId?: string;

  @IsString()
  @IsOptional()
  controlNumber?: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string; // Fecha de emisión (para período fiscal SENIAT)

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  fiscalMonth?: number; // 1-12; auto-calculado de issueDate si no se provee

  @IsNumber()
  @IsOptional()
  fiscalYear?: number; // auto-calculado de issueDate si no se provee

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  // Retenciones (del cliente agente SENIAT)
  @IsNumber()
  @IsOptional()
  retIvaRate?: number; // Por defecto 75%

  @IsNumber()
  @IsOptional()
  retISLRRate?: number; // Viene del Client.islrRate

  // IGTF — solo si paga en efectivo USD
  @IsBoolean()
  @IsOptional()
  igtfApplies?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  inBook?: boolean;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceItemDto)
  items: SalesInvoiceItemDto[];
}

export class RegisterPaymentInDto {
  @IsUUID()
  clientId: string;

  @IsArray()
  details: Array<{
    salesInvoiceId: string;
    amountApplied: number;
  }>;

  @IsString()
  method: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsNumber()
  amountReceived: number;

  @IsNumber()
  @IsOptional()
  igtfAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
