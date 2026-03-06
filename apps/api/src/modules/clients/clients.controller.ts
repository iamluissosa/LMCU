import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('test-me')
  testMe(@Req() req: any) {
    return {
      user: req.user,
      msg: 'Hola dsd el backend',
    };
  }

  @Post()
  @Permissions('clients.create')
  create(@Body() createClientDto: CreateClientDto, @Req() req: any) {
    // Si viene req.user.companyId se infiere de la sesión, a menos que el dto traiga override
    const companyId = createClientDto.companyId || req.user.companyId;
    return this.clientsService.create(companyId, createClientDto);
  }

  @Get()
  @Permissions(
    'clients.view',
    'clients.create',
    'clients.edit',
    'clients.delete',
    'sales.view',
    'quotes.view',
    'sales-orders.view',
    'sales-invoices.view',
  )
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const _take = limit ? Number(limit) : take ? Number(take) : undefined;
    const _skip = skip ? Number(skip) : undefined;
    return this.clientsService.findAll(req.user.companyId, {
      skip: _skip,
      take: _take,
      search,
    });
  }

  @Get('lookup/cedula/:document')
  @Permissions('clients.create', 'clients.edit')
  lookupCedula(@Param('document') document: string) {
    return this.clientsService.lookupCedula(document);
  }

  @Get(':id')
  @Permissions(
    'clients.view',
    'clients.create',
    'clients.edit',
    'clients.delete',
    'sales.view',
  )
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.clientsService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  @Permissions('clients.edit')
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Req() req: any,
  ) {
    return this.clientsService.update(id, req.user.companyId, updateClientDto);
  }

  @Delete(':id')
  @Permissions('clients.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.clientsService.remove(id, req.user.companyId);
  }
}
