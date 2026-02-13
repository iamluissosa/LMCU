import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseBillDto } from './create-purchase-bill.dto';

export class UpdatePurchaseBillDto extends PartialType(CreatePurchaseBillDto) {}
