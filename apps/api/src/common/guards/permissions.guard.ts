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

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (user?.role === 'ADMIN') {
      return true;
    }

    const permissions: string[] = user?.permissions || [];
    const hasPermission = required.some((perm) => permissions.includes(perm));

    if (!hasPermission) {
      console.warn(
        `⛔ Acceso Denegado. Usuario: ${user?.email}, RolLegacy: ${user?.role}, RolCustom: ${user?.roleName}`,
      );
      console.warn(`   Permisos requeridos: [${required.join(', ')}]`);
      console.warn(
        `   Permisos del usuario (Tipo ${typeof permissions}):`,
        permissions,
      );

      throw new ForbiddenException(
        `Access Denied. RoleLegacy: ${user?.role}, CustomRole: ${user?.roleName}, Your Perms: ${JSON.stringify(permissions)}`,
      );
    }

    return hasPermission;
  }
}
