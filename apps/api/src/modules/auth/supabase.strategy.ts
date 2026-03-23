import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

// Permisos comodín para el rol ADMIN legacy (sin role personalizado asignado)
const ADMIN_IMPLICIT_PERMISSIONS = [
  'dashboard.view',
  'bills.view', 'bills.create', 'bills.delete',
  'payments.view', 'payments.create',
  'sales.view', 'sales.invoice', 'sales.order',
  'clients.view', 'clients.create',
  'suppliers.view', 'suppliers.create',
  'products.view', 'products.create',
  'settings.view', 'settings.edit',
  'users.view', 'users.create',
  'reports.view',
];

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
      // Permitir nuevos users para que puedan registrarse
      return {
        userId: payload.sub,
        email: payload.email,
        isNew: true,
        companyId: null,
        roles: [],
        permissions: [],
      };
    }

    // Permisos del rol personalizado (si tiene uno asignado)
    const rolePermissions: string[] = (user.role?.permissions as string[] | null) ?? [];

    // Si es ADMIN y no tiene rol personalizado con permisos → usar implícitos
    const permissions =
      rolePermissions.length > 0
        ? rolePermissions
        : user.roleLegacy === 'ADMIN'
          ? ADMIN_IMPLICIT_PERMISSIONS
          : [];

    console.log(
      `🔍 AUTH VALIDATE - Email: ${user.email}, RoleLegacy: ${user.roleLegacy}, CustomRole: ${user.role?.name}, Perms: ${permissions.length}`,
    );

    return {
      id: user.id,
      userId: payload.sub,
      email: payload.email,
      name: user.name,
      roles: payload.app_metadata?.roles || [],
      companyId: user.companyId,
      companyName: user.company?.name,
      role: user.roleLegacy,        // 'ADMIN' | 'USER' | null
      roleName: user.role?.name,    // nombre rol personalizado
      permissions,                  // permisos efectivos
    };
  }
}
