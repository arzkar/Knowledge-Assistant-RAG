import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Session, Account, Verification } from './entities/user.entity';
import { Document } from './entities/document.entity';
import { Chunk } from './entities/chunk.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'postgres'),
        password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: configService.get<string>('DATABASE_NAME', 'rag_db'),
        entities: [User, Session, Account, Verification, Document, Chunk],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Session,
      Account,
      Verification,
      Document,
      Chunk,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
