import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseBillItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  productName?: string; // Útil para logs de error

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
  islrRate?: number;

  @IsNumber()
  @IsOptional()
  totalLine?: number;
}

export class CreatePurchaseBillDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsUUID()
  @IsNotEmpty()
  purchaseOrderId: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsOptional()
  controlNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  issueDate: string;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsNumber()
  @IsOptional()
  taxableAmount?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseBillItemDto)
  items: PurchaseBillItemDto[];
}
