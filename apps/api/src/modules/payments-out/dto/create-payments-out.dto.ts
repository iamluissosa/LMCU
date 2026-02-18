import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsUUID, IsEnum } from 'class-validator';
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  bills: PaymentDetailDto[];
}
