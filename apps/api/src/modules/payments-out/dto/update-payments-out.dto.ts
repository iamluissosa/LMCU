import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentsOutDto } from './create-payments-out.dto';

export class UpdatePaymentsOutDto extends PartialType(CreatePaymentsOutDto) {}
