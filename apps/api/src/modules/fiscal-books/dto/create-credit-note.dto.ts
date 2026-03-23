import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString,
  IsBoolean, IsUUID, Min,
} from 'class-validator';

export class CreateCreditNoteDto {
  @IsUUID() @IsNotEmpty()
  companyId: string;

  @IsUUID() @IsOptional()
  clientId?: string;

  @IsUUID() @IsOptional()
  supplierId?: string;

  @IsString() @IsOptional()
  controlNumber?: string;

  @IsDateString()
  issueDate: string;

  // Si se omiten, el servicio los calcula desde issueDate
  @IsNumber() @IsOptional()
  fiscalMonth?: number;

  @IsNumber() @IsOptional()
  fiscalYear?: number;

  // Documento afectado (al menos uno requerido)
  @IsUUID() @IsOptional()
  affectedSalesInvoiceId?: string;

  @IsUUID() @IsOptional()
  affectedPurchaseBillId?: string;

  // Extemporaneidad
  @IsBoolean() @IsOptional()
  isExtemporaneous?: boolean;

  @IsNumber() @IsOptional()
  affectedFiscalMonth?: number;

  @IsNumber() @IsOptional()
  affectedFiscalYear?: number;

  // Montos
  @IsString() @IsOptional()
  currencyCode?: string;

  @IsNumber() @Min(0)
  exchangeRate: number;

  @IsNumber() @Min(0) @IsOptional()
  exemptAmount?: number;

  @IsNumber() @Min(0) @IsOptional()
  taxableAmount16?: number;

  @IsNumber() @Min(0) @IsOptional()
  taxAmount16?: number;

  @IsNumber() @Min(0) @IsOptional()
  taxableAmount8?: number;

  @IsNumber() @Min(0) @IsOptional()
  taxAmount8?: number;

  @IsNumber() @Min(0)
  totalAmount: number;

  @IsString() @IsOptional()
  reason?: string;
}
