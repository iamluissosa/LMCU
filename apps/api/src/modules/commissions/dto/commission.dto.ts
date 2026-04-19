import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { CommissionType } from '@prisma/client';

export class CreateCommissionRuleDto {
  @IsString()
  name: string;

  @IsEnum(CommissionType)
  @IsOptional()
  type?: CommissionType;

  @IsNumber()
  rate: number;

  @IsNumber()
  @IsOptional()
  fixedAmount?: number;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}
