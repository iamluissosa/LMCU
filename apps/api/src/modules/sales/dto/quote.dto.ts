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
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemDto {
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
  taxRate?: number; // 16, 8, 0

  @IsNumber()
  @IsOptional()
  discount?: number; // % descuento por línea
}

export class CreateQuoteDto {
  @IsUUID()
  clientId: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNote?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

export class UpdateQuoteStatusDto {
  @IsEnum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])
  status: string;
}
