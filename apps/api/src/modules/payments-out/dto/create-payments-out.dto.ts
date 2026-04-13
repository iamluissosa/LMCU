import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// Definición manual para evitar dependencia de regeneración de prisma client en este entorno
export enum PaymentMethod {
  CASH_USD = 'CASH_USD',
  CASH_VES = 'CASH_VES',
  ZELLE = 'ZELLE',
  TRANSFER_VES = 'TRANSFER_VES',
  TRANSFER_USD = 'TRANSFER_USD',
  PAGO_MOVIL = 'PAGO_MOVIL',
}

class RetentionDataDto {
  @IsNumber()
  @IsOptional()
  retentionIVA?: number;

  @IsNumber()
  @IsOptional()
  rateRetIVA?: number;

  @IsString()
  @IsOptional()
  receiptRetIVA?: string;

  @IsNumber()
  @IsOptional()
  retentionISLR?: number;

  @IsNumber()
  @IsOptional()
  rateRetISLR?: number;

  @IsString()
  @IsOptional()
  receiptRetISLR?: string;

  @IsNumber()
  @IsOptional()
  igtfAmount?: number;

  // Campos para crear registro IslrRetention al momento del pago
  @IsString()
  @IsOptional()
  islrConceptId?: string;

  @IsNumber()
  @IsOptional()
  islrTaxableBase?: number;

  @IsNumber()
  @IsOptional()
  islrPercentage?: number;

  @IsNumber()
  @IsOptional()
  islrSustraendo?: number;

  @IsNumber()
  @IsOptional()
  islrTotalInvoice?: number;
}

class PaymentDetailDto {
  @IsUUID()
  @IsNotEmpty()
  purchaseBillId: string;

  @IsNumber()
  @Min(0)
  amountApplied: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RetentionDataDto)
  retentionData?: RetentionDataDto;
}

class PaymentOutExpenseItemDto {
  @IsUUID()
  @IsOptional()
  expenseCategoryId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreatePaymentOutDto {
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

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
  @Min(0)
  exchangeRate: number;

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  @IsOptional()
  bills?: PaymentDetailDto[];

  @IsBoolean()
  @IsOptional()
  isDirectExpense?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentOutExpenseItemDto)
  @IsOptional()
  expenseItems?: PaymentOutExpenseItemDto[];

  @IsString()
  @IsOptional()
  eventId?: string;
}
