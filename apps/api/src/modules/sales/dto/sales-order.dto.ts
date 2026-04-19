import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsDateString,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesOrderItemDto {
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

export class CreateSalesOrderDto {
  @IsUUID()
  clientId: string;

  // Si viene de una cotización aceptada
  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNote?: string;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}

export class UpdateSalesOrderStatusDto {
  @IsEnum([
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'INVOICED',
    'CANCELLED',
  ])
  status: string;
}
