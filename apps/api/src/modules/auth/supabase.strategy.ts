import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

// Permisos implícitos para usuarios ADMIN sin rol personalizado asignado
const ADMIN_IMPLICIT_PERMISSIONS = [
  'dashboard.view',
  'bills.view',
  'bills.create',
  'bills.delete',
  'payments.view',
  'payments.create',
  'sales.view',
  'sales.invoice',
  'sales.order',
  'clients.view',
  'clients.create',
  'suppliers.view',
  'suppliers.create',
  'products.view',
  'products.create',
  'settings.view',
  'settings.edit',
  'users.view',
  'users.create',
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
    // 1. Buscar por ID (caso nominal: IDs sincronizados)
    let user = await this.usersService.findUserById(payload.sub as string);

    // 2. Fallback por email cuando el UUID de Supabase no coincide con el ID local
    //    Esto ocurre cuando el usuario fue creado antes de sincronizar con Supabase
    if (!user && payload.email) {
      user = await this.usersService.findByEmail(payload.email as string);
      if (user) {
        console.warn(
          `⚠️ AUTH SYNC: Usuario encontrado por email ${payload.email}. ` +
          `Sub Supabase: ${payload.sub}, ID local: ${user.id}`,
        );
      }
    }

    // 3. Usuario genuinamente nuevo (todavía no registrado)
    if (!user) {
      return {
        userId: payload.sub,
        email: payload.email,
        isNew: true,
        companyId: null,
        roles: [],
        permissions: [],
      };
    }

    // Permisos desde el rol personalizado asignado (campo JSON en BD)
    const rolePermissions = (user.role?.permissions as string[] | null) ?? [];

    // Si es ADMIN legacy sin rol personalizado → permisos implícitos completos
    const permissions: string[] =
      rolePermissions.length > 0
        ? rolePermissions
        : user.roleLegacy === 'ADMIN'
          ? ADMIN_IMPLICIT_PERMISSIONS
          : [];

    console.log(
      `🔍 AUTH VALIDATE - Email: ${user.email}, ` +
      `RoleLegacy: ${user.roleLegacy}, ` +
      `CustomRole: ${user.role?.name ?? 'ninguno'}, ` +
      `Perms: ${permissions.length}`,
    );

    return {
      id: user.id,
      userId: payload.sub,
      email: payload.email,
      name: user.name,
      roles: (payload.app_metadata?.roles as string[]) || [],
      companyId: user.companyId,
      companyName: user.company?.name,
      role: user.roleLegacy,      // 'ADMIN' | 'USER' (campo legacy en BD)
      roleName: user.role?.name,  // nombre del rol personalizado si existe
      permissions,                // permisos efectivos usados por PermissionsGuard
    };
  }
}
