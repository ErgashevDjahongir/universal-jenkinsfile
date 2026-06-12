import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsController, PositionsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Department, Position])],
  controllers: [UsersController, DepartmentsController, PositionsController],
  providers: [UsersService, DepartmentsService],
  exports: [UsersService],
})
export class UsersModule {}
