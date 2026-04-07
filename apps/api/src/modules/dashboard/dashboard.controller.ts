import { Controller, Get, UseGuards, Request } from '@nestjs/common'; // Agregamos Request
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('dashboard.view')
  getStats(@Request() req) {
    const user = req.user;
    // Pass companyId and user permissions to selectively calculate heavy metrics
    return this.dashboardService.getStats(user.companyId, user.permissions || []);
  }
}
