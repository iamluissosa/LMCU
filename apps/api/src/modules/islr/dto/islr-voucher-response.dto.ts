export interface IslrVoucherResponseDto {
  agent: {
    name: string;
    rif: string;
    address: string;
  };
  beneficiary: {
    name: string;
    rif: string;          // Garantizado formato correcto [VEJG]-...
    personType: string;   // ej. "PJD"
    address: string;
  };
  voucherCode: string;    // Numero de control correlativo (ej. 2026110000001)
  retentionDate: string;  // ISO String
  
  seniatConcept: {
    code: string;         // ej. "058"
    description: string;
  };

  financials: {
    totalInvoice: number; // Monto total mercantil
    taxableBase: number;  // Monto sujeto a retención (B)
    percentage: number;   // % de retención según Decreto (p)
    sustraendo: number;   // Monto que se restó legalmente por UT (S)
    retainedAmount: number; // Monto exacto descontado al neto ISLR (R)
  };
}
