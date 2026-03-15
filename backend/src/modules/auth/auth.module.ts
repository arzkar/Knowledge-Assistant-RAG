import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../database/entities/user.entity';
import { AuthController } from './auth.controller';
import { BetterAuthGuard } from './better-auth.guard';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [
    BetterAuthGuard,
    {
      provide: 'BETTER_AUTH',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return betterAuth({
          database: new Pool({
            connectionString: `postgres://${configService.get('DATABASE_USER')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}:${configService.get('DATABASE_PORT')}/${configService.get('DATABASE_NAME')}`,
          }),
          emailAndPassword: {
            enabled: true,
          },
          secret: configService.get('BETTER_AUTH_SECRET'),
          baseURL: configService.get('BETTER_AUTH_URL'),
          trustedOrigins: ['http://localhost:3000'],
        });
      },
    },
  ],
  controllers: [AuthController],
  exports: [BetterAuthGuard, 'BETTER_AUTH'],
})
export class AuthModule {}
