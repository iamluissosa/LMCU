import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentOutDto } from './create-payments-out.dto';

export class UpdatePaymentsOutDto extends PartialType(CreatePaymentOutDto) {}
