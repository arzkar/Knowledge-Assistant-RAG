import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { AuthController } from './auth.controller';
import { BetterAuthGuard } from './better-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [BetterAuthGuard],
  controllers: [AuthController],
  exports: [BetterAuthGuard],
})
export class AuthModule {}
