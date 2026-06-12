import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: "Barcha bo'limlar" })
  findAll() {
    return this.svc.findAllDepartments();
  }

  @Post()
  @ApiOperation({ summary: "Bo'lim yaratish" })
  create(@Body() dto: CreateDepartmentDto) {
    return this.svc.createDepartment(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Bo'limni tahrirlash" })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.svc.updateDepartment(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Bo'limni o'chirish" })
  remove(@Param('id') id: string) {
    return this.svc.deleteDepartment(id);
  }
}

@ApiTags('positions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('positions')
export class PositionsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: "Barcha lavozimlar (ixtiyoriy: bo'lim bo'yicha)" })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.svc.findAllPositions(departmentId);
  }

  @Post()
  @ApiOperation({ summary: 'Lavozim yaratish' })
  create(@Body() dto: CreatePositionDto) {
    return this.svc.createPosition(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Lavozimni tahrirlash' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.svc.updatePosition(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Lavozimni o'chirish" })
  remove(@Param('id') id: string) {
    return this.svc.deletePosition(id);
  }
}
