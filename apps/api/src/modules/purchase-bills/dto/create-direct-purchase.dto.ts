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
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DirectPurchaseItemDto {
  @IsUUID()
  @IsOptional()
  expenseCategoryId?: string; // Categoría de gasto (opcional)

  @IsString()
  @IsNotEmpty()
  description: string; // "Pago CORPOELEC Febrero 2026"

  @IsNumber()
  @Min(0.01)
  quantity: number; // Usualmente 1 para servicios

  @IsNumber()
  @Min(0)
  unitPrice: number; // Monto del gasto

  @IsNumber()
  @IsOptional()
  taxRate?: number; // Alícuota IVA (16, 8, 0)

  @IsNumber()
  @IsOptional()
  islrRate?: number; // Retención ISLR si aplica

  @IsString()
  @IsOptional()
  @IsIn(['PERCENT', 'FIXED_USD', 'FIXED_VES'])
  discountType?: 'PERCENT' | 'FIXED_USD' | 'FIXED_VES'; // Tipo de descuento

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountValue?: number; // Valor ingresado por el usuario

  @IsNumber()
  @IsOptional()
  totalLine?: number; // Calculado: (quantity * unitPrice) - descuento
}

export class CreateDirectPurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

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

  @IsString()
  @IsOptional()
  currencyCode?: string; // Múltiples monedas (USD o VES)

  @IsString()
  @IsOptional()
  islrConceptId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectPurchaseItemDto)
  items: DirectPurchaseItemDto[];
}
