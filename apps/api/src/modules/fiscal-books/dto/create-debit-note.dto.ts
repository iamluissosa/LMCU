import {
  IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString,
  IsUUID, Min,
} from 'class-validator';

export class CreateDebitNoteDto {
  @IsUUID() @IsNotEmpty()
  companyId: string;

  @IsUUID() @IsOptional()
  clientId?: string;

  @IsString() @IsOptional()
  controlNumber?: string;

  @IsDateString()
  issueDate: string;

  @IsNumber() @IsOptional()
  fiscalMonth?: number;

  @IsNumber() @IsOptional()
  fiscalYear?: number;

  @IsUUID() @IsOptional()
  affectedSalesInvoiceId?: string;

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
