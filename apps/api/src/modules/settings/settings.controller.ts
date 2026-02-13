import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // --- CONFIGURACIÓN GENERAL ---
  @Get('general')
  @Permissions('settings.view')
  getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.companyId);
  }

  @Patch('general')
  @Permissions('settings.edit')
  updateSettings(@Request() req, @Body() data: any) {
    return this.settingsService.updateSettings(req.user.companyId, data);
  }

  // --- ROLES ---
  @Get('roles')
  @Permissions('settings.view')
  getRoles(@Request() req) {
    // Pasamos el rol del usuario para saber si es ADMIN y debe ver todos
    return this.settingsService.getRoles(req.user.companyId, req.user.role);
  }

  @Post('roles')
  @Permissions('settings.edit')
  createRole(@Request() req, @Body() data: any) {
    // Si es ADMIN y no tiene companyId en su user, intentamos usar el del body
    const companyId =
      req.user.companyId || (req.user.role === 'ADMIN' ? data.companyId : null);
    if (!companyId)
      throw new Error('Se requiere ID de empresa para crear un rol');

    return this.settingsService.createRole(companyId, data);
  }

  @Patch('roles/:id')
  @Permissions('settings.edit')
  updateRole(@Request() req, @Param('id') id: string, @Body() data: any) {
    // Si es ADMIN, permitimos editar cualquier rol. Si es USER, validamos empresa.
    // Si req.user.companyId es undefined (SuperAdmin sin empresa), pasamos validación si es ADMIN.
    if (!req.user.companyId && req.user.role !== 'ADMIN') {
      throw new Error('Usuario sin empresa');
    }
    return this.settingsService.updateRole(
      id,
      data,
      req.user.companyId,
      req.user.role,
    );
  }

  @Delete('roles/:id')
  @Permissions('settings.edit')
  deleteRole(@Request() req, @Param('id') id: string) {
    if (!req.user.companyId && req.user.role !== 'ADMIN') {
      throw new Error('Usuario sin empresa');
    }
    return this.settingsService.deleteRole(
      id,
      req.user.companyId,
      req.user.role,
    );
  }
}
