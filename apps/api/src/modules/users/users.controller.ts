import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CompaniesService } from '../companies/companies.service';
import { SettingsService } from '../settings/settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly settingsService: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  // 🔥 NUEVO: Endpoint PÚBLICO para registro directo (bypass confirmación email)
  @Post('register')
  async register(@Body() body: any) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpException(
        'Falta configurar SUPABASE_SERVICE_ROLE_KEY',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Crear en Supabase Auth
    // Nota: Auto-confirmamos el email para que el login funcione de inmediato en este entorno
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password || '12345678',
        email_confirm: true,
        user_metadata: { name: body.name },
      });

    let userId = authUser?.user?.id;

    if (authError) {
      // Si ya existe, permitimos continuar para intentar crearlo en BD local si falta
      // Error msg usually: "A user with this email address has already been registered"
      if (
        authError.message.includes('already been registered') ||
        authError.status === 422
      ) {
        // Recuperar ID de usuario existente
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        // Nota: listUsers no filtra por email nativamente directo, hay que buscar.
        // En producción esto no es eficiente, pero para ERP interno funciona.
        const existing = listData.users.find(
          (u: any) => u.email === body.email,
        );
        if (existing) userId = existing.id;
        else
          throw new HttpException(
            'El usuario existe en Auth pero no se pudo recuperar su ID',
            HttpStatus.CONFLICT,
          );
      } else {
        console.error('Error Supabase:', authError);
        throw new HttpException(authError.message, HttpStatus.BAD_REQUEST);
      }
    }

    // 2. Crear Empresa si se proporcionan datos
    let companyId = body.companyId || null;
    if (body.company) {
      const company = await this.companiesService.create(body.company);
      companyId = company.id;
    }

    // 3. Crear en BD Local (o devolver si ya existe)
    const user = await this.usersService.create({
      id: userId,
      email: body.email,
      password: body.password || '12345678',
      name: body.name,
      roleLegacy: body.roleLegacy || 'USER', // 'ADMIN' si lo envía el frontend
      roleId: body.roleId || null,
      companyId: companyId,
    });

    // 4. Crear Roles por Defecto si se creó empresa
    if (companyId && body.company) {
      // Rol Admin con todos los permisos
      await this.settingsService.createRole(companyId, {
        name: 'Administrador',
        permissions: [
          'dashboard.view',
          'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
          'receptions.view', 'receptions.create',
          'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.delete',
          'bills.view', 'bills.create', 'bills.edit', 'bills.delete',
          'payments.view', 'payments.create',
          'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
          'users.view', 'users.create', 'users.edit', 'users.delete',
          'companies.view', 'companies.create', 'companies.edit',
          'settings.view', 'settings.edit', 'settings.formats',
          'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
          'sales.view', 'sales.create', 'sales.edit', 'sales.invoice', 'sales.delete',
        ],
      });

      // Rol Usuario con permisos básicos
      await this.settingsService.createRole(companyId, {
        name: 'Usuario',
        permissions: [
          'dashboard.view',
          'inventory.view',
          'receptions.view',
          'purchase_orders.view',
          'bills.view',
          'payments.view',
          'suppliers.view',
          'users.view',
          'companies.view',
          'settings.view',
          'clients.view',
          'sales.view',
        ],
      });

      // Asignar rol al usuario según roleLegacy
      if (body.roleLegacy === 'ADMIN') {
        const adminRole = await this.prisma.role.findFirst({
          where: { companyId, name: 'Administrador' },
        });
        if (adminRole) {
          await this.usersService.update(user.id, { roleId: adminRole.id }, companyId);
        }
      } else {
        const userRole = await this.prisma.role.findFirst({
          where: { companyId, name: 'Usuario' },
        });
        if (userRole) {
          await this.usersService.update(user.id, { roleId: userRole.id }, companyId);
        }
      }
    }

    return user;
  }

  // 🔥 Endpoint para que un ADMIN cree usuarios (crea en Supabase + BD Local)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Post('create-with-auth')
  @Permissions('users.create')
  async createWithAuth(@Body() body: any, @Request() req: any) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpException(
        'Falta configurar SUPABASE_SERVICE_ROLE_KEY',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Crear en Supabase Auth
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password || '12345678', // Password temporal si no se envía
        email_confirm: true,
        user_metadata: { name: body.name },
      });

    let userId = authUser?.user?.id;

    if (authError) {
      // Si ya existe, intentamos recuperar ID
      if (
        authError.message.includes('already been registered') ||
        authError.status === 422
      ) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData.users.find(
          (u: any) => u.email === body.email,
        );
        if (existing) userId = existing.id;
        else
          throw new HttpException(
            'El usuario existe en Auth pero no se pudo recuperar su ID',
            HttpStatus.CONFLICT,
          );
      } else {
        console.error('Error Supabase:', authError);
        throw new HttpException(authError.message, HttpStatus.BAD_REQUEST);
      }
    }

    // 2. Crear en BD Local
    try {
      return await this.usersService.create({
        id: userId,
        email: body.email,
        password: body.password || '12345678',
        name: body.name,
        roleLegacy: body.roleLegacy || 'USER',
        roleId: body.roleId || null,
        companyId: body.companyId || req.user.companyId || null,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new HttpException(
          'El usuario ya existe en la base de datos local.',
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard) // 🔒 Seguridad para el resto
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Post()
  @Permissions('users.create')
  create(@Request() req, @Body() createUserDto: any) {
    const user = req.user;

    // Caso: Auto-registro de usuario nuevo (viene de Supabase pero no existe en local)
    if (user.isNew) {
      createUserDto.id = user.userId; // ID debe coincidir con Supabase
      createUserDto.email = user.email; // Email debe coincidir con Supabase
      // Permitimos que el frontend mande role='ADMIN' y companyId=null
    }
    // Caso: Usuario existente creando otro usuario
    else if (user.companyId) {
      createUserDto.companyId = user.companyId;
    }

    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Get()
  @Permissions('users.view')
  findAll(@Request() req) {
    const user = req.user;
    return this.usersService.findAll(user.companyId, user.role);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Get(':id')
  @Permissions('users.view')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.companyId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Patch(':id')
  @Permissions('users.edit')
  update(@Param('id') id: string, @Body() updateUserDto: any, @Request() req) {
    return this.usersService.update(id, updateUserDto, req.user.companyId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Delete(':id')
  @Permissions('users.delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user.companyId);
  }
}
