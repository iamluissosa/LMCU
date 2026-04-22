import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(@Body() body: any) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new HttpException(
        'Falta configurar SUPABASE_URL o KEY',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Iniciar sesión en Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw new HttpException(
        authError?.message || 'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 2. Buscar datos del usuario en la base de datos local
    const localUser = await this.usersService.findUserById(authData.user.id);

    if (!localUser) {
      throw new HttpException(
        'Usuario no encontrado en la base de datos local',
        HttpStatus.NOT_FOUND,
      );
    }

    // 3. Obtener permisos del rol
    let permissions: string[] = [];
    if (localUser.role && localUser.role.permissions) {
      // asumiendo que permissions está guardado en JSON o como array en prisma
      try {
        permissions = typeof localUser.role.permissions === 'string' 
          ? JSON.parse(localUser.role.permissions as string) 
          : localUser.role.permissions;
      } catch (e) {
        permissions = Array.isArray(localUser.role.permissions) ? localUser.role.permissions as string[] : [];
      }
    }

    // 4. Formatear la respuesta para el frontend/mobile
    return {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.roleLegacy,
        permissions: permissions,
        companyId: localUser.companyId,
      },
    };
  }

  @Post('logout')
  async logout() {
    // Para JWT en Supabase, el token expira o se revoca en el cliente.
    // Solo retornamos 200 OK para que el frontend pueda limpiar sus tokens
    // y para satisfacer el endpoint esperado por el mobile client.
    return { message: 'Sesión cerrada correctamente' };
  }
}
