import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Foydalanuvchilar ro'yxati (filtr: rol, holat, bo'lim)" })
  @ApiResponse({ status: 200 })
  async findAll(@Query() filter: UserFilterDto): Promise<UserListItemDto[]> {
    const users = await this.users.findAll(filter);
    return users.map((u) => UserListItemDto.fromEntity(u));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Yangi foydalanuvchi yaratish' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateUserDto, @CurrentUser() me: AuthUser): Promise<UserListItemDto> {
    const user = await this.users.create(dto, me.id);
    return UserListItemDto.fromEntity(user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Foydalanuvchini tahrirlash' })
  @ApiResponse({ status: 200 })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserListItemDto> {
    const user = await this.users.update(id, dto);
    return UserListItemDto.fromEntity(user);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Foydalanuvchini bloklash' })
  @ApiResponse({ status: 200 })
  async block(@Param('id') id: string): Promise<UserListItemDto> {
    const user = await this.users.block(id);
    return UserListItemDto.fromEntity(user);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Foydalanuvchini faollashtirish' })
  @ApiResponse({ status: 200 })
  async activate(@Param('id') id: string): Promise<UserListItemDto> {
    const user = await this.users.activate(id);
    return UserListItemDto.fromEntity(user);
  }
}
