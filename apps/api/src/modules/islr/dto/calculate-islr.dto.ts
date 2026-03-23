import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateIslrDto {
  @IsNumber()
  @Min(0.01)
  taxableBase: number;

  @IsString()
  conceptId: string;

  @IsString()
  supplierId: string;

  @IsString()
  @IsOptional()
  companyId?: string; // Para aislar en multi-tenant
}
