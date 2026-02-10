import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 1. Extraer el token del Header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. No ignorar la expiración (si venció, rechazar)
      ignoreExpiration: false,
      // 3. Usar el secreto para validar la firma
      secretOrKey:'RKB5Y2sroARzTpFnYJl1CCwADYnTcBLmj/EShBueeuGDUs3OVNuhbwzQgdOSaoAxd1KYuS0v2qDNArUyl7qruw==',
    });
  }

  // Si el token es válido, NestJS ejecuta esto automáticamente
  async validate(payload: any) {
    // payload es lo que hay dentro del token (el ID de usuario, email, etc.)
    return { 
      userId: payload.sub, 
      email: payload.email,
      // Aquí Supabase suele mandar la data del usuario bajo 'app_metadata' o 'user_metadata'
      roles: payload.app_metadata?.roles || [],
    };
  }
}