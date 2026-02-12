import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔥 NUEVO: Endpoint PÚBLICO para registro directo (bypass confirmación email)
  // 🔥 Endpoint para que un ADMIN cree usuarios (crea en Supabase + BD Local)
  @UseGuards(AuthGuard('jwt'))
  @Post('create-with-auth')
  async createWithAuth(@Body() body: any, @Request() req) {
    // Solo permitir si el usuario que llama tiene permisos (opcional: validar rol ADMIN)
    // if (req.user.roleLegacy !== 'ADMIN') throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new HttpException('Falta configurar SUPABASE_SERVICE_ROLE_KEY', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Crear en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password || '12345678', // Password temporal si no se envía
        email_confirm: true,
        user_metadata: { name: body.name }
    });

    if (authError) {
        console.error('Error Supabase:', authError);
        throw new HttpException(authError.message, HttpStatus.BAD_REQUEST);
    }

    // 2. Crear en BD Local
    return this.usersService.create({
        id: authUser.user.id,
        email: body.email,
        password: body.password || '12345678',
        name: body.name,
        roleLegacy: body.roleLegacy || 'USER',
        roleId: body.roleId || null,
        companyId: body.companyId || req.user.companyId || null // Asigna empresa si se envía, o la del creador
    });
  }

  @UseGuards(AuthGuard('jwt')) // 🔒 Seguridad para el resto
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() createUserDto: any) {
    const user = req.user;

    // Caso: Auto-registro de usuario nuevo (viene de Supabase pero no existe en local)
    if (user.isNew) {
      createUserDto.id = user.userId;   // ID debe coincidir con Supabase
      createUserDto.email = user.email; // Email debe coincidir con Supabase
      // Permitimos que el frontend mande role='ADMIN' y companyId=null
    } 
    // Caso: Usuario existente creando otro usuario
    else if (user.companyId) {
      createUserDto.companyId = user.companyId;
    }
    
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    const user = req.user;
    return this.usersService.findAll(user.companyId, user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}