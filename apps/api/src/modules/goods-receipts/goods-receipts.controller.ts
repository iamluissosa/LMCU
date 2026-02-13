import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('receptions') // Ojo a la ruta
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @Permissions('receptions.create')
  create(@Request() req, @Body() data: any) {
    // Inyectamos el ID del usuario que recibe
    const payload = { ...data, receivedById: req.user.id };
    return this.goodsReceiptsService.create(req.user.companyId, payload);
  }

  @Get()
  @Permissions('receptions.view')
  findAll(@Request() req) {
    return this.goodsReceiptsService.findAll(req.user.companyId);
  }
}
