import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token (login/refresh javobidan)' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
