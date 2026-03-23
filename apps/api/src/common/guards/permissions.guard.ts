import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin decorador @Permissions → acceso libre (solo requiere JWT válido)
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    // ── ADMIN bypass ──────────────────────────────────────────────────
    // El campo `role` en el payload JWT es `user.roleLegacy` (ver supabase.strategy.ts)
    // Los valores posibles son: 'ADMIN' | 'USER' | undefined
    const legacyRole = user?.role ?? user?.roleLegacy;
    if (legacyRole === 'ADMIN') {
      return true;
    }

    // ── Verificación de permisos granulares ──────────────────────────
    const permissions: string[] = Array.isArray(user?.permissions)
      ? user.permissions
      : [];

    const hasPermission = required.some((perm) => permissions.includes(perm));

    if (!hasPermission) {
      console.warn(
        `⛔ Acceso Denegado. Usuario: ${user?.email}, RolLegacy: ${legacyRole}, RolCustom: ${user?.roleName}`,
      );
      console.warn(`   Permisos requeridos: [${required.join(', ')}]`);
      console.warn(
        `   Permisos del usuario (${permissions.length}):`,
        permissions,
      );

      throw new ForbiddenException(
        `Access Denied. RoleLegacy: ${legacyRole}, CustomRole: ${user?.roleName}, Your Perms: ${JSON.stringify(permissions)}`,
      );
    }

    return hasPermission;
  }
}
