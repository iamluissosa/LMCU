import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TaxpayerType {
  NATURAL = 'NATURAL',
  JURIDICAL = 'JURIDICAL',
  JURIDICAL_FOREIGN = 'JURIDICAL_FOREIGN',
  GOVERNMENT = 'GOVERNMENT',
}

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^[JGVEP]-\d{8}-\d$/, {
    message: 'El RIF debe tener el formato J-12345678-9',
  })
  rif?: string;

  @IsEnum(TaxpayerType)
  @IsOptional()
  taxpayerType?: TaxpayerType;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  isIvaAgent?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  islrRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  paymentTerms?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  creditLimit?: number;

  @IsOptional()
  companyId?: string; // Por si necesita override desde admins
}

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[JGVEP]-\d{8}-\d$/, {
    message: 'El RIF debe tener el formato J-12345678-9',
  })
  rif?: string;

  @IsEnum(TaxpayerType)
  @IsOptional()
  taxpayerType?: TaxpayerType;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  isIvaAgent?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  islrRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  paymentTerms?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => Number(value))
  creditLimit?: number;
}
