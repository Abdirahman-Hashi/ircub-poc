import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SodModule } from '../sod/sod.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, SodModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
