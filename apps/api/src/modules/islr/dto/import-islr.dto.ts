export interface ConceptRowDto {
  code: string;
  description: string;
  isActive: boolean;
}

export interface RateRowDto {
  conceptCode: string;
  personType: 'PNR' | 'PNNR' | 'PJD' | 'PJND';
  percentage: number;
  sustraendoFact: number;
  minBaseUt: number;
}

export interface ImportIslrPayload {
  concepts: ConceptRowDto[];
  rates: RateRowDto[];
}

export interface ImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ImportIslrResult {
  success: boolean;
  conceptsProcessed: number;
  ratesProcessed: number;
  errors: ImportRowError[];
  message: string;
}
