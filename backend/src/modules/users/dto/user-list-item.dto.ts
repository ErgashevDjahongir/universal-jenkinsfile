import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { User } from '../entities/user.entity';

/** Foydalanuvchi ro'yxati uchun xavfsiz ko'rinish — password_hash hech qachon chiqmaydi. */
export class UserListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty({ nullable: true }) login!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;

  static fromEntity(user: User): UserListItemDto {
    return {
      id: user.id,
      lastName: user.lastName,
      firstName: user.firstName,
      login: user.login,
      role: user.role,
      status: user.status,
    };
  }
}
