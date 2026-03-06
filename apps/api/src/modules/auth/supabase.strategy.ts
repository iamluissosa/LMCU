import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.SUPABASE_JWT_SECRET ||
        'RKB5Y2sroARzTpFnYJl1CCwADYnTcBLmj/EShBueeuGDUs3OVNuhbwzQgdOSaoAxd1KYuS0v2qDNArUyl7qruw==',
    });
  }

  async validate(payload: any) {
    // Validar existencia en BD local y obtener companyId
    const user = await this.usersService.findUserById(payload.sub);

    if (!user) {
      // ⚠️ CAMBIO CRÍTICO: Permitir usuarios nuevos para que puedan registrarse
      return {
        userId: payload.sub,
        email: payload.email,
        isNew: true, // 🚩 Bandera para identificar usuarios pendientes de registro
        companyId: null,
        roles: [],
        permissions: [],
      };
    }

    const permissions = user.role?.permissions || [];
    console.log(
      `🔍 AUTH VALIDATE - Email: ${user.email}, RoleLegacy: ${user.roleLegacy}, CustomRole: ${user.role?.name}, Perms: ${Array.isArray(permissions) ? permissions.length : 'N/A'}`,
    );

    return {
      userId: payload.sub,
      email: payload.email,
      name: user.name, // Nombre del usuario
      roles: payload.app_metadata?.roles || [],
      companyId: user.companyId,
      companyName: user.company?.name, // Nombre de la empresa
      role: user.roleLegacy, // Rol legacy (ADMIN/USER)
      roleName: user.role?.name, // Nombre del rol personalizado
      permissions: permissions, // Permisos del rol personalizado
    };
  }
}
