import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Foydalanuvchilar ro‘yxati (faqat admin/super-admin)' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchilar ro‘yxati' })
  @ApiResponse({ status: 403, description: 'Rolga ruxsat yo‘q' })
  async findAll(): Promise<UserListItemDto[]> {
    const users = await this.users.findAll();
    return users.map((user) => UserListItemDto.fromEntity(user));
  }
}
