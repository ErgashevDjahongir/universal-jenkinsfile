import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXPERT] as const;

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() login?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(8) password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: (typeof STAFF_ROLES)[number];
  @ApiPropertyOptional() @IsOptional() @IsNumberString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() positionId?: string;
}
