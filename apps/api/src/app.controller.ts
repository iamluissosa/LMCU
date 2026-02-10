import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Controller()
export class AppController {
  
  @Get('public')
  getPublic() {
    return { message: 'Esto lo puede ver todo el mundo 🌍' };
  }

  @UseGuards(JwtAuthGuard) // <--- Aquí está el candado
  @Get('profile')
  getProfile(@Request() req: any) {
    // Si llegamos aquí, el token es válido.
    // NestJS inyectó el usuario en req.user (gracias a supabase.strategy.ts)
    return { 
      message: 'Zona VIP 🔒', 
      user: req.user 
    };
  }
}
