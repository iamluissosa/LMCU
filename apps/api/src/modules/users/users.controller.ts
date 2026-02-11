import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@UseGuards(AuthGuard('jwt')) // 🔒 Seguridad
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Request() req, @Body() createUserDto: any) {
    // Forzamos que el nuevo usuario pertenezca a la misma empresa del creador
    // (A menos que queramos permitir que cree para otros, pero por seguridad: misma empresa)
    const user = req.user;
    if (user.companyId) {
        createUserDto.companyId = user.companyId;
    }
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Request() req) {
    // 🕵️‍♂️ AQUÍ ESTÁ EL FILTRO
    // Extraemos el ID de la empresa del usuario que hace la petición
    const user = req.user;
    return this.usersService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}