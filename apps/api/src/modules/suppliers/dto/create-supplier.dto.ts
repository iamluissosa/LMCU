import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  rif: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentTerms?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  retentionISLR?: number;
}
