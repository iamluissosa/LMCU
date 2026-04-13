import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

// Permisos implícitos para usuarios ADMIN sin rol personalizado asignado
const ADMIN_IMPLICIT_PERMISSIONS = [
  'dashboard.view',
  // Facturación / Compras
  'bills.view',
  'bills.create',
  'bills.edit',
  'bills.delete',
  'payments.view',
  'payments.create',
  'payments.edit',
  'payments.delete',
  // Ventas
  'sales.view',
  'sales.create',
  'sales.edit',
  'sales.invoice',
  'sales.order',
  'sales.delete',
  // Clientes
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  // Proveedores
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'suppliers.delete',
  // Inventario
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.delete',
  // Recepciones
  'receptions.view',
  'receptions.create',
  // Órdenes de Compra
  'purchase_orders.view',
  'purchase_orders.create',
  'purchase_orders.edit',
  'purchase_orders.delete',
  // Productos (legacy)
  'products.view',
  'products.create',
  // Configuración
  'settings.view',
  'settings.edit',
  'settings.formats',
  // Usuarios
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  // Empresas
  'companies.view',
  'companies.create',
  'companies.edit',
  // Reportes
  'reports.view',
  // Eventos y Rentabilidad
  'events.view',
  'events.create',
  'events.edit',
  'events.delete',
  'incomes.view',
  'incomes.create',
  'incomes.edit',
  'incomes.delete',
  // Widgets Dashboard
  'widget.inventory.view',
  'widget.low_stock.view',
  'widget.sales.view',
  'widget.finance.view',
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
    try {
      // Guardia temprana: si no hay sub (ID Supabase), el token está malformado
      if (!payload?.sub) {
        console.error('❌ AUTH VALIDATE: payload.sub undefined. Token inválido.');
        return null; // Passport lo convierte en 401, no 500
      }

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
      // Usamos Array.isArray() para evitar crash si el campo tiene un tipo inesperado
      const rawPerms = user.role?.permissions;
      const rolePermissions: string[] = Array.isArray(rawPerms) ? (rawPerms as string[]) : [];

      // Determinar efectivamente el rol:
      // - Si tiene rol personalizado con permisos → usarlos
      // - Si roleLegacy === 'ADMIN' → permisos implícitos completos
      // - Si roleLegacy es null/undefined pero tiene companyId → es usuario del sistema, tratar como ADMIN
      // - Caso USER sin rol personalizado → sin acceso adicional
      const isRegistered = !!user.companyId;
      const isAdmin = user.roleLegacy === 'ADMIN' || (!user.roleLegacy && isRegistered);

      const permissions: string[] =
        rolePermissions.length > 0
          ? rolePermissions
          : isAdmin
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
        isAdmin,
        permissions,                // permisos efectivos usados por PermissionsGuard
      };
    } catch (err) {
      // Un crash aquí generaba el 500 opaco. Ahora lo logeamos y retornamos null → 401
      console.error('❌ AUTH VALIDATE CRASH:', err?.message ?? err);
      return null;
    }
  }
}
