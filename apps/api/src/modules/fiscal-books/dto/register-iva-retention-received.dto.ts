import {
  IsString, IsNotEmpty, IsNumber, IsDateString, IsUUID, Min,
} from 'class-validator';

export class RegisterIvaRetentionReceivedDto {
  @IsUUID() @IsNotEmpty()
  companyId: string;

  @IsUUID() @IsNotEmpty()
  clientId: string;

  @IsUUID() @IsNotEmpty()
  salesInvoiceId: string;

  @IsString() @IsNotEmpty()
  controlNumber: string; // Nro. Comprobante generado por el cliente agente

  @IsDateString()
  retentionDate: string;

  @IsNumber() @Min(0)
  retainedAmount: number;

  @IsNumber() @Min(0)
  taxableBase: number;

  @IsNumber() @Min(0)
  percentage: number; // 75 o 100
}
