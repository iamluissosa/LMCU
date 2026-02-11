import { Controller, Get, UseGuards, Request } from '@nestjs/common'; // Agregamos Request
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Request() req) {
    // req.user viene del Token JWT y contiene los datos del usuario logueado
    const user = req.user;
    return this.dashboardService.getStats(user.companyId);
  }
}