import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXPERT] as const;

export class CreateUserDto {
  @ApiProperty() @IsString() @IsNotEmpty() lastName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() login?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(8) password?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role!: (typeof STAFF_ROLES)[number];
  @ApiPropertyOptional() @IsOptional() @IsNumberString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumberString() positionId?: string;
}
