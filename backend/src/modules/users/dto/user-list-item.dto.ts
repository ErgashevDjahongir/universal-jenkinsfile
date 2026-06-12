import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { User } from '../entities/user.entity';

export class UserListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty({ nullable: true }) middleName!: string | null;
  @ApiProperty({ nullable: true }) login!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ nullable: true }) departmentId!: string | null;
  @ApiProperty({ nullable: true }) positionId!: string | null;
  @ApiProperty() isCandidate!: boolean;
  @ApiProperty() createdAt!: Date;

  static fromEntity(user: User): UserListItemDto {
    return {
      id: user.id,
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName,
      login: user.login,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
      positionId: user.positionId,
      isCandidate: user.isCandidate,
      createdAt: user.createdAt,
    };
  }
}
