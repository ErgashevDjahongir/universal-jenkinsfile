import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AccessCode } from './entities/access-code.entity';
import { AssignmentTarget } from './entities/assignment-target.entity';
import { GroupMember } from './entities/group-member.entity';
import { TestAssignment } from './entities/test-assignment.entity';
import { UserGroup } from './entities/user-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestAssignment,
      AssignmentTarget,
      AccessCode,
      UserGroup,
      GroupMember,
    ]),
    TemplatesModule,
    UsersModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
