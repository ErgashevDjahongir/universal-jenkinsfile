import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { SetExpertSubjectsDto } from './dto/set-expert-subjects.dto';
import { ExpertSubject } from './entities/expert-subject.entity';
import { ExpertSubjectsService } from './expert-subjects.service';

@ApiTags('experts')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertSubjects: ExpertSubjectsService) {}

  @Put(':userId/subjects')
  @ApiOperation({ summary: 'Ekspertga fanlarni biriktirish (to‘liq almashtiradi)' })
  set(
    @Param('userId') userId: string,
    @Body() dto: SetExpertSubjectsDto,
  ): Promise<ExpertSubject[]> {
    return this.expertSubjects.setForExpert(userId, dto.subjectIds);
  }

  @Get(':userId/subjects')
  @ApiOperation({ summary: 'Ekspertning fanlari' })
  list(@Param('userId') userId: string): Promise<ExpertSubject[]> {
    return this.expertSubjects.listForExpert(userId);
  }
}
